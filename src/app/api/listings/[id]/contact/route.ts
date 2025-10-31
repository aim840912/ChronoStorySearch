import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { requireTradingEnabled } from '@/lib/middleware/trading-middleware'
import { success } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import { RedisKeys } from '@/lib/redis/client'
import { checkAndIncrementIpQuota } from '@/lib/redis/quota'
import { sendDiscordNotification } from '@/lib/services/discord-notification'
import { decryptWebhookUrl } from '@/lib/crypto/webhook-encryption'

/**
 * 驗證 IP 地址格式是否有效
 * 支援 IPv4 和 IPv6 格式
 */
function isValidIpAddress(ip: string): boolean {
  if (!ip || ip === 'unknown') {
    return false
  }

  // IPv4 驗證：xxx.xxx.xxx.xxx
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4Regex.test(ip)) {
    // 驗證每個數字是否在 0-255 範圍內
    const parts = ip.split('.')
    return parts.every((part) => {
      const num = parseInt(part, 10)
      return num >= 0 && num <= 255
    })
  }

  // IPv6 驗證（簡化版本，支援完整格式）
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/
  if (ipv6Regex.test(ip)) {
    return true
  }

  // IPv6 簡寫格式（包含 ::）
  const ipv6ShortRegex =
    /^([0-9a-fA-F]{0,4}:){1,7}:([0-9a-fA-F]{0,4}:){0,6}[0-9a-fA-F]{0,4}$/
  return ipv6ShortRegex.test(ip)
}

/**
 * 從請求中安全地提取 IP 地址
 * 驗證格式並防止偽造
 */
function extractValidIP(request: NextRequest): string {
  // 1. 嘗試從 x-forwarded-for 取得（通常由 proxy/CDN 設定）
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim()
    if (firstIp && isValidIpAddress(firstIp)) {
      return firstIp
    }
  }

  // 2. 嘗試從 x-real-ip 取得
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    const trimmed = realIp.trim()
    if (trimmed && isValidIpAddress(trimmed)) {
      return trimmed
    }
  }

  // 3. 都失敗時返回 'unknown'（會被配額檢查拒絕）
  return 'unknown'
}

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

  // 1. 取得使用者 IP 地址（安全驗證）
  const ip = extractValidIP(request)

  // 如果無法取得有效 IP，拒絕請求
  if (ip === 'unknown') {
    apiLogger.warn('無法驗證請求來源 IP', {
      user_id: user.id,
      listing_id: id,
      x_forwarded_for: request.headers.get('x-forwarded-for'),
      x_real_ip: request.headers.get('x-real-ip')
    })
    throw new ValidationError('無法驗證請求來源，請確保網路環境正常')
  }

  // 2. 驗證刊登存在且為 active 狀態（先驗證再消耗配額）
  const { data: listing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select(`
      id,
      user_id,
      discord_contact,
      ingame_name,
      seller_discord_id,
      status,
      view_count,
      webhook_url,
      item_id
    `)
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

  // 3. 防止查看自己的刊登聯絡方式（不消耗配額）
  if (listing.user_id === user.id) {
    return success(
      {
        discord: listing.discord_contact,
        ingame: listing.ingame_name || null,
        discordId: listing.seller_discord_id || null,
        is_own_listing: true
      },
      '查看成功（自己的刊登）'
    )
  }

  // 4. 檢查並遞增 IP 配額（原子操作防止 Race Condition）
  const quotaKey = RedisKeys.IP_QUOTA(ip, 'contact_view')
  const secondsUntilMidnight = getSecondsUntilMidnight()
  const { allowed, remaining } = await checkAndIncrementIpQuota(
    ip,
    quotaKey,
    30, // maxQuota
    secondsUntilMidnight
  )

  if (!allowed) {
    throw new ValidationError('今日查看聯絡方式次數已達上限（30 次）')
  }

  // 5. 增加 view_count
  await supabaseAdmin
    .from('listings')
    .update({ view_count: (listing.view_count || 0) + 1 })
    .eq('id', id)

  // 6. 發送 Discord Webhook 通知（非阻塞）
  if (listing.webhook_url) {
    try {
      // 解密 webhook_url
      const decryptedWebhookUrl = decryptWebhookUrl(listing.webhook_url)

      // 查詢買家的信譽分數
      const { data: buyerProfile } = await supabaseAdmin
        .from('discord_profiles')
        .select('reputation_score')
        .eq('user_id', user.id)
        .single()

      // 非同步發送通知，不等待結果
      sendDiscordNotification(
        decryptedWebhookUrl,
        'contact_view',
        {
          listingId: listing.id,
          itemName: `物品 ID: ${listing.item_id}`,
          buyer: {
            username: user.discord_username || user.discord_id,
            reputation: buyerProfile?.reputation_score
          }
        }
      ).catch((error) => {
        // 記錄通知失敗，但不中斷主流程
        apiLogger.warn('Discord 通知發送失敗 (contact_view)', {
          listing_id: listing.id,
          webhook_url_encrypted: listing.webhook_url?.substring(0, 50) + '...', // 避免洩露
          notification_type: 'contact_view',
          error_message: error.message,
          user_id: user.id
        })
      })
    } catch (error) {
      // 解密失敗時記錄錯誤
      apiLogger.error('解密 Webhook URL 失敗', {
        listing_id: listing.id,
        error
      })
    }
  }

  apiLogger.info('查看聯絡方式成功', {
    user_id: user.id,
    listing_id: id,
    ip,
    quota_remaining: remaining
  })

  return success(
    {
      discord: listing.discord_contact,
      ingame: listing.ingame_name || null,
      discordId: listing.seller_discord_id || null,
      quota_remaining: remaining,
      is_own_listing: false
    },
    '查看成功'
  )
}

/**
 * 計算到 UTC 今天午夜的秒數
 *
 * 使用 UTC 時區確保跨地區的伺服器行為一致
 */
function getSecondsUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1, // 下一天的 00:00:00 UTC
      0,
      0,
      0,
      0
    )
  )
  return Math.floor((midnight.getTime() - now.getTime()) / 1000)
}

// 🔒 需要認證：使用 requireTradingEnabled + withAuthAndError
export const GET = requireTradingEnabled(
  withAuthAndError(
    async (request: NextRequest, user: User, context: { params: Promise<{ id: string }> }) =>
      handleGET(request, user, context),
    {
      module: 'ListingContactAPI',
      enableAuditLog: true
    }
  )
)
