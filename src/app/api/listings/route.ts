import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { success, created } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import { validateAndCalculateStats } from '@/lib/validation/item-stats'
import type { ItemStats } from '@/types/item-stats'

/**
 * GET /api/listings - 查詢我的刊登
 *
 * 功能：
 * - 查詢當前用戶的所有刊登
 * - 支援篩選：status, trade_type
 * - RLS 自動過濾 user_id
 *
 * 認證要求：🔒 需要認證
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
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

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
 * - 驗證 item_id, trade_type, price/wanted_item_id
 * - 檢查配額限制（每用戶最多 50 個 active listings）
 * - 插入 listings 表
 * - 返回創建的刊登
 *
 * 認證要求：🔒 需要認證
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handlePOST(request: NextRequest, user: User) {
  const data = await request.json()

  apiLogger.debug('建立刊登請求', {
    user_id: user.id,
    trade_type: data.trade_type,
    item_id: data.item_id
  })

  // 1. 驗證必填欄位
  const {
    trade_type,
    item_id,
    quantity = 1,
    price,
    wanted_item_id,
    wanted_quantity,
    contact_method,
    contact_info,
    webhook_url,
    item_stats
  } = data

  if (!trade_type || !['sell', 'buy', 'exchange'].includes(trade_type)) {
    throw new ValidationError('trade_type 必須是 sell, buy 或 exchange')
  }

  if (!item_id || typeof item_id !== 'number') {
    throw new ValidationError('item_id 必須是數字')
  }

  if (!contact_method || !['discord', 'ingame'].includes(contact_method)) {
    throw new ValidationError('contact_method 必須是 discord 或 ingame')
  }

  if (!contact_info || typeof contact_info !== 'string' || contact_info.trim() === '') {
    throw new ValidationError('contact_info 不能為空')
  }

  // 2. 驗證交易類型特定邏輯
  if (trade_type === 'exchange') {
    // 交換類型必須提供 wanted_item_id
    if (!wanted_item_id || typeof wanted_item_id !== 'number') {
      throw new ValidationError('交換類型必須提供 wanted_item_id')
    }
  } else {
    // 買賣類型必須提供 price
    if (!price || typeof price !== 'number' || price <= 0) {
      throw new ValidationError('買賣類型必須提供正數 price')
    }
  }

  // 3. 驗證物品屬性（如果提供）
  let validatedStats: ItemStats | null = null
  let statsGrade: string | null = null
  let statsScore: number | null = null

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
    statsGrade = validationResult.data!.grade
    statsScore = validationResult.data!.score

    apiLogger.debug('物品屬性驗證成功', {
      user_id: user.id,
      grade: statsGrade,
      score: statsScore
    })
  }

  // 4. 檢查配額限制（每用戶最多 50 個 active listings）
  const { count: activeCount, error: countError } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'active')
    .is('deleted_at', null)

  if (countError) {
    apiLogger.error('檢查配額失敗', { error: countError, user_id: user.id })
    throw new ValidationError('檢查配額失敗')
  }

  if (activeCount !== null && activeCount >= 50) {
    apiLogger.warn('刊登配額已滿', {
      user_id: user.id,
      active_count: activeCount
    })
    throw new ValidationError('您已達到刊登配額上限（50 個），請先刪除或完成現有刊登')
  }

  // 5. 插入刊登資料
  const listingData = {
    user_id: user.id,
    trade_type,
    item_id,
    quantity: quantity || 1,
    price: trade_type !== 'exchange' ? price : null,
    wanted_item_id: trade_type === 'exchange' ? wanted_item_id : null,
    wanted_quantity: trade_type === 'exchange' ? (wanted_quantity || 1) : null,
    contact_method,
    contact_info: contact_info.trim(),
    webhook_url: webhook_url || null,
    status: 'active',
    view_count: 0,
    interest_count: 0,
    // 物品屬性（如果提供）
    item_stats: validatedStats,
    stats_grade: statsGrade,
    stats_score: statsScore
  }

  const { data: listing, error: insertError } = await supabaseAdmin
    .from('listings')
    .insert(listingData)
    .select()
    .single()

  if (insertError) {
    apiLogger.error('建立刊登失敗', {
      error: insertError,
      user_id: user.id,
      data: listingData
    })
    throw new ValidationError('建立刊登失敗')
  }

  apiLogger.info('刊登建立成功', {
    user_id: user.id,
    listing_id: listing.id,
    trade_type: listing.trade_type
  })

  return created(listing, '刊登建立成功')
}

// 🔒 需要認證：使用 withAuthAndError
export const GET = withAuthAndError(handleGET, {
  module: 'ListingAPI',
  enableAuditLog: false
})

export const POST = withAuthAndError(handlePOST, {
  module: 'ListingAPI',
  enableAuditLog: true
})
