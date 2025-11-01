/**
 * Upstash Redis 客戶端
 *
 * 用於 Session 管理、Rate Limiting 和 Bot Detection
 */

import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

if (!redisUrl || !redisToken) {
  throw new Error(
    'Missing Upstash Redis environment variables: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN'
  )
}

/**
 * Upstash Redis 客戶端
 *
 * 使用 REST API，適用於 Serverless 環境（Vercel Functions）
 *
 * @example
 * ```ts
 * import { redis } from '@/lib/redis/client'
 *
 * // 設定 key
 * await redis.set('user:123', { name: 'John' }, { ex: 3600 })
 *
 * // 取得 key
 * const user = await redis.get<{ name: string }>('user:123')
 *
 * // Rate Limiting
 * const count = await redis.incr('rate:api:123')
 * await redis.expire('rate:api:123', 60)
 * ```
 */
export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
})

/**
 * Redis Key 前綴常數
 *
 * 用於統一管理 Redis key 命名空間
 */
export const RedisKeys = {
  /** Session 相關 */
  SESSION: (sessionId: string) => `session:${sessionId}`,
  USER_SESSIONS: (userId: string) => `user:${userId}:sessions`,

  /** Rate Limiting */
  RATE_LIMIT: (identifier: string, endpoint: string) =>
    `rate:${endpoint}:${identifier}`,

  /** Bot Detection */
  BOT_IP: (ip: string) => `bot:ip:${ip}`,
  BOT_SCAN: (ip: string) => `bot:scan:${ip}`,
  BOT_PATHS: (ip: string) => `bot:paths:${ip}`,

  /** OAuth State */
  OAUTH_STATE: (state: string) => `oauth:state:${state}`,

  /** IP Quotas */
  IP_QUOTA: (ip: string, action: string) => `quota:${action}:${ip}`,
} as const

/**
 * Redis 工具函數
 */
export const RedisUtils = {
  /**
   * 設定帶過期時間的 key
   */
  async setEx<T>(key: string, value: T, expiresInSeconds: number) {
    return redis.set(key, value, { ex: expiresInSeconds })
  },

  /**
   * 檢查 key 是否存在
   */
  async exists(key: string) {
    return (await redis.exists(key)) === 1
  },

  /**
   * 安全掃描 Redis keys（使用 SCAN 避免阻塞）
   *
   * @param pattern - Key 匹配模式（如 "session:active:*"）
   * @param batchSize - 每次掃描數量（預設 100）
   * @returns 匹配的 keys 陣列
   *
   * @example
   * ```ts
   * const keys = await RedisUtils.safeScan('session:active:*', 100)
   * // ['session:active:123', 'session:active:456', ...]
   * ```
   */
  async safeScan(pattern: string, batchSize = 100): Promise<string[]> {
    const keys: string[] = []
    let cursor: string | number = 0

    do {
      const result: [string | number, string[]] = await redis.scan(cursor, {
        match: pattern,
        count: batchSize
      })

      // Upstash Redis SCAN 返回 [cursor: string, keys: string[]]
      const [nextCursor, batch] = result
      keys.push(...batch)
      // 轉換為數字用於迴圈條件檢查
      cursor = typeof nextCursor === 'string' ? parseInt(nextCursor, 10) : nextCursor
    } while (cursor !== 0)

    return keys
  },

  /**
   * 批次刪除 key（支援 pattern）
   *
   * 使用 SCAN 掃描後批次刪除，避免阻塞
   */
  async deletePattern(pattern: string) {
    const keys = await this.safeScan(pattern)

    if (keys.length === 0) {
      return 0
    }

    const pipeline = redis.pipeline()
    keys.forEach(key => pipeline.del(key))
    await pipeline.exec()

    return keys.length
  },

  /**
   * 取得剩餘過期時間（秒）
   */
  async ttl(key: string) {
    return redis.ttl(key)
  },
} as const
