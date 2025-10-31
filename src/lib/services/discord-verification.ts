/**
 * Discord 驗證服務
 *
 * 功能：
 * - 驗證 Discord 帳號年齡
 * - 驗證 Discord 伺服器成員資格
 * - 整合資料庫查詢與 Discord API
 */

import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import { retry, RetryableError } from '@/lib/utils/retry'
import { RedisKeys, RedisTTL, DatabaseCacheTTL } from '@/lib/config/cache-config'
import { safeGet, safeSet } from '@/lib/redis/utils'

/**
 * 驗證 Discord 帳號年齡
 *
 * @param userId 使用者 UUID（資料庫 users.id）
 * @param minAgeDays 最小年齡要求（天數），預設 365 天
 * @returns { valid: boolean, accountAge: number, createdAt: Date }
 */
export async function checkAccountAge(
  userId: string,
  minAgeDays: number = 365
): Promise<{
  valid: boolean
  accountAge: number
  createdAt: Date | null
}> {
  try {
    // 1. 查詢使用者的 Discord ID 和 account_created_at
    const { data: profile, error } = await supabaseAdmin
      .from('discord_profiles')
      .select('account_created_at')
      .eq('user_id', userId)
      .single()

    if (error || !profile) {
      apiLogger.error('查詢 Discord profile 失敗', { error, userId })
      return {
        valid: false,
        accountAge: 0,
        createdAt: null
      }
    }

    // 2. 計算帳號年齡
    const createdAt = new Date(profile.account_created_at)
    const now = new Date()
    const diffMs = now.getTime() - createdAt.getTime()
    const accountAge = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    apiLogger.debug('Discord 帳號年齡驗證', {
      userId,
      accountAge,
      minAgeDays,
      valid: accountAge >= minAgeDays
    })

    return {
      valid: accountAge >= minAgeDays,
      accountAge,
      createdAt
    }
  } catch (error) {
    apiLogger.error('Discord 帳號年齡驗證失敗', { error, userId })
    return {
      valid: false,
      accountAge: 0,
      createdAt: null
    }
  }
}

/**
 * 驗證 Discord 伺服器成員資格
 *
 * 使用 Discord API 檢查使用者是否為特定伺服器成員
 *
 * @param accessToken Discord OAuth access token
 * @param requiredServerId Discord 伺服器 ID（Guild ID）
 * @returns { isMember: boolean, memberSince?: Date }
 */
export async function checkServerMembership(
  accessToken: string,
  requiredServerId: string
): Promise<{
  isMember: boolean
  memberSince?: Date
}> {
  try {
    // 使用重試機制呼叫 Discord API（指數退避）
    const guilds = await retry(async () => {
      const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      // 401: Token 過期，不可重試
      if (response.status === 401) {
        apiLogger.warn('Discord access token 已過期', { status: 401 })
        throw new RetryableError('Token 已過期', false)
      }

      // 403: 權限不足，不可重試
      if (response.status === 403) {
        apiLogger.warn('Discord OAuth scope 權限不足', { status: 403 })
        throw new RetryableError('權限不足', false)
      }

      // 429: Rate Limited，可重試
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '1'
        apiLogger.warn('Discord API rate limited', {
          status: 429,
          retryAfter: `${retryAfter}s`
        })
        throw new RetryableError(`Rate limited, retry after ${retryAfter}s`, true)
      }

      // 5xx: 伺服器錯誤，可重試
      if (response.status >= 500) {
        apiLogger.warn('Discord 伺服器錯誤', { status: response.status })
        throw new RetryableError('Discord 伺服器錯誤', true)
      }

      // 其他錯誤，不可重試
      if (!response.ok) {
        const errorText = await response.text()
        apiLogger.error('Discord API 呼叫失敗', {
          status: response.status,
          error: errorText
        })
        throw new RetryableError(`Discord API 錯誤: ${response.status}`, false)
      }

      return response.json()
    }, { retries: 3, backoff: 'exponential' })

    const guildsArray: Array<{
      id: string
      name: string
      joined_at?: string
    }> = guilds

    apiLogger.debug('Discord guilds 查詢成功', {
      guild_count: guildsArray.length,
      guild_ids: guildsArray.map((g) => g.id).slice(0, 5) // 只記錄前 5 個
    })

    // 檢查是否包含目標伺服器
    const targetGuild = guildsArray.find((guild) => guild.id === requiredServerId)

    if (targetGuild) {
      apiLogger.debug('Discord 伺服器成員驗證通過', {
        serverId: requiredServerId,
        guildName: targetGuild.name
      })

      return {
        isMember: true,
        memberSince: targetGuild.joined_at ? new Date(targetGuild.joined_at) : undefined
      }
    }

    apiLogger.debug('Discord 伺服器成員驗證失敗：不在伺服器中', {
      serverId: requiredServerId
    })

    return { isMember: false }
  } catch (error) {
    apiLogger.error('Discord 伺服器成員驗證失敗', { error })
    return { isMember: false }
  }
}

/**
 * 更新 discord_profiles 表的伺服器成員資格快取
 *
 * 用於減少 Discord API 呼叫頻率（建議每 24 小時更新一次）
 *
 * @param userId 使用者 UUID
 * @param isMember 是否為成員
 * @param memberSince 加入時間（可選）
 */
