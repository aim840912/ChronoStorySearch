import { NextRequest } from 'next/server'
import { User } from '@/lib/middleware/api-middleware'
import { withAuthAndError } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'
import { ValidationError, RateLimitError } from '@/lib/errors'
import { apiLogger } from '@/lib/logger'
import { checkServerMembership, updateServerMembershipCache } from '@/lib/services/discord-verification'
import { RedisKeys, RedisTTL } from '@/lib/config/cache-config'
import { checkAndIncrementIpQuota } from '@/lib/redis/quota'
import { safeDelete, safeSet } from '@/lib/redis/utils'

// Discord 驗證配置
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID // Discord 伺服器 ID（Guild ID）

// Rate Limiting 配置
const REFRESH_RATE_LIMIT = {
  maxQuota: 5,      // 每小時最多 5 次
  ttlSeconds: 3600  // 1 小時
}

/**
 * POST /api/auth/discord/refresh-membership - 手動刷新 Discord 伺服器成員資格快取
 *
 * 功能：
 * - 🔒 需要認證
 * - 🛡️ Rate Limiting：每使用者每小時最多 5 次
 * - 清除 Redis 快取（1 小時 TTL）
 * - 清除資料庫快取（24 小時 TTL）
 * - 重新向 Discord API 查詢成員資格
 * - 返回最新的成員資格狀態
 *
 * 使用情境：
 * - 使用者剛加入 Discord 伺服器，但快取顯示尚未加入
 * - 使用者在建立刊登時遇到「必須加入 Discord 伺服器」錯誤
 * - 使用者想要立即更新成員資格狀態（不等待快取過期）
 *
 * 認證要求：🔒 認證 + Rate Limiting
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handlePOST(_request: NextRequest, user: User) {
  apiLogger.debug('手動刷新 Discord 成員資格快取', {
    user_id: user.id
  })

  // 驗證 Discord Guild ID 配置
  if (!DISCORD_GUILD_ID) {
    apiLogger.error('環境變數 DISCORD_GUILD_ID 未設定')
    throw new ValidationError('系統配置錯誤，請聯繫管理員')
  }

  // 驗證使用者的 access_token
  if (!user.access_token) {
    apiLogger.error('使用者缺少 access_token', { user_id: user.id })
    throw new ValidationError('無法驗證 Discord 身份，請重新登入')
  }

  // 檢查 Rate Limiting（每使用者每小時 5 次）
  const quotaKey = `refresh-membership:${user.id}`
  const { allowed, remaining } = await checkAndIncrementIpQuota(
    user.id,
    quotaKey,
    REFRESH_RATE_LIMIT.maxQuota,
    REFRESH_RATE_LIMIT.ttlSeconds
  )

  if (!allowed) {
    apiLogger.warn('刷新成員資格次數達到限制', {
      user_id: user.id,
      quota_key: quotaKey,
      max_quota: REFRESH_RATE_LIMIT.maxQuota
    })
    throw new RateLimitError(
      `刷新次數過於頻繁，請稍後再試（每小時最多 ${REFRESH_RATE_LIMIT.maxQuota} 次）`,
      { retryAfter: REFRESH_RATE_LIMIT.ttlSeconds }
    )
  }

  apiLogger.debug('Rate Limiting 檢查通過', {
    user_id: user.id,
    remaining
  })

  // 1. 清除 Redis 快取（Layer 1）- 使用安全操作
  const redisCacheKey = RedisKeys.discordMembership(user.id, DISCORD_GUILD_ID)

  const deleted = await safeDelete(redisCacheKey)

  if (deleted) {
    apiLogger.debug('[RefreshMembership] ✅ Redis 快取已清除', {
      user_id: user.id,
      cache_key: redisCacheKey
    })
  } else {
    apiLogger.warn('[RefreshMembership] ⚠️  Redis 清除失敗（非關鍵）', {
      user_id: user.id
    })
  }

  // 2. 呼叫 Discord API 取得最新成員資格（這會自動更新資料庫快取）
  let membershipResult

  try {
    membershipResult = await checkServerMembership(user.access_token, DISCORD_GUILD_ID)

    apiLogger.debug('Discord API 查詢成功', {
      user_id: user.id,
      is_member: membershipResult.isMember,
      member_since: membershipResult.memberSince
    })
  } catch (error) {
    apiLogger.error('Discord API 查詢失敗', {
      user_id: user.id,
      error
    })
    throw new ValidationError('無法連線到 Discord，請稍後再試')
  }

  // 3. 更新資料庫快取（Layer 2）- 必須成功
  const dbCacheUpdated = await updateServerMembershipCache(
    user.id,
    membershipResult.isMember,
    membershipResult.memberSince
  )

  if (!dbCacheUpdated) {
    // 資料庫更新失敗是嚴重錯誤，拋出異常
    apiLogger.error('[RefreshMembership] ❌ 資料庫快取更新失敗', {
      user_id: user.id
    })
    throw new ValidationError('更新成員資格快取失敗，請稍後再試')
  }

  apiLogger.debug('[RefreshMembership] ✅ 資料庫快取已更新', {
    user_id: user.id,
    is_member: membershipResult.isMember
  })

  // 4. 嘗試寫入 Redis 快取（非關鍵操作）
  const redisWritten = await safeSet(
    redisCacheKey,
    membershipResult.isMember ? 'true' : 'false',
    RedisTTL.DISCORD_MEMBERSHIP
  )

  if (redisWritten) {
    apiLogger.debug('[RefreshMembership] ✅ Redis 快取已更新', {
      user_id: user.id,
      is_member: membershipResult.isMember
    })
  } else {
    apiLogger.warn('[RefreshMembership] ⚠️  Redis 寫入失敗（功能不受影響）', {
      user_id: user.id
    })
  }

  apiLogger.info('[RefreshMembership] ✅ Discord 成員資格刷新成功', {
    user_id: user.id,
    is_member: membershipResult.isMember,
    member_since: membershipResult.memberSince,
    db_updated: true,
    redis_updated: redisWritten
  })

  return success(
    {
      is_member: membershipResult.isMember,
      member_since: membershipResult.memberSince,
      checked_at: new Date().toISOString(),
      cache_status: redisWritten ? 'redis_and_db' : 'db_only'  // 告知前端快取狀態
    },
    membershipResult.isMember
      ? '成員資格驗證成功'
      : '您尚未加入 Discord 伺服器'
  )
}

// 🔒 需要認證
export const POST = withAuthAndError(handlePOST, {
  module: 'DiscordMembershipRefreshAPI',
  enableAuditLog: false // 不記錄審計日誌（非敏感操作）
})
