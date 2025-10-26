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

/**
 * GET /api/market/search - 市場搜尋/篩選
 *
 * 功能：
 * - 查詢 status = 'active' 的刊登
 * - 支援搜尋：item_id, trade_type
 * - 支援價格範圍：min_price, max_price
 * - 支援排序：sort_by (created_at, price), order (asc, desc)
 * - 支援分頁：page, limit (預設 20, 最大 50)
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

  // 3. 解析排序參數
  const sort_by = searchParams.get('sort_by') || 'created_at' // 預設按建立時間排序
  const order = searchParams.get('order') || 'desc' // 預設降序

  // 驗證排序參數
  if (!['created_at', 'price'].includes(sort_by)) {
    throw new ValidationError('sort_by 必須是 created_at 或 price')
  }

  if (!['asc', 'desc'].includes(order)) {
    throw new ValidationError('order 必須是 asc 或 desc')
  }

  apiLogger.debug('市場搜尋請求', {
    user_id: user.id,
    page,
    limit,
    trade_type,
    item_id,
    min_price,
    max_price,
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

  // 9. 轉換資料格式（扁平化 JOIN 結果）
  const formattedListings = (listings || []).map((listing: any) => ({
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
    seller: {
      discord_username: listing.users?.discord_username || 'Unknown',
      reputation_score: listing.users?.discord_profiles?.reputation_score ?? 0
    }
  }))

  // 10. 計算分頁資訊
  const pagination = calculatePagination(page, limit, count || 0)

  apiLogger.info('市場搜尋成功', {
    user_id: user.id,
    count: formattedListings.length,
    total: count,
    filters: { trade_type, item_id, min_price, max_price, sort_by, order }
  })

  return successWithPagination(formattedListings, pagination, '搜尋成功')
}

// 🔒 需要認證：防止 Bot 大量爬取
export const GET = withAuthAndError(handleGET, {
  module: 'MarketSearchAPI',
  enableAuditLog: false
})
