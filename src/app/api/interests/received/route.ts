import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { requireTradingEnabled } from '@/lib/middleware/trading-middleware'
import { success } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'

// Edge Runtime（暫時停用以減少 Edge Request 消耗：2025-11-24）
// export const runtime = 'edge'

/**
 * GET /api/interests/received - 查詢收到的購買意向
 *
 * 功能：
 * - 查詢當前用戶刊登收到的所有購買意向
 * - JOIN listings 表過濾（user_id = current_user）
 * - JOIN users 表獲取買家資訊
 * - 支援狀態篩選
 *
 * 認證要求：🔒 需要認證
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handleGET(_request: NextRequest, user: User) {
  const { searchParams } = new URL(_request.url)
  const status = searchParams.get('status') || 'all'

  apiLogger.debug('查詢收到的購買意向', { user_id: user.id, status })

  // 查詢邏輯：
  // 1. 從 interests 表查詢
  // 2. JOIN listings 表（過濾 user_id = current_user）
  // 3. JOIN users 表（獲取買家資訊）
  let query = supabaseAdmin
    .from('interests')
    .select(`
      *,
      listings!inner (
        id,
        user_id,
        trade_type,
        item_id,
        quantity,
        price,
        wanted_item_id,
        status
      ),
      users!buyer_id (
        discord_username,
        discord_id
      )
    `)
    .eq('listings.user_id', user.id)
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: interests, error } = await query

  if (error) {
    apiLogger.error('查詢收到的購買意向失敗', { error, user_id: user.id })
    throw new ValidationError('查詢收到的購買意向失敗')
  }

  // 轉換資料格式（扁平化 JOIN 結果）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedInterests = (interests || []).map((interest: any) => ({
    id: interest.id,
    listing_id: interest.listing_id,
    buyer_id: interest.buyer_id,
    message: interest.message,
    status: interest.status,
    created_at: interest.created_at,
    updated_at: interest.updated_at,
    listing: interest.listings,
    buyer: {
      discord_username: interest.users?.discord_username || 'Unknown',
      discord_id: interest.users?.discord_id || null
    }
  }))

  apiLogger.info('查詢收到的購買意向成功', {
    user_id: user.id,
    count: formattedInterests.length
  })

  return success(formattedInterests, '查詢成功')
}

// 🔒 需要認證 + 交易系統開關檢查
export const GET = requireTradingEnabled(
  withAuthAndError(handleGET, {
    module: 'InterestAPI',
    enableAuditLog: false
  })
)
