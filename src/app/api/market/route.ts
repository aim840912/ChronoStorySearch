import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { requireTradingEnabled } from '@/lib/middleware/trading-middleware'
import { successWithPagination, parsePaginationParams, calculatePagination } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'

/**
 * GET /api/market - 市場列表
 *
 * 功能：
 * - 查詢 status = 'active' 的刊登
 * - 支援篩選：trade_type, item_id
 * - 支援分頁：page, limit (預設 20, 最大 50)
 * - JOIN users 和 discord_profiles 獲取賣家資訊
 * - 客戶端需使用 getItemById 合併物品資訊
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

  apiLogger.debug('查詢市場列表', {
    user_id: user.id,
    page,
    limit,
    trade_type,
    item_id
  })

  // 3. 建立查詢（JOIN users 和 discord_profiles）
  let query = supabaseAdmin
    .from('listings')
    .select(`
      *,
      users!inner (
        discord_username
      ),
      discord_profiles (
        reputation_score
      )
    `, { count: 'exact' })
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 4. 應用篩選條件
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

  // 5. 應用分頁
  query = query.range(offset, offset + limit - 1)

  // 6. 執行查詢
  const { data: listings, error, count } = await query

  if (error) {
    apiLogger.error('查詢市場列表失敗', { error, user_id: user.id })
    throw new ValidationError('查詢市場列表失敗')
  }

  // 7. 轉換資料格式（扁平化 JOIN 結果）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // 物品屬性（解析 JSON 字串）
    item_stats: listing.item_stats
      ? (typeof listing.item_stats === 'string'
          ? JSON.parse(listing.item_stats)
          : listing.item_stats)
      : null,
    stats_grade: listing.stats_grade || null,
    stats_score: listing.stats_score || null,
    // 交換刊登的想要物品（解析 JSON 字串）
    wanted_items: listing.wanted_items
      ? (typeof listing.wanted_items === 'string'
          ? JSON.parse(listing.wanted_items)
          : listing.wanted_items)
      : null,
    seller: {
      discord_username: listing.users?.discord_username || 'Unknown',
      reputation_score: listing.discord_profiles?.reputation_score || 0
    }
  }))

  // 8. 計算分頁資訊
  const pagination = calculatePagination(page, limit, count || 0)

  apiLogger.info('市場列表查詢成功', {
    user_id: user.id,
    count: formattedListings.length,
    total: count,
    page
  })

  return successWithPagination(formattedListings, pagination, '查詢成功')
}

// 🔒 需要認證：防止 Bot 大量爬取 + 檢查交易系統開關
export const GET = requireTradingEnabled(
  withAuthAndError(handleGET, {
    module: 'MarketAPI',
    enableAuditLog: false
  })
)
