import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { requireTradingEnabled } from '@/lib/middleware/trading-middleware'
import {
  success,
  parsePaginationParams,
  calculatePagination
} from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import { getItemNames, itemsCacheMaps } from '@/lib/cache/items-cache'
import { getSystemSettings } from '@/lib/config/system-config'

// 解構全域快取 Maps（用於搜尋功能）
const { dropsItemsMap, gachaItemsMap, itemsMap } = itemsCacheMaps

// =====================================================
// Supabase 查詢結果類型定義
// =====================================================

/**
 * 想要物品關聯表結果
 */
interface ListingWantedItem {
  item_id: number
  quantity: number
}

/**
 * 用戶 Discord 個人資料
 */
interface ListingDiscordProfile {
  reputation_score: number | null
}

/**
 * 用戶資訊（JOIN users 結果）
 */
interface ListingUser {
  discord_username: string | null
  discord_profiles: ListingDiscordProfile | null
}

/**
 * 完整刊登查詢結果（包含所有 JOIN 和關聯資料）
 */
interface ListingQueryResult {
  id: string
  trade_type: string
  item_id: number
  quantity: number
  price: number | null
  wanted_item_id: number | null
  wanted_quantity: number | null
  status: string
  view_count: number
  interest_count: number
  created_at: string
  updated_at: string
  item_stats: Record<string, number> | null
  stats_grade: string | null
  stats_score: number | null
  // 關聯資料
  users: ListingUser | null
  listing_wanted_items: ListingWantedItem[] | null
}

/**
 * GET /api/market/batch - 批次獲取市場資料
 *
 * 功能：
 * - 批次合併多個 API 調用，減少網路請求次數
 * - 返回：用戶資訊（含配額）+ 市場刊登列表
 * - 單一請求取代原本的 2 次調用（/api/auth/me + /api/market/search）
 * - 優化：減少 50% API 調用次數，降低 Vercel Function Invocations
 *
 * 返回資料結構：
 * {
 *   "user": { ... },           // 用戶資訊（含配額）
 *   "listings": [ ... ],       // 市場刊登列表
 *   "pagination": { ... }      // 分頁資訊
 * }
 *
 * 認證要求：🔒 需要認證
 * 參考文件：docs/optimization/OPTIMIZATION_HISTORY.md
 */
