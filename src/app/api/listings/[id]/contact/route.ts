import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import { redis, RedisKeys } from '@/lib/redis/client'

/**
 * GET /api/listings/[id]/contact - 查看聯絡方式
 *
 * 功能：
 * - 驗證刊登存在且為 active 狀態
 * - 檢查 IP 配額 (30 次/天)
 * - 返回賣家聯絡方式
 * - 增加 view_count
 * - 記錄 IP 配額到 Redis
 *
 * 認證要求：🔒 需要認證
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handleGET(
  request: NextRequest,
  user: User,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  apiLogger.debug('查看聯絡方式', {
    user_id: user.id,
    listing_id: id
  })

  // 1. 取得使用者 IP 地址
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'

  if (ip === 'unknown') {
    apiLogger.warn('無法取得 IP 地址', { user_id: user.id, listing_id: id })
  }

  // 2. 檢查 IP 配額 (30 次/天)
  const quotaKey = RedisKeys.IP_QUOTA(ip, 'contact_view')
  const currentCount = await redis.get<number>(quotaKey)

  if (currentCount && currentCount >= 30) {
    apiLogger.warn('IP 配額已達上限', {
      user_id: user.id,
      ip,
      count: currentCount
    })
    throw new ValidationError('今日查看聯絡方式次數已達上限（30 次），請明天再試')
  }

  // 3. 驗證刊登存在且為 active 狀態
  const { data: listing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('id, user_id, contact_method, contact_info, status, view_count')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !listing) {
    apiLogger.warn('刊登不存在', { listing_id: id, error: fetchError })
    throw new NotFoundError('刊登不存在')
  }

  if (listing.status !== 'active') {
    throw new ValidationError('刊登已結束，無法查看聯絡方式')
  }

  // 4. 防止查看自己的刊登聯絡方式（不消耗配額）
  if (listing.user_id === user.id) {
    return success(
      {
        contact_method: listing.contact_method,
        contact_info: listing.contact_info,
        is_own_listing: true
      },
      '查看成功（自己的刊登）'
    )
  }

  // 5. 增加 view_count
  await supabaseAdmin
    .from('listings')
    .update({ view_count: (listing.view_count || 0) + 1 })
    .eq('id', id)

  // 6. 記錄 IP 配額到 Redis（24 小時過期）
  const newCount = (currentCount || 0) + 1
  const secondsUntilMidnight = getSecondsUntilMidnight()
  await redis.set(quotaKey, newCount, { ex: secondsUntilMidnight })

  apiLogger.info('查看聯絡方式成功', {
    user_id: user.id,
    listing_id: id,
    ip,
    quota_used: newCount
  })

  return success(
    {
      contact_method: listing.contact_method,
      contact_info: listing.contact_info,
      quota_remaining: 30 - newCount,
      is_own_listing: false
    },
    '查看成功'
  )
}

/**
 * 計算到今天午夜的秒數
 */
function getSecondsUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return Math.floor((midnight.getTime() - now.getTime()) / 1000)
}

// 🔒 需要認證
export const GET = withAuthAndError(
  async (request: NextRequest, user: User, context: { params: Promise<{ id: string }> }) =>
    handleGET(request, user, context),
  {
    module: 'ListingContactAPI',
    enableAuditLog: true
  }
)
