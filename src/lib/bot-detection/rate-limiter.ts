/**
 * Rate Limiter - 固定窗口算法
 *
 * 設計理念：
 * 1. 使用 Redis INCR + EXPIRE 實作固定窗口限流
 * 2. 每個請求僅需 2-3 個 Redis 命令（優化免費額度使用）
 * 3. 失敗時允許請求通過（容錯設計，避免誤傷真實用戶）
 * 4. 支援自定義時間窗口和限制次數
 *
 * Redis 命令使用：
 * - INCR: 計數器遞增（1 命令）
 * - EXPIRE: 設定過期時間（1 命令）
 * - TTL: 查詢剩餘時間（1 命令）
 * - 總計：3 命令/請求（被限流時僅 2 命令）
 */

import { redis } from '@/lib/redis/client'
import { apiLogger } from '@/lib/logger'
import { RateLimitResult, RateLimitConfig } from './types'

/**
 * 固定窗口 Rate Limiting
 *
 * @param config - Rate Limit 配置
 * @returns Rate Limit 檢測結果
 *
 * @example
 * ```typescript
 * const result = await fixedWindowRateLimit({
 *   limit: 30,
 *   window: 3600,
 *   identifier: '192.168.1.1',
 *   endpoint: '/api/market/trending'
 * })
 *
 * if (!result.allowed) {
 *   // 超過限制，返回 429
 *   throw new RateLimitError('請求過於頻繁', {
 *     retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
 *   })
 * }
 * ```
 */
export async function fixedWindowRateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, window, identifier, endpoint } = config

  // 生成 Redis key（格式：rl:identifier:endpoint:window）
  const timestamp = Math.floor(Date.now() / 1000 / window)
  const key = `rl:${identifier}:${endpoint}:${timestamp}`

  try {
    // 計數器遞增（Redis INCR）
    const count = await redis.incr(key)

    // 第一次訪問：設定過期時間
    if (count === 1) {
      await redis.expire(key, window)
    }

    // 查詢剩餘時間（Redis TTL）
    const ttl = await redis.ttl(key)
    const resetAt = Date.now() + ttl * 1000

    // 檢查是否超過限制
    if (count > limit) {
      apiLogger.warn('Rate limit 超過限制', {
        identifier,
        endpoint,
        count,
        limit,
        resetAt: new Date(resetAt).toISOString(),
      })

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      }
    }

    // 允許請求
    return {
      allowed: true,
      remaining: limit - count,
      resetAt,
    }
  } catch (error) {
    // Redis 連接失敗：容錯設計，允許請求通過
    apiLogger.error('Rate limit 檢查失敗（Redis 錯誤）', {
      error,
      identifier,
      endpoint,
    })

    // 返回「允許」（避免服務中斷）
    return {
      allowed: true,
      remaining: limit,
      resetAt: Date.now() + window * 1000,
    }
  }
}

/**
 * 檢查 IP 是否在黑名單中（未來可擴展）
 *
 * @param ip - IP 地址
 * @returns 是否在黑名單中
 */
export async function isIPBlacklisted(ip: string): Promise<boolean> {
  try {
    const key = `blacklist:ip:${ip}`
    const exists = await redis.exists(key)
    return exists === 1
  } catch (error) {
    apiLogger.error('IP 黑名單檢查失敗', { error, ip })
    return false // 失敗時假定不在黑名單
  }
}

/**
 * 將 IP 加入黑名單（管理員功能，未來可擴展）
 *
 * @param ip - IP 地址
 * @param duration - 封鎖時間（秒，預設 24 小時）
 */
export async function addIPToBlacklist(
  ip: string,
  duration: number = 86400
): Promise<void> {
  try {
    const key = `blacklist:ip:${ip}`
    await redis.setex(key, duration, '1')
    apiLogger.info('IP 已加入黑名單', { ip, duration })
  } catch (error) {
    apiLogger.error('IP 黑名單新增失敗', { error, ip })
  }
}

/**
 * 滑動窗口 Rate Limiting（使用 Lua Script 優化）
 *
 * 優勢：
 * 1. Redis 命令從 3 個減少到 1 個（Lua Script）
 * 2. 原子性操作（ZADD + ZCOUNT + ZREMRANGEBYSCORE）
 * 3. 精確的滑動窗口（避免固定窗口邊界問題）
 * 4. 自動清理過期記錄（防止記憶體洩漏）
 *
 * @param config - Rate Limit 配置
 * @returns Rate Limit 檢測結果
 */
export async function slidingWindowRateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, window, identifier, endpoint } = config

  const key = `rl:sw:${identifier}:${endpoint}`
  const now = Date.now()
  const windowStart = now - window * 1000
  const requestId = `${now}:${Math.random()}`

  const luaScript = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window_start = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local request_id = ARGV[4]
    local window_seconds = tonumber(ARGV[5])

    redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
    local current_count = redis.call('ZCARD', key)

    if current_count >= limit then
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local reset_at = math.floor(tonumber(oldest[2]) + window_seconds * 1000)
      return {0, 0, reset_at, current_count}
    end

    redis.call('ZADD', key, now, request_id)
    redis.call('EXPIRE', key, window_seconds * 2)

    local reset_at = now + window_seconds * 1000
    return {1, limit - current_count - 1, reset_at, current_count + 1}
  `

  try {
    const result = await redis.eval(
      luaScript,
      [key],
      [now, windowStart, limit, requestId, window]
    ) as number[]

    const [allowed, remaining, resetAt] = result

    if (allowed === 0) {
      apiLogger.warn('Rate limit 超過限制（滑動窗口）', {
        identifier,
        endpoint,
        limit,
        resetAt: new Date(resetAt).toISOString(),
      })

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      }
    }

    return {
      allowed: true,
      remaining,
      resetAt,
    }
  } catch (error) {
    apiLogger.error('Rate limit 檢查失敗（滑動窗口）', {
      error,
      identifier,
      endpoint,
    })

    return {
      allowed: true,
      remaining: limit,
      resetAt: now + window * 1000,
    }
  }
}
