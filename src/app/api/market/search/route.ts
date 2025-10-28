import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import {
  successWithPagination,
  parsePaginationParams,
  calculatePagination
} from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import itemsData from '@/../data/item-attributes-essential.json'
import type { ItemAttributesEssential } from '@/types'

// 匯入掉落資料（包含最完整的中英文物品名稱）
import dropsEssentialData from '@/../data/drops-essential.json'

// 匯入轉蛋機資料（用於查找轉蛋機專屬物品名稱）
import gachaMachine1 from '@/../data/gacha/machine-1-enhanced.json'
import gachaMachine2 from '@/../data/gacha/machine-2-enhanced.json'
import gachaMachine3 from '@/../data/gacha/machine-3-enhanced.json'
import gachaMachine4 from '@/../data/gacha/machine-4-enhanced.json'
import gachaMachine5 from '@/../data/gacha/machine-5-enhanced.json'
import gachaMachine6 from '@/../data/gacha/machine-6-enhanced.json'
import gachaMachine7 from '@/../data/gacha/machine-7-enhanced.json'

// 建立物品資料快取 Map（用於快速查找物品名稱）
const itemsMap = new Map<number, ItemAttributesEssential>()
;(itemsData as ItemAttributesEssential[]).forEach((item) => {
  const itemId = parseInt(item.item_id, 10)
  if (!isNaN(itemId)) {
    itemsMap.set(itemId, item)
  }
})

// 建立掉落物品名稱 Map（最完整的中英文物品名稱來源）
// 儲存 itemId -> {itemName, chineseItemName}，約 135KB
const dropsItemsMap = new Map<number, { itemName: string; chineseItemName: string | null }>()
;(dropsEssentialData as any[]).forEach((drop) => {
  const itemId = typeof drop.itemId === 'number' ? drop.itemId : parseInt(drop.itemId, 10)
  if (!isNaN(itemId) && drop.itemName) {
    // 只保留第一次出現的物品名稱（去重）
    if (!dropsItemsMap.has(itemId)) {
      dropsItemsMap.set(itemId, {
        itemName: drop.itemName,
        chineseItemName: drop.chineseItemName || null
      })
    }
  }
})

// 建立轉蛋機物品名稱 Map（轉蛋機專屬物品）
// 儲存 itemId -> {itemName, chineseName}，約 65KB
const gachaItemsMap = new Map<number, { itemName: string; chineseName: string | null }>()
const allGachaMachines = [
  gachaMachine1,
  gachaMachine2,
  gachaMachine3,
  gachaMachine4,
  gachaMachine5,
  gachaMachine6,
  gachaMachine7,
]

allGachaMachines.forEach((machine: any) => {
  machine.items?.forEach((item: any) => {
    const itemId = typeof item.itemId === 'string' ? parseInt(item.itemId, 10) : item.itemId
    if (!isNaN(itemId) && item.itemName) {
      // 只保留第一次出現的物品名稱（去重）
      if (!gachaItemsMap.has(itemId)) {
        gachaItemsMap.set(itemId, {
          itemName: item.itemName,
          chineseName: item.chineseName || null
        })
      }
    }
  })
})

/**
 * GET /api/market/search - 市場搜尋/篩選
 *
 * 功能：
 * - 查詢 status = 'active' 的刊登
 * - 支援搜尋：item_id, trade_type
 * - 支援價格範圍：min_price, max_price
 * - 支援物品屬性篩選：min_watk, min_matk, stats_grade
 * - 支援排序：sort_by (created_at, price, stats_score), order (asc, desc)
 * - 支援分頁：page, limit (預設 20, 最大 50)
 * - 從三個資料來源獲取物品中英文名稱（優先順序）：
 *   1. drops-essential.json（最完整，包含中英文）
 *   2. gacha machine JSON（轉蛋機專屬，包含中英文）
 *   3. item-attributes-essential.json（僅英文，備用）
 * - JOIN users 和 discord_profiles 獲取賣家資訊
 *
 * 認證要求：🔒 需要認證（防止 Bot 爬取）
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handleGET(_request: NextRequest, user: User) {
  const { searchParams } = new URL(_request.url)

  // 1. 解析分頁參數
  const { page, limit, offset } = parsePaginationParams(searchParams, 20, 50)

  // 2. 解析篩選參數
  const trade_type = searchParams.get('trade_type')
  const item_id = searchParams.get('item_id')
  const min_price = searchParams.get('min_price')
  const max_price = searchParams.get('max_price')

  // 2.1 解析物品屬性篩選參數
  const min_watk = searchParams.get('min_watk')
  const min_matk = searchParams.get('min_matk')
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
    min_price,
    max_price,
    min_watk,
    min_matk,
    stats_grade,
    sort_by,
    order
  })

  // 4. 建立查詢（JOIN users 和 discord_profiles，使用嵌套語法）
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
      )
    `,
      { count: 'exact' }
    )
    .eq('status', 'active')
    .is('deleted_at', null)

  // 5. 應用篩選條件
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

  // 物品屬性篩選（使用 JSONB 查詢）
  if (min_watk) {
    const minWatkNum = parseInt(min_watk, 10)
    if (isNaN(minWatkNum) || minWatkNum < 0) {
      throw new ValidationError('min_watk 必須是非負數字')
    }
    // PostgreSQL JSONB 查詢：(item_stats->>'watk')::int >= minWatkNum
    query = query.gte('item_stats->watk', minWatkNum)
  }

  if (min_matk) {
    const minMatkNum = parseInt(min_matk, 10)
    if (isNaN(minMatkNum) || minMatkNum < 0) {
      throw new ValidationError('min_matk 必須是非負數字')
    }
    query = query.gte('item_stats->matk', minMatkNum)
  }

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

  // 9. 轉換資料格式（扁平化 JOIN 結果，並從三個資料來源查找物品中英文名稱）
  const formattedListings = (listings || []).map((listing: any) => {
    // 查找物品名稱（優先順序：drops → gacha → item-attributes）
    const dropsItem = dropsItemsMap.get(listing.item_id)
    const gachaItem = gachaItemsMap.get(listing.item_id)
    const itemData = itemsMap.get(listing.item_id)

    // 英文名稱
    const itemName = dropsItem?.itemName || gachaItem?.itemName || itemData?.item_name || null

    // 中文名稱
    const chineseItemName = dropsItem?.chineseItemName || gachaItem?.chineseName || null

    return {
      id: listing.id,
      trade_type: listing.trade_type,
      item_id: listing.item_id,
      quantity: listing.quantity,
      price: listing.price,
      wanted_item_id: listing.wanted_item_id,
      wanted_quantity: listing.wanted_quantity,
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
      min_price,
      max_price,
      min_watk,
      min_matk,
      stats_grade,
      sort_by,
      order
    }
  })

  return successWithPagination(formattedListings, pagination, '搜尋成功')
}

// 🔒 需要認證：防止 Bot 大量爬取
export const GET = withAuthAndError(handleGET, {
  module: 'MarketSearchAPI',
  enableAuditLog: false
})
