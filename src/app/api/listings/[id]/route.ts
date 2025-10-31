import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { requireTradingEnabled } from '@/lib/middleware/trading-middleware'
import { success } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import { validateItemStats } from '@/lib/validation/item-stats'
import type { ItemStats } from '@/types/item-stats'
import { LISTING_CONSTRAINTS } from '@/lib/config/system-config'
import { encryptWebhookUrl, decryptWebhookUrl } from '@/lib/crypto/webhook-encryption'
import { validateContactInfo, validateInGameName } from '@/lib/validation/text-validation'
import { invalidateMarketCache } from '@/lib/cache/market-cache'

/**
 * GET /api/listings/[id] - 查詢單一刊登詳情
 *
 * 功能：
 * - 查詢刊登完整資訊
 * - JOIN users 和 discord_profiles 獲取賣家資訊
 * - 返回扁平化的詳情資料
 *
 * 認證要求：🔒 需要認證
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handleGET(
  _request: NextRequest,
  user: User,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  apiLogger.debug('查詢刊登詳情', {
    user_id: user.id,
    listing_id: id
  })

  // 查詢刊登詳情（JOIN users、discord_profiles 和 listing_wanted_items，使用嵌套語法）
  const { data: listing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select(`
      *,
      users!inner (
        discord_username,
        discord_profiles (
          reputation_score
        )
      ),
      listing_wanted_items (
        item_id,
        quantity
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !listing) {
    apiLogger.warn('刊登不存在', { listing_id: id, error: fetchError })
    throw new NotFoundError('刊登不存在')
  }

  // 解密 webhook_url（僅擁有者可見）
  const isOwner = listing.user_id === user.id
  let decryptedWebhookUrl: string | null = null

  if (isOwner && listing.webhook_url) {
    try {
      decryptedWebhookUrl = decryptWebhookUrl(listing.webhook_url)
    } catch (error) {
      apiLogger.error('解密 Webhook URL 失敗', {
        listing_id: id,
        error
      })
      // 解密失敗時不影響主流程，只是不顯示 webhook_url
    }
  }

  // 扁平化回應格式
  const formattedListing = {
    id: listing.id,
    user_id: listing.user_id,
    trade_type: listing.trade_type,
    item_id: listing.item_id,
    quantity: listing.quantity,
    price: listing.price,
    // 舊欄位（向後相容，deprecated）
    wanted_item_id: listing.wanted_item_id,
    wanted_quantity: listing.wanted_quantity,
    // 新欄位：想要物品陣列（從關聯表取得）
    wanted_items: listing.listing_wanted_items?.map((item: { item_id: number; quantity: number }) => ({
      item_id: item.item_id,
      quantity: item.quantity
    })) || [],
    contact_method: listing.contact_method,
    seller_discord_id: listing.seller_discord_id || null,
    // 注意：contact_info 不在這裡返回，需要呼叫 /contact API
    // webhook_url 只有擁有者可見，且已解密
    webhook_url: isOwner ? decryptedWebhookUrl : null,
    status: listing.status,
    view_count: listing.view_count,
    interest_count: listing.interest_count,
    created_at: listing.created_at,
    updated_at: listing.updated_at,
    // 物品屬性（解析 JSON 字串）
    item_stats: listing.item_stats
      ? (typeof listing.item_stats === 'string'
          ? JSON.parse(listing.item_stats)
          : listing.item_stats)
      : null,
    stats_grade: listing.stats_grade || null,
    stats_score: listing.stats_score || null,
    seller: {
      discord_username: listing.users?.discord_username || 'Unknown',
      reputation_score: listing.users?.discord_profiles?.reputation_score ?? 0
    },
    is_own_listing: isOwner
  }

  apiLogger.info('查詢刊登詳情成功', {
    user_id: user.id,
    listing_id: id
  })

  return success(formattedListing, '查詢成功')
}

/**
 * PATCH /api/listings/[id] - 更新刊登
 *
 * 功能：
 * - 驗證刊登所有權（user_id = current_user）
 * - 可更新欄位：price, quantity, wanted_item_id, wanted_quantity, contact_info, status
 * - 不可更新：item_id, trade_type, user_id
 *
 * 認證要求：🔒 需要認證
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handlePATCH(
  request: NextRequest,
  user: User,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const data = await request.json()

  apiLogger.debug('更新刊登請求', {
    user_id: user.id,
    listing_id: id,
    updates: Object.keys(data)
  })

  // 1. 驗證刊登存在且屬於當前用戶
  const { data: existingListing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !existingListing) {
    apiLogger.warn('刊登不存在或無權限', {
      user_id: user.id,
      listing_id: id,
      error: fetchError
    })
    throw new NotFoundError('刊登不存在或您無權限修改')
  }

  // 2. 驗證可更新欄位
  const allowedFields = [
    'price',
    'quantity',
    'wanted_item_id',
    'wanted_quantity',
    'contact_method',
    'contact_info',
    'webhook_url',
    'status',
    'item_stats'
  ]

  const updates: Record<string, unknown> = {}

  for (const key of Object.keys(data)) {
    if (!allowedFields.includes(key)) {
      throw new ValidationError(`欄位 ${key} 不可更新`)
    }
    updates[key] = data[key]
  }

  // 2.1 驗證並計算物品屬性（如果提供）
  if (updates.item_stats !== undefined) {
    if (updates.item_stats === null) {
      // 允許清除物品屬性
      updates.stats_grade = null
      updates.stats_score = null
    } else {
      // 驗證並計算新的屬性
      const validationResult = validateItemStats(updates.item_stats as ItemStats)

      if (!validationResult.success) {
        apiLogger.warn('物品屬性驗證失敗', {
          user_id: user.id,
          listing_id: id,
          error: validationResult.error
        })
        throw new ValidationError(`物品屬性驗證失敗：${validationResult.error}`)
      }

      updates.item_stats = validationResult.data!

      apiLogger.debug('物品屬性更新驗證成功', {
        user_id: user.id,
        listing_id: id
      })
    }
  }

  // 3. 驗證業務邏輯
  if (updates.status && !['active', 'sold', 'cancelled'].includes(updates.status as string)) {
    throw new ValidationError('status 必須是 active, sold 或 cancelled')
  }

  if (updates.price !== undefined) {
    if (typeof updates.price !== 'number') {
      throw new ValidationError('價格必須為數字')
    }

    if (!Number.isFinite(updates.price)) {
      throw new ValidationError('價格必須為有限數值')
    }

    if (updates.price <= 0) {
      throw new ValidationError(
        `價格必須為正數，最小值為 ${LISTING_CONSTRAINTS.MIN_PRICE.toLocaleString()} 楓幣`
      )
    }

    if (updates.price > LISTING_CONSTRAINTS.MAX_PRICE) {
      throw new ValidationError(
        `價格不得超過 ${LISTING_CONSTRAINTS.MAX_PRICE.toLocaleString()} 楓幣`
      )
    }

    if (!Number.isInteger(updates.price)) {
      throw new ValidationError('價格必須為整數楓幣')
    }
  }

  // 驗證 contact_info（如果有更新）
  if (updates.contact_info !== undefined) {
    if (typeof updates.contact_info === 'string') {
      updates.contact_info = validateContactInfo(updates.contact_info)
    }
  }

  // 驗證 ingame_name（如果有更新）
  if (updates.ingame_name !== undefined) {
    if (updates.ingame_name === null || updates.ingame_name === '') {
      updates.ingame_name = null
    } else if (typeof updates.ingame_name === 'string') {
      updates.ingame_name = validateInGameName(updates.ingame_name)
    }
  }

  // 加密 webhook_url（如果有更新）
  if (updates.webhook_url !== undefined) {
    if (updates.webhook_url === null || updates.webhook_url === '') {
      // 允許清空 webhook_url
      updates.webhook_url = null
    } else if (typeof updates.webhook_url === 'string') {
      // 加密新的 webhook_url
      updates.webhook_url = encryptWebhookUrl(updates.webhook_url)
    }
  }

  // 4. 更新刊登
  updates.updated_at = new Date().toISOString()

  const { data: updatedListing, error: updateError } = await supabaseAdmin
    .from('listings')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateError) {
    apiLogger.error('更新刊登失敗', {
      error: updateError,
      user_id: user.id,
      listing_id: id
    })
    throw new ValidationError('更新刊登失敗')
  }

  apiLogger.info('刊登更新成功', {
    user_id: user.id,
    listing_id: id,
    updated_fields: Object.keys(updates)
  })

  // 如果更新了會影響市場列表顯示的欄位，清除快取
  const marketAffectingFields = ['status', 'price', 'item_stats', 'quantity']
  const shouldInvalidateCache = Object.keys(updates).some(key =>
    marketAffectingFields.includes(key)
  )

  if (shouldInvalidateCache) {
    await invalidateMarketCache()
    apiLogger.debug('Market cache invalidated after listing update', {
      listing_id: id,
      affected_fields: Object.keys(updates).filter(key => marketAffectingFields.includes(key))
    })
  }

  return success(updatedListing, '刊登更新成功')
}

/**
 * DELETE /api/listings/[id] - 刪除刊登
 *
 * 功能：
 * - 驗證刊登所有權（user_id = current_user）
 * - 軟刪除：設置 deleted_at, status = 'cancelled'
 *
 * 認證要求：🔒 需要認證
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handleDELETE(
  _request: NextRequest,
  user: User,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  apiLogger.debug('刪除刊登請求', {
    user_id: user.id,
    listing_id: id
  })

  // 1. 驗證刊登存在且屬於當前用戶
  const { data: existingListing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !existingListing) {
    apiLogger.warn('刊登不存在或無權限', {
      user_id: user.id,
      listing_id: id,
      error: fetchError
    })
    throw new NotFoundError('刊登不存在或您無權限刪除')
  }

  // 2. 軟刪除：設置 deleted_at 和 status
  const now = new Date().toISOString()
  const { data: deletedListing, error: deleteError } = await supabaseAdmin
    .from('listings')
    .update({
      deleted_at: now,
      status: 'cancelled',
      updated_at: now
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (deleteError) {
    apiLogger.error('刪除刊登失敗', {
      error: deleteError,
      user_id: user.id,
      listing_id: id
    })
    throw new ValidationError('刪除刊登失敗')
  }

  // 3. 更新用戶配額計數器（遞減 1）
  // 先查詢當前配額
  const { data: quotaData } = await supabaseAdmin
    .from('user_quotas')
    .select('active_listings_count')
    .eq('user_id', user.id)
    .single()

  if (quotaData) {
    // 計算新的配額（確保不會變為負數）
    const newCount = Math.max(quotaData.active_listings_count - 1, 0)

    // 更新配額
    const { error: quotaError } = await supabaseAdmin
      .from('user_quotas')
      .update({
        active_listings_count: newCount,
        updated_at: now
      })
      .eq('user_id', user.id)

    if (quotaError) {
      apiLogger.error('更新配額計數器失敗', {
        error: quotaError,
        user_id: user.id,
        listing_id: id
      })
      // 不拋出錯誤，避免影響刪除流程（配額可以稍後修復）
    }
  }

  apiLogger.info('刊登刪除成功', {
    user_id: user.id,
    listing_id: id
  })

  // 清除市場快取，確保刪除的刊登不再顯示
  await invalidateMarketCache()
  apiLogger.debug('Market cache invalidated after listing deletion', {
    listing_id: id
  })

  return success(deletedListing, '刊登刪除成功')
}

// 🔒 需要認證：使用 requireTradingEnabled + withAuthAndError
// 注意：withAuthAndError 需要適配 context 參數
export const GET = requireTradingEnabled(
  withAuthAndError(
    async (request: NextRequest, user: User, context: { params: Promise<{ id: string }> }) =>
      handleGET(request, user, context),
    {
      module: 'ListingAPI',
      enableAuditLog: false
    }
  )
)

export const PATCH = requireTradingEnabled(
  withAuthAndError(
    async (request: NextRequest, user: User, context: { params: Promise<{ id: string }> }) =>
      handlePATCH(request, user, context),
    {
      module: 'ListingAPI',
      enableAuditLog: true
    }
  )
)

export const DELETE = requireTradingEnabled(
  withAuthAndError(
    async (request: NextRequest, user: User, context: { params: Promise<{ id: string }> }) =>
      handleDELETE(request, user, context),
    {
      module: 'ListingAPI',
      enableAuditLog: true
    }
  )
)
