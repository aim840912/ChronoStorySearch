import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { success, created } from '@/lib/api-response'
import { ValidationError, DatabaseError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import { validateAndCalculateStats } from '@/lib/validation/item-stats'
import type { ItemStats } from '@/types/item-stats'
import { checkAccountAge, checkServerMembershipWithCache } from '@/lib/services/discord-verification'

// Discord 驗證配置
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID // Discord 伺服器 ID（Guild ID）
const MIN_ACCOUNT_AGE_DAYS = 365 // Discord 帳號必須滿 1 年
const MAX_ACTIVE_LISTINGS = 5 // 每用戶最多 5 個活躍刊登

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
 * - 驗證 Discord 帳號年齡（必須滿 1 年）
 * - 驗證 Discord 伺服器成員資格
 * - 驗證 item_id, trade_type, price/wanted_item_id
 * - 檢查配額限制（每用戶最多 5 個 active listings）
 * - 插入 listings 表
 * - 返回創建的刊登
 *
 * 認證要求：🔒 需要認證 + Discord 驗證
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

  // 6. 檢查配額限制（每用戶最多 5 個 active listings）
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

  if (activeCount !== null && activeCount >= MAX_ACTIVE_LISTINGS) {
    apiLogger.warn('刊登配額已滿', {
      user_id: user.id,
      active_count: activeCount,
      max_listings: MAX_ACTIVE_LISTINGS
    })
    throw new ValidationError(`您已達到刊登配額上限（${MAX_ACTIVE_LISTINGS} 個），請先刪除或完成現有刊登`)
  }

  // 5. 插入刊登資料
  const listingData = {
    user_id: user.id,
    trade_type,
    item_id,
    quantity: quantity || 1,
    price: trade_type !== 'exchange' ? price : null,
    // 移除舊的 wanted_item_id 和 wanted_quantity（改用關聯表）
    // 新的聯絡方式欄位
    discord_contact: discord_contact.trim(),  // 必填，來自 OAuth
    ingame_name: ingame_name?.trim() || null, // 選填，可為 null
    seller_discord_id: user.discord_id,       // 保留 Deep Link 功能
    webhook_url: webhook_url || null,
    status: 'active',
    view_count: 0,
    interest_count: 0,
    // 物品屬性（如果提供）
    item_stats: validatedStats
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

  // 6. 如果是交換類型，插入想要物品到關聯表
  if (trade_type === 'exchange' && wanted_items && wanted_items.length > 0) {
    const wantedItemsData = wanted_items.map((item: { item_id: number; quantity: number }) => ({
      listing_id: listing.id,
      item_id: item.item_id,
      quantity: item.quantity
    }))

    const { error: wantedItemsError } = await supabaseAdmin
      .from('listing_wanted_items')
      .insert(wantedItemsData)

    if (wantedItemsError) {
      // 插入失敗：回滾 listing（刪除剛建立的刊登）
      await supabaseAdmin
        .from('listings')
        .delete()
        .eq('id', listing.id)

      apiLogger.error('建立想要物品失敗（已回滾刊登）', {
        error: wantedItemsError,
        user_id: user.id,
        listing_id: listing.id
      })

      throw new DatabaseError('建立想要物品失敗', wantedItemsError)
    }

    apiLogger.debug('想要物品建立成功', {
      user_id: user.id,
      listing_id: listing.id,
      wanted_items_count: wanted_items.length
    })
  }

  apiLogger.info('刊登建立成功', {
    user_id: user.id,
    listing_id: listing.id,
    trade_type: listing.trade_type,
    has_wanted_items: trade_type === 'exchange'
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
