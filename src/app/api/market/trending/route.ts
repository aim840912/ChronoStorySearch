import { NextRequest } from 'next/server'
import { withBotDetection } from '@/lib/bot-detection/api-middleware'
import { requireTradingEnabled } from '@/lib/middleware/trading-middleware'
import { success } from '@/lib/api-response'
import { DatabaseError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import { DEFAULT_RATE_LIMITS } from '@/lib/bot-detection/constants'

/**
 * GET /api/market/trending - 熱門商品列表
 *
 * 功能：
 * - 🔓 公開端點（SEO 友善，無需認證）
 * - 🛡️ Bot Detection：User-Agent 過濾 + Rate Limiting（30次/小時）
 * - 查詢 status = 'active' 的刊登
 * - 按 view_count 降序排序
 * - 限制 10 筆（固定，無分頁）
 * - JOIN users 和 discord_profiles 獲取賣家資訊
 *
 * 認證要求：🔓 公開（withBotDetection）
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handleGET(_request: NextRequest) {
  apiLogger.debug('查詢熱門商品')

  // 1. 建立查詢（JOIN users 和 discord_profiles，使用嵌套語法）
  const query = supabaseAdmin
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
    `
    )
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('view_count', { ascending: false })
    .limit(10)

  // 2. 執行查詢
  const { data: listings, error } = await query

  if (error) {
    throw new DatabaseError('查詢熱門商品失敗', {
      code: error.code,
      message: error.message,
      details: error.details
    })
  }

  // 3. 轉換資料格式（扁平化 JOIN 結果）
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
    seller: {
      discord_username: listing.users?.discord_username || 'Unknown',
      reputation_score: listing.users?.discord_profiles?.reputation_score ?? 0
    }
  }))

  apiLogger.info('熱門商品查詢成功', {
    count: formattedListings.length
  })

  return success(formattedListings, '查詢成功')
}

// 🔓 公開端點 + 🛡️ Bot Detection + 交易系統開關檢查
// 使用 requireTradingEnabled 包裝 + withBotDetection 整合錯誤處理和 Bot 防護
export const GET = requireTradingEnabled(
  withBotDetection(handleGET, {
    module: 'TrendingAPI',
    botDetection: {
      enableRateLimit: true,
      enableBehaviorDetection: true,
      rateLimit: DEFAULT_RATE_LIMITS.TRENDING, // 30次/小時（嚴格限制）
    },
  })
)
