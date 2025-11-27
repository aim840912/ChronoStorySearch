import { NextRequest } from 'next/server'
import { User } from '@/lib/middleware/api-middleware'
import { withAuthAndBotDetection } from '@/lib/bot-detection/api-middleware'
import { requireTradingEnabled } from '@/lib/middleware/trading-middleware'
import {
  successWithPagination,
  parsePaginationParams,
  calculatePagination
} from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import { DEFAULT_RATE_LIMITS } from '@/lib/bot-detection/constants'
import {
  getCachedMarketListings,
  setCachedMarketListings,
  buildMarketCacheKey
} from '@/lib/cache/market-cache'
import { getItemNames, itemsCacheMaps } from '@/lib/cache/items-cache'

// 解構全域快取 Maps（用於搜尋功能）
const { itemsMap, dropsItemsMap, gachaItemsMap } = itemsCacheMaps

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
 * GET /api/market/search - 市場搜尋/篩選
 *
 * 功能：
 * - 🔒 需要認證（防止 Bot 爬取）
 * - 🛡️ Bot Detection：User-Agent 過濾 + Rate Limiting（40次/小時）
 * - 查詢 status = 'active' 的刊登
 * - 支援搜尋：item_id, trade_type
 * - 支援價格範圍：min_price, max_price
 * - 支援物品屬性篩選：stat_N_key, stat_N_min, stat_N_max (動態), stats_grade
 * - 支援排序：sort_by (created_at, price, stats_score), order (asc, desc)
 * - 支援分頁：page, limit (預設 20, 最大 50)
 * - 從三個資料來源獲取物品中英文名稱（優先順序）：
 *   1. drops-essential.json（最完整，包含中英文）
 *   2. gacha machine JSON（轉蛋機專屬，包含中英文）
 *   3. item-attributes-essential.json（僅英文，備用）
 * - JOIN users 和 discord_profiles 獲取賣家資訊
 *
 * 認證要求：🔒 認證 + Bot Detection（withAuthAndBotDetection）
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handleGET(_request: NextRequest, user: User) {
  const { searchParams } = new URL(_request.url)

  // 1. 解析分頁參數
  const { page, limit, offset } = parsePaginationParams(searchParams, 20, 50)

  // 2. 解析篩選參數
  const trade_type = searchParams.get('trade_type')
  const item_id = searchParams.get('item_id')
  const search_term = searchParams.get('search_term') // 物品名稱搜尋
  const min_price = searchParams.get('min_price')
  const max_price = searchParams.get('max_price')

  // 2.1 解析動態物品屬性篩選參數
  const itemStatsFilters: Array<{
    key: string
    min?: number
    max?: number
  }> = []

  // 尋找所有 stat_N_key 參數（最多支援 10 個）
  for (let i = 0; i < 10; i++) {
    const key = searchParams.get(`stat_${i}_key`)
    if (!key) continue

    const minValue = searchParams.get(`stat_${i}_min`)
    const maxValue = searchParams.get(`stat_${i}_max`)

    // 驗證屬性鍵
    const validKeys = ['watk', 'matk', 'wdef', 'mdef', 'str', 'dex', 'int', 'luk', 'hp', 'mp', 'acc', 'avoid']
    if (!validKeys.includes(key)) {
      throw new ValidationError(`無效的屬性鍵: ${key}`)
    }

    // 驗證最小值
    if (minValue) {
      const minNum = parseInt(minValue, 10)
      if (isNaN(minNum) || minNum < 0) {
        throw new ValidationError(`${key} 的最小值必須是非負數字`)
      }
    }

    // 驗證最大值
    if (maxValue) {
      const maxNum = parseInt(maxValue, 10)
      if (isNaN(maxNum) || maxNum < 0) {
        throw new ValidationError(`${key} 的最大值必須是非負數字`)
      }
    }

    itemStatsFilters.push({
      key,
      min: minValue ? parseInt(minValue, 10) : undefined,
      max: maxValue ? parseInt(maxValue, 10) : undefined
    })
  }

  const stats_grade = searchParams.get('stats_grade')

  // 3. 解析排序參數
  const sort_by = searchParams.get('sort_by') || 'created_at' // 預設按建立時間排序
  const order = searchParams.get('order') || 'desc' // 預設降序

  // 驗證排序參數
  if (!['created_at', 'price', 'stats_score'].includes(sort_by)) {
    throw new ValidationError('sort_by 必須是 created_at, price 或 stats_score')
  }

  if (!['asc', 'desc'].includes(order)) {
    throw new ValidationError('order 必須是 asc 或 desc')
  }

  // 驗證素質等級參數
  if (stats_grade && !['S', 'A', 'B', 'C', 'D', 'F'].includes(stats_grade)) {
    throw new ValidationError('stats_grade 必須是 S, A, B, C, D 或 F')
  }

  apiLogger.debug('市場搜尋請求', {
    user_id: user.id,
    page,
    limit,
    trade_type,
    item_id,
    search_term,
    min_price,
    max_price,
    itemStatsFilters,
    stats_grade,
    sort_by,
    order
  })

  // 4. 檢查快取（僅在無複雜篩選時使用快取）
  const useCache = itemStatsFilters.length === 0 && !stats_grade && !min_price && !max_price
  let cacheKey = ''

  if (useCache) {
    cacheKey = buildMarketCacheKey({
      tradeType: trade_type || undefined,
      searchTerm: search_term || undefined,
      itemId: item_id ? parseInt(item_id, 10) : undefined,
      page
    })

    const cachedData = await getCachedMarketListings(cacheKey)
    if (cachedData) {
      apiLogger.debug('Market cache hit', {
        cacheKey,
        user_id: user.id
      })
      return successWithPagination(
        cachedData.listings,
        cachedData.pagination,
        '搜尋成功（快取）'
      )
    }
  }

  // 5. 建立查詢（JOIN users、discord_profiles 和 listing_wanted_items，使用嵌套語法）
  let query = supabaseAdmin
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
    .or('expires_at.is.null,expires_at.gt.now()') // ✅ 過濾過期刊登

  // 6. 應用篩選條件
  if (trade_type && trade_type !== 'all') {
    if (!['sell', 'buy', 'exchange'].includes(trade_type)) {
      throw new ValidationError('trade_type 必須是 sell, buy, exchange 或 all')
    }
    query = query.eq('trade_type', trade_type)
  }

  if (item_id) {
    const itemIdNum = parseInt(item_id, 10)
    if (isNaN(itemIdNum)) {
      throw new ValidationError('item_id 必須是數字')
    }
    query = query.eq('item_id', itemIdNum)
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
      query = query.in('item_id', itemIdsArray)

      apiLogger.debug('物品名稱搜尋結果', {
        search_term,
        matched_items: itemIdsArray.length
      })
    } else {
      // 如果沒有找到任何符合的物品，直接返回空結果（更優雅的處理方式）
      apiLogger.debug('物品名稱搜尋無結果', { search_term })

      return successWithPagination(
        [],
        {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        '查詢成功'
      )
    }
  }

  // 價格範圍篩選（僅適用於 sell/buy）
  if (min_price) {
    const minPriceNum = parseInt(min_price, 10)
    if (isNaN(minPriceNum) || minPriceNum < 0) {
      throw new ValidationError('min_price 必須是非負數字')
    }
    query = query.gte('price', minPriceNum)
  }

  if (max_price) {
    const maxPriceNum = parseInt(max_price, 10)
    if (isNaN(maxPriceNum) || maxPriceNum < 0) {
      throw new ValidationError('max_price 必須是非負數字')
    }
    query = query.lte('price', maxPriceNum)
  }

  // 物品屬性篩選（使用 JSONB 查詢）- 動態版本
  itemStatsFilters.forEach(({ key, min, max }) => {
    if (min !== undefined) {
      // PostgreSQL JSONB 查詢：(item_stats->>'key')::int >= min
      query = query.gte(`item_stats->${key}`, min)
    }
    if (max !== undefined) {
      // PostgreSQL JSONB 查詢：(item_stats->>'key')::int <= max
      query = query.lte(`item_stats->${key}`, max)
    }
  })

  if (stats_grade) {
    query = query.eq('stats_grade', stats_grade)
  }

  // 6. 應用排序
  const ascending = order === 'asc'
  query = query.order(sort_by, { ascending })

  // 7. 應用分頁
  query = query.range(offset, offset + limit - 1)

  // 8. 執行查詢
  const { data: listings, error, count } = await query

  if (error) {
    apiLogger.error('市場搜尋失敗', { error, user_id: user.id })
    throw new ValidationError('市場搜尋失敗')
  }

  // 9. 轉換資料格式（扁平化 JOIN 結果，並從全域快取查找物品中英文名稱）
  const formattedListings = ((listings || []) as ListingQueryResult[]).map((listing) => {
    // 從全域快取查找物品名稱（優先順序：drops → gacha → item-attributes）
    const { itemName, chineseItemName } = getItemNames(listing.item_id)

    return {
      id: listing.id,
      trade_type: listing.trade_type,
      item_id: listing.item_id,
      quantity: listing.quantity,
      price: listing.price,
      // 舊欄位（deprecated，向後相容）
      wanted_item_id: listing.wanted_item_id,
      wanted_quantity: listing.wanted_quantity,
      // 新欄位：想要物品陣列（從關聯表取得）
      wanted_items: (listing.listing_wanted_items || []).map((item) => ({
        item_id: item.item_id,
        quantity: item.quantity
      })),
      status: listing.status,
      view_count: listing.view_count,
      interest_count: listing.interest_count,
      created_at: listing.created_at,
      updated_at: listing.updated_at,
      // 物品屬性
      item_stats: listing.item_stats || null,
      stats_grade: listing.stats_grade || null,
      stats_score: listing.stats_score || null,
      // 物品資料（從三個資料來源查找：drops → gacha → item-attributes）
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

  // 10. 計算分頁資訊
  const pagination = calculatePagination(page, limit, count || 0)

  apiLogger.info('市場搜尋成功', {
    user_id: user.id,
    count: formattedListings.length,
    total: count,
    filters: {
      trade_type,
      item_id,
      search_term,
      min_price,
      max_price,
      itemStatsFilters,
      stats_grade,
      sort_by,
      order
    }
  })

  // 設定快取（僅在無複雜篩選時）
  if (useCache && cacheKey) {
    await setCachedMarketListings(cacheKey, {
      listings: formattedListings,
      pagination
    }, {
      hasFilters: false  // 簡單搜尋，使用 15 分鐘 TTL（階段 2 優化）
    })
  }

  return successWithPagination(formattedListings, pagination, '搜尋成功')
}

// 🔒 需要認證 + 🛡️ Bot Detection
// 使用 requireTradingEnabled 包裝 + withAuthAndBotDetection 整合認證、錯誤處理和 Bot 防護
export const GET = requireTradingEnabled(
  withAuthAndBotDetection(handleGET, {
    module: 'MarketSearchAPI',
    enableAuditLog: false,
    botDetection: {
      enableRateLimit: true,
      enableBehaviorDetection: false, // 禁用（Rate Limiting 已足夠，減少 Redis 使用）
      rateLimit: DEFAULT_RATE_LIMITS.SEARCH, // 40次/小時（中等限制）
    },
  })
)