export async function updateServerMembershipCache(
  userId: string,
  isMember: boolean,
  memberSince?: Date
): Promise<boolean> {
  try {
    // ✅ 修復：檢查更新操作的返回值
    const { data, error } = await supabaseAdmin
      .from('discord_profiles')
      .update({
        is_server_member: isMember,
        server_member_since: memberSince?.toISOString() || null,
        server_member_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()

    if (error) {
      apiLogger.error('更新伺服器成員資格快取失敗', { error, userId })
      return false
    }

    if (!data || data.length === 0) {
      apiLogger.warn('更新伺服器成員資格快取：沒有匹配的記錄', { userId })
      return false
    }

    apiLogger.debug('更新伺服器成員資格快取成功', {
      userId,
      isMember,
      memberSince: memberSince?.toISOString()
    })
    return true
  } catch (error) {
    apiLogger.error('更新伺服器成員資格快取異常', { error, userId })
    return false
  }
}

/**
 * 檢查伺服器成員資格（使用快取）
 *
 * 快取架構（Fallback 機制）：
 * 1. Layer 1 (Redis) - 最快，但非關鍵，失敗時自動 fallback
 * 2. Layer 2 (Database) - 可靠來源，必須成功
 * 3. Layer 3 (Discord API) - 最準確，但最慢
 *
 * @param userId 使用者 UUID
 * @param accessToken Discord OAuth access token
 * @param requiredServerId Discord 伺服器 ID
 * @returns { isMember: boolean }
 */
export async function checkServerMembershipWithCache(
  userId: string,
  accessToken: string,
  requiredServerId: string
): Promise<{ isMember: boolean }> {
  const startTime = Date.now()
  const redisCacheKey = RedisKeys.discordMembership(userId, requiredServerId)

  // ========== Layer 1: Redis 快取（快速但非關鍵）==========
  const { value: redisValue, error: redisError } = await safeGet(redisCacheKey)

  if (redisValue !== null) {
    const isMember = redisValue === 'true'
    const latency = Date.now() - startTime

    apiLogger.info('[DiscordCache] ✅ Redis 快取命中', {
      userId,
      isMember,
      latency_ms: latency,
      cache_layer: 'redis'
    })

    return { isMember }
  }

  if (redisError) {
    apiLogger.warn('[DiscordCache] ⚠️  Redis 讀取失敗，使用資料庫 fallback', {
      userId,
      error: redisError.message
    })
  }

  // ========== Layer 2: 資料庫快取（可靠來源）==========
  const { data: profile, error: dbError } = await supabaseAdmin
    .from('discord_profiles')
    .select('is_server_member, server_member_checked_at')
    .eq('user_id', userId)
    .single()

  if (dbError) {
    apiLogger.error('[DiscordCache] ❌ 資料庫查詢失敗，直接調用 Discord API', {
      userId,
      error: dbError
    })
    // Fallback 到 Discord API（極端情況）
  } else if (profile) {
    const checkedAt = profile.server_member_checked_at
      ? new Date(profile.server_member_checked_at)
      : null

    // 檢查資料庫快取是否有效（24 小時內）
    if (checkedAt) {
      const now = new Date()
      const diffHours = (now.getTime() - checkedAt.getTime()) / (1000 * 60 * 60)

      if (diffHours < DatabaseCacheTTL.DISCORD_MEMBERSHIP) {
        const isMember = profile.is_server_member ?? false
        const latency = Date.now() - startTime

        // 嘗試回寫 Redis 快取（非關鍵操作）
        safeSet(redisCacheKey, isMember ? 'true' : 'false', RedisTTL.DISCORD_MEMBERSHIP)

        apiLogger.info('[DiscordCache] ✅ 資料庫快取命中', {
          userId,
          isMember,
          cached_hours_ago: diffHours.toFixed(2),
          latency_ms: latency,
          cache_layer: 'database'
        })

        return { isMember }
      }

      apiLogger.debug('[DiscordCache] 🔄 資料庫快取已過期', {
        userId,
        cached_hours_ago: diffHours.toFixed(2)
      })
    }
  }

  // ========== Layer 3: Discord API（最準確但最慢）==========
  apiLogger.info('[DiscordCache] 🔄 調用 Discord API 驗證成員資格', { userId })

  const result = await checkServerMembership(accessToken, requiredServerId)
  const latency = Date.now() - startTime

  // 更新資料庫快取（必須成功）
  const dbUpdated = await updateServerMembershipCache(
    userId,
    result.isMember,
    result.memberSince
  )

  if (!dbUpdated) {
    apiLogger.error('[DiscordCache] ❌ 資料庫快取更新失敗', { userId })
    // 注意：仍然返回 Discord API 結果，但記錄錯誤供監控
  }

  // 嘗試寫入 Redis 快取（非關鍵操作）
  const redisWritten = await safeSet(
    redisCacheKey,
    result.isMember ? 'true' : 'false',
    RedisTTL.DISCORD_MEMBERSHIP
  )

  apiLogger.info('[DiscordCache] ✅ Discord API 驗證完成', {
    userId,
    isMember: result.isMember,
    latency_ms: latency,
    cache_layer: 'discord_api',
    db_updated: dbUpdated,
    redis_updated: redisWritten
  })

  return { isMember: result.isMember }
}
