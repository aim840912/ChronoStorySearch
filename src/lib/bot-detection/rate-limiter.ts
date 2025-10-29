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
