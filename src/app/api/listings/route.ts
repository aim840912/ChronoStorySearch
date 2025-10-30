import { NextRequest } from 'next/server'
import { User } from '@/lib/middleware/api-middleware'
import { withAuthAndBotDetection } from '@/lib/bot-detection/api-middleware'
import { requireTradingEnabled } from '@/lib/middleware/trading-middleware'
import { success, created } from '@/lib/api-response'
import { ValidationError, DatabaseError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import { DEFAULT_RATE_LIMITS } from '@/lib/bot-detection/constants'
import { validateAndCalculateStats } from '@/lib/validation/item-stats'
import type { ItemStats } from '@/types/item-stats'
import { checkAccountAge, checkServerMembershipWithCache } from '@/lib/services/discord-verification'
import { getSystemSettings } from '@/lib/config/system-config'

// Discord 驗證配置
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID // Discord 伺服器 ID（Guild ID）
const MIN_ACCOUNT_AGE_DAYS = 365 // Discord 帳號必須滿 1 年

/**
 * GET /api/listings - 查詢我的刊登
 *
 * 功能：
 * - 🔒 需要認證
 * - 🛡️ Bot Detection：User-Agent 過濾 + Rate Limiting（100次/小時，認證用戶較寬鬆）
 * - 查詢當前用戶的所有刊登
 * - 支援篩選：status, trade_type
 * - RLS 自動過濾 user_id
 *
 * 認證要求：🔒 認證 + Bot Detection
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handleGET(request: NextRequest, user: User) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'active'
  const trade_type = searchParams.get('trade_type')

  apiLogger.debug('查詢我的刊登', {
    user_id: user.id,
    status,
    trade_type
  })

  let query = supabaseAdmin
    .from('listings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // 只有在不查詢 cancelled 狀態時，才過濾掉已刪除的刊登
  if (status !== 'cancelled') {
    query = query.is('deleted_at', null)
  }

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  if (trade_type && trade_type !== 'all') {
    query = query.eq('trade_type', trade_type)
  }

  const { data: listings, error } = await query

  if (error) {
    apiLogger.error('查詢刊登失敗', { error, user_id: user.id })
    throw new ValidationError('查詢刊登失敗')
  }

  apiLogger.info('查詢刊登成功', {
    user_id: user.id,
    count: listings?.length || 0
  })

  return success(listings || [], '查詢成功')
}

/**
 * POST /api/listings - 建立刊登
 *
 * 功能：
 * - 🔒 需要認證 + Discord 驗證
 * - 🛡️ Bot Detection：User-Agent 過濾 + Rate Limiting（100次/小時，認證用戶較寬鬆）
 * - 驗證 Discord 帳號年齡（必須滿 1 年）
 * - 驗證 Discord 伺服器成員資格
 * - 驗證 item_id, trade_type, price/wanted_item_id
 * - 檢查配額限制（每用戶最多 5 個 active listings）
 * - 插入 listings 表
 * - 返回創建的刊登
 *
 * 認證要求：🔒 認證 + Bot Detection + Discord 驗證
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handlePOST(request: NextRequest, user: User) {
  const data = await request.json()

  // 從系統設定讀取最大刊登數量
  const settings = await getSystemSettings()
  const maxActiveListings = settings.max_active_listings_per_user

  apiLogger.debug('建立刊登請求', {
    user_id: user.id,
    trade_type: data.trade_type,
    item_id: data.item_id,
    max_active_listings: maxActiveListings
  })

  // 1. 驗證必填欄位
  const {
    trade_type,
    item_id,
    quantity = 1,
    price,
    wanted_items,  // 新：想要物品陣列
    ingame_name,   // 新：遊戲內角色名（選填）
    webhook_url,
    item_stats
  } = data

  if (!trade_type || !['sell', 'buy', 'exchange'].includes(trade_type)) {
    throw new ValidationError('trade_type 必須是 sell, buy 或 exchange')
  }

  if (!item_id || typeof item_id !== 'number') {
    throw new ValidationError('item_id 必須是數字')
  }

  // 驗證 Discord 聯絡方式（必填，來自 OAuth）
  const discord_contact = user.discord_username || user.discord_id
  if (!discord_contact) {
    apiLogger.error('無法取得 Discord 聯絡方式', { user_id: user.id })
    throw new ValidationError('無法取得 Discord 聯絡方式，請重新登入')
  }

  // 驗證遊戲內角色名（選填）
  if (ingame_name !== undefined && ingame_name !== null) {
    if (typeof ingame_name !== 'string') {
      throw new ValidationError('ingame_name 必須是字串')
    }
    // 允許空字串（使用者清空欄位）
  }

  // 2. 驗證交易類型特定邏輯
  if (trade_type === 'exchange') {
    // 交換類型必須提供至少一個想要物品
    if (!wanted_items || !Array.isArray(wanted_items) || wanted_items.length === 0) {
      throw new ValidationError('交換類型必須提供至少一個想要物品')
    }

    // 限制最多 3 個想要物品
    if (wanted_items.length > 3) {
      throw new ValidationError('最多只能選擇 3 個想要物品')
    }

    // 驗證每個想要物品的結構
    for (const wantedItem of wanted_items) {
      if (!wantedItem.item_id || typeof wantedItem.item_id !== 'number') {
        throw new ValidationError('想要物品的 item_id 必須是數字')
      }
      if (!wantedItem.quantity || typeof wantedItem.quantity !== 'number' || wantedItem.quantity < 1) {
        throw new ValidationError('想要物品的數量必須是大於 0 的數字')
      }
    }

    apiLogger.debug('交換刊登驗證通過', {
      user_id: user.id,
      wanted_items_count: wanted_items.length
    })
  } else {
    // 買賣類型必須提供 price
    if (!price || typeof price !== 'number' || price <= 0) {
      throw new ValidationError('買賣類型必須提供正數 price')
    }
  }

  // 3. 驗證物品屬性（如果提供）
  let validatedStats: ItemStats | null = null

  if (item_stats) {
    const validationResult = validateAndCalculateStats(item_stats)

    if (!validationResult.success) {
      apiLogger.warn('物品屬性驗證失敗', {
        user_id: user.id,
        error: validationResult.error
      })
      throw new ValidationError(`物品屬性驗證失敗：${validationResult.error}`)
    }

    validatedStats = validationResult.data!.stats

    apiLogger.debug('物品屬性驗證成功', {
      user_id: user.id
    })
  }

  // 4. Discord 帳號年齡驗證（必須滿 1 年）
  const accountAgeResult = await checkAccountAge(user.id, MIN_ACCOUNT_AGE_DAYS)

  if (!accountAgeResult.valid) {
    apiLogger.warn('Discord 帳號年齡不足', {
      user_id: user.id,
      account_age_days: accountAgeResult.accountAge,
      required_days: MIN_ACCOUNT_AGE_DAYS
    })
    throw new ValidationError(
      `您的 Discord 帳號年齡不足（目前 ${accountAgeResult.accountAge} 天，需要 ${MIN_ACCOUNT_AGE_DAYS} 天）`
    )
  }

  apiLogger.debug('Discord 帳號年齡驗證通過', {
    user_id: user.id,
    account_age_days: accountAgeResult.accountAge
  })

  // 5. Discord 伺服器成員驗證
  if (!DISCORD_GUILD_ID) {
    apiLogger.error('環境變數 DISCORD_GUILD_ID 未設定')
    throw new ValidationError('系統配置錯誤，請聯繫管理員')
  }

  const membershipResult = await checkServerMembershipWithCache(
    user.id,
    user.access_token,
    DISCORD_GUILD_ID
  )

  if (!membershipResult.isMember) {
    apiLogger.warn('使用者不是 Discord 伺服器成員', {
      user_id: user.id,
      guild_id: DISCORD_GUILD_ID
    })
    throw new ValidationError('您必須加入指定的 Discord 伺服器才能建立刊登')
  }

  apiLogger.debug('Discord 伺服器成員驗證通過', {
    user_id: user.id,
    guild_id: DISCORD_GUILD_ID
  })

  // 6. 使用資料庫交易函數安全地建立刊登（防止競態條件）
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('create_listing_safe', {
    p_user_id: user.id,
    p_item_id: item_id,
    p_trade_type: trade_type,
    p_price: trade_type !== 'exchange' ? price : null,
    p_quantity: quantity || 1,
    p_ingame_name: ingame_name?.trim() || null,
    p_seller_discord_id: user.discord_id,
    p_webhook_url: webhook_url || null,
    p_item_stats: validatedStats ? JSON.stringify(validatedStats) : null,
    p_wanted_items: trade_type === 'exchange' && wanted_items ? JSON.stringify(wanted_items) : null,
    p_max_listings: maxActiveListings
  })

  if (rpcError) {
    // 檢查錯誤類型並提供友善訊息
    if (rpcError.message?.includes('已達到刊登配額上限')) {
      apiLogger.warn('刊登配額已滿', {
        user_id: user.id,
        error: rpcError.message
      })
      throw new ValidationError(rpcError.message)
    }

    if (rpcError.message?.includes('已經刊登此物品')) {
      apiLogger.warn('用戶嘗試重複刊登相同物品', {
        user_id: user.id,
        item_id: item_id
      })
      throw new ValidationError(rpcError.message)
    }

    // 其他資料庫錯誤
    apiLogger.error('建立刊登失敗（RPC 錯誤）', {
      error: rpcError,
      user_id: user.id,
      item_id: item_id
    })
    throw new DatabaseError('建立刊登失敗', rpcError as unknown as Record<string, unknown>)
  }

  // RPC 函數返回結構化結果
  const listingId = (rpcResult as { listing_id: number }).listing_id
  const activeListingsCount = (rpcResult as { active_listings_count: number }).active_listings_count

  // 查詢完整的刊登資料以返回給前端
  const { data: listing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single()

  if (fetchError || !listing) {
    apiLogger.error('查詢新建刊登失敗', {
      error: fetchError,
      listing_id: listingId
    })
    throw new DatabaseError('查詢新建刊登失敗', fetchError as unknown as Record<string, unknown>)
  }

  apiLogger.info('刊登建立成功（使用安全函數）', {
    user_id: user.id,
    listing_id: listingId,
    trade_type: listing.trade_type,
    active_listings_count: activeListingsCount,
    has_wanted_items: trade_type === 'exchange'
  })

  return created(listing, '刊登建立成功')
}

// 🔒 需要認證 + 🛡️ Bot Detection
// 使用 requireTradingEnabled 包裝，檢查交易系統是否啟用
// 使用 withAuthAndBotDetection 整合認證、錯誤處理和 Bot 防護
export const GET = requireTradingEnabled(
  withAuthAndBotDetection(handleGET, {
    module: 'ListingAPI',
    enableAuditLog: false,
    botDetection: {
      enableRateLimit: true,
      enableBehaviorDetection: true,
      rateLimit: DEFAULT_RATE_LIMITS.AUTHENTICATED, // 100次/小時（認證用戶寬鬆限制）
    },
  })
)

export const POST = requireTradingEnabled(
  withAuthAndBotDetection(handlePOST, {
    module: 'ListingAPI',
    enableAuditLog: true,
    botDetection: {
      enableRateLimit: true,
      enableBehaviorDetection: true,
      rateLimit: DEFAULT_RATE_LIMITS.AUTHENTICATED, // 100次/小時（認證用戶寬鬆限制）
    },
  })
)