async function handleGET(_request: NextRequest, user: User) {
  const { searchParams } = new URL(_request.url)

  apiLogger.debug('批次獲取市場資料', {
    user_id: user.id
  })

  // ==================== 並行查詢：用戶資訊 + 市場刊登 ====================
  // 優化：使用 Promise.all 並行執行兩個查詢，而非順序執行
  // 預期提升：減少總延遲 30-40%

  // 1. 解析市場搜尋參數
  const { page, limit, offset } = parsePaginationParams(searchParams, 20, 50)
  const trade_type = searchParams.get('trade_type')
  const item_id = searchParams.get('item_id')
  const search_term = searchParams.get('search_term')
  const min_price = searchParams.get('min_price')
  const max_price = searchParams.get('max_price')
  const stats_grade = searchParams.get('stats_grade')
  const sort_by = searchParams.get('sort_by') || 'created_at'
  const order = searchParams.get('order') || 'desc'

  // 解析動態物品屬性篩選參數
  const itemStatsFilters: Array<{
    key: string
    min?: number
    max?: number
  }> = []

  for (let i = 0; i < 10; i++) {
    const key = searchParams.get(`stat_${i}_key`)
    if (!key) continue

    const minValue = searchParams.get(`stat_${i}_min`)
    const maxValue = searchParams.get(`stat_${i}_max`)

    const validKeys = ['watk', 'matk', 'wdef', 'mdef', 'str', 'dex', 'int', 'luk', 'hp', 'mp', 'acc', 'avoid']
    if (!validKeys.includes(key)) {
      throw new ValidationError(`無效的屬性鍵: ${key}`)
    }

    itemStatsFilters.push({
      key,
      min: minValue ? parseInt(minValue, 10) : undefined,
      max: maxValue ? parseInt(maxValue, 10) : undefined
    })
  }

  // 驗證參數
  if (sort_by && !['created_at', 'price', 'stats_score'].includes(sort_by)) {
    throw new ValidationError('sort_by 必須是 created_at, price 或 stats_score')
  }

  if (order && !['asc', 'desc'].includes(order)) {
    throw new ValidationError('order 必須是 asc 或 desc')
  }

  if (stats_grade && !['S', 'A', 'B', 'C', 'D', 'F'].includes(stats_grade)) {
    throw new ValidationError('stats_grade 必須是 S, A, B, C, D 或 F')
  }

  // 2. 建立市場刊登查詢
  let marketQuery = supabaseAdmin
    .from('listings')
    .select(
      `
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
    `,
      { count: 'exact' }
    )
    .eq('status', 'active')
    .is('deleted_at', null)
    .or('expires_at.is.null,expires_at.gt.now()')

  // 應用篩選條件
  if (trade_type && trade_type !== 'all') {
    if (!['sell', 'buy', 'exchange'].includes(trade_type)) {
      throw new ValidationError('trade_type 必須是 sell, buy, exchange 或 all')
    }
    marketQuery = marketQuery.eq('trade_type', trade_type)
  }

  if (item_id) {
    const itemIdNum = parseInt(item_id, 10)
    if (isNaN(itemIdNum)) {
      throw new ValidationError('item_id 必須是數字')
    }
    marketQuery = marketQuery.eq('item_id', itemIdNum)
  }

  // 物品名稱搜尋（從 JSON 資料中查找符合的 item_id）
  if (search_term && search_term.trim()) {
    const searchLower = search_term.trim().toLowerCase()
    const matchingItemIds = new Set<number>()

    // 搜尋 drops 資料
    dropsItemsMap.forEach((item, itemId) => {
      if (
        item.itemName.toLowerCase().includes(searchLower) ||
        (item.chineseItemName && item.chineseItemName.toLowerCase().includes(searchLower))
      ) {
        matchingItemIds.add(itemId)
      }
    })

    // 搜尋 gacha 資料
    gachaItemsMap.forEach((item, itemId) => {
      if (
        item.itemName.toLowerCase().includes(searchLower) ||
        (item.chineseName && item.chineseName.toLowerCase().includes(searchLower))
      ) {
        matchingItemIds.add(itemId)
      }
    })

    // 搜尋 item-attributes 資料（僅英文）
    itemsMap.forEach((item, itemId) => {
      if (item.item_name && item.item_name.toLowerCase().includes(searchLower)) {
        matchingItemIds.add(itemId)
      }
    })

    // 如果找到符合的物品 ID，使用 .in() 篩選
    if (matchingItemIds.size > 0) {
      const itemIdsArray = Array.from(matchingItemIds)
      marketQuery = marketQuery.in('item_id', itemIdsArray)

      apiLogger.debug('物品名稱搜尋結果（批次查詢）', {
        search_term,
        matched_items: itemIdsArray.length
      })
    } else {
      // 如果沒有找到任何符合的物品，查詢會自然返回空結果
      // 使用一個不可能存在的 item_id 來確保返回空結果
      marketQuery = marketQuery.eq('item_id', -1)
      apiLogger.debug('物品名稱搜尋無結果（批次查詢）', { search_term })
    }
  }

  // 價格範圍篩選
  if (min_price) {
    const minPriceNum = parseInt(min_price, 10)
    if (isNaN(minPriceNum) || minPriceNum < 0) {
      throw new ValidationError('min_price 必須是非負數字')
    }
    marketQuery = marketQuery.gte('price', minPriceNum)
  }

  if (max_price) {
    const maxPriceNum = parseInt(max_price, 10)
    if (isNaN(maxPriceNum) || maxPriceNum < 0) {
      throw new ValidationError('max_price 必須是非負數字')
    }
    marketQuery = marketQuery.lte('price', maxPriceNum)
  }

  // 物品屬性篩選
  itemStatsFilters.forEach(({ key, min, max }) => {
    if (min !== undefined) {
      marketQuery = marketQuery.gte(`item_stats->${key}`, min)
    }
    if (max !== undefined) {
      marketQuery = marketQuery.lte(`item_stats->${key}`, max)
    }
  })

  if (stats_grade) {
    marketQuery = marketQuery.eq('stats_grade', stats_grade)
  }

  // 應用排序和分頁
  const ascending = order === 'asc'
  marketQuery = marketQuery.order(sort_by, { ascending })
  marketQuery = marketQuery.range(offset, offset + limit - 1)

  // 3. 並行執行查詢（移除 RPC 函數依賴，改為直接查詢）
  const [profileResult, listingsCountResult, interestsTodayResult, marketResult] = await Promise.all([
    // 查詢 discord_profiles
    supabaseAdmin
      .from('discord_profiles')
      .select('account_created_at, reputation_score, server_roles, profile_privacy')
      .eq('user_id', user.id)
      .single(),

    // 查詢活躍刊登數量
    supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active'),

    // 查詢今日表達興趣次數
    supabaseAdmin
      .from('interests')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', user.id)
      .gte('created_at', new Date().toISOString().split('T')[0]),

    // 查詢市場刊登
    marketQuery
  ])

  // 4. 處理 discord_profiles 結果
  const { data: profile, error: profileError } = profileResult

  if (profileError || !profile) {
    apiLogger.error('批次查詢失敗（Discord 個人資料）', {
      user_id: user.id,
      error: profileError
    })
    throw new ValidationError('批次查詢失敗')
  }

  // 從系統設定讀取配額上限
  const systemSettings = await getSystemSettings()

  // 組合用戶資訊（移除 session 資訊，Supabase Auth 不需要）
  const userInfo = {
    user_id: user.id,
    discord_id: user.discord_id,
    discord_username: user.discord_username,
    discord_discriminator: user.discord_discriminator,
    discord_avatar: user.discord_avatar,
    email: user.email,
    profile: {
      account_created_at: profile.account_created_at,
      reputation_score: profile.reputation_score,
      server_roles: profile.server_roles || [],
      profile_privacy: profile.profile_privacy
    },
    quotas: {
      active_listings_count: listingsCountResult.count ?? 0,
      max_listings: systemSettings.max_active_listings_per_user,
      interests_today: interestsTodayResult.count ?? 0,
      max_interests_per_day: 100
    },
    account_status: {
      banned: user.banned,
      last_login_at: user.last_login_at,
      created_at: user.created_at
    }
  }

  // 5. 處理市場刊登結果
  const { data: listings, error: marketError, count } = marketResult

  if (marketError) {
    apiLogger.error('批次查詢失敗（市場刊登）', {
      user_id: user.id,
      error: marketError
    })
    throw new ValidationError('批次查詢失敗')
  }

  // 6. 轉換市場刊登格式
  const formattedListings = ((listings || []) as ListingQueryResult[]).map((listing) => {
    const { itemName, chineseItemName } = getItemNames(listing.item_id)

    return {
      id: listing.id,
      trade_type: listing.trade_type,
      item_id: listing.item_id,
      quantity: listing.quantity,
      price: listing.price,
      wanted_item_id: listing.wanted_item_id,
      wanted_quantity: listing.wanted_quantity,
      wanted_items: (listing.listing_wanted_items || []).map((item) => ({
        item_id: item.item_id,
        quantity: item.quantity
      })),
      status: listing.status,
      view_count: listing.view_count,
      interest_count: listing.interest_count,
      created_at: listing.created_at,
      updated_at: listing.updated_at,
      item_stats: listing.item_stats || null,
      stats_grade: listing.stats_grade || null,
      stats_score: listing.stats_score || null,
      item: {
        itemName: itemName,
        chineseItemName: chineseItemName
      },
      seller: {
        discord_username: listing.users?.discord_username || 'Unknown',
        reputation_score: listing.users?.discord_profiles?.reputation_score ?? 0
      }
    }
  })

  // 7. 計算分頁資訊
  const pagination = calculatePagination(page, limit, count || 0)

  apiLogger.info('批次查詢成功', {
    user_id: user.id,
    listings_count: formattedListings.length,
    total: count,
    page
  })

  // 8. 返回批次結果
  return success(
    {
      user: userInfo,
      listings: formattedListings,
      pagination
    },
    '批次查詢成功'
  )
}

// 🔒 需要認證 + 交易系統開關檢查
export const GET = requireTradingEnabled(
  withAuthAndError(handleGET, {
    module: 'MarketBatchAPI',
    enableAuditLog: false
  })
)
