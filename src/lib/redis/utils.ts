/**
 * Redis 安全操作工具
 *
 * 提供容錯的 Redis 操作，失敗時不影響主流程
 *
 * 設計理念：
 * - Redis 作為效能優化層，非關鍵路徑
 * - 失敗時自動 fallback，不拋出錯誤
 * - 所有錯誤都記錄到日誌供監控
 */

import { redis } from './client'
import { apiLogger } from '@/lib/logger'

/**
 * 安全地從 Redis 讀取值
 *
 * @param key - Redis 鍵
 * @returns { value: string | null, error: Error | null }
 *
 * @example
 * ```ts
 * const { value, error } = await safeGet('user:123')
 * if (value !== null) {
 *   // 使用快取值
 * } else {
 *   // Fallback 到其他資料源
 * }
 * ```
 */
export async function safeGet(key: string): Promise<{
  value: string | null
  error: Error | null
}> {
  try {
    const rawValue = await redis.get(key)

    // Redis get 返回 unknown，需要類型轉換
    const value: string | null = typeof rawValue === 'string' ? rawValue : null

    if (value === null) {
      apiLogger.debug('[Redis] 快取未命中', { key })
    } else {
      apiLogger.debug('[Redis] 快取命中', { key, valueLength: value.length })
    }

    return { value, error: null }
  } catch (error) {
    apiLogger.warn('[Redis] GET 操作失敗', {
      key,
      error: error instanceof Error ? error.message : String(error)
    })
    return { value: null, error: error as Error }
  }
}

/**
 * 安全地寫入 Redis（非關鍵操作）
 *
 * 失敗時只記錄日誌，不拋出錯誤，允許業務邏輯繼續
 *
 * @param key - Redis 鍵
 * @param value - 要寫入的值
 * @param ttl - 過期時間（秒）
 * @returns boolean - 是否寫入成功
 *
 * @example
 * ```ts
 * const success = await safeSet('user:123', 'data', 3600)
 * if (!success) {
 *   // Redis 寫入失敗，但業務邏輯繼續
 *   apiLogger.warn('Redis 快取更新失敗，使用資料庫')
 * }
 * ```
 */
export async function safeSet(
  key: string,
  value: string,
  ttl: number
): Promise<boolean> {
  try {
    await redis.set(key, value, { ex: ttl })
    apiLogger.debug('[Redis] SET 成功', { key, ttl, valueLength: value.length })
    return true
  } catch (error) {
    apiLogger.warn('[Redis] SET 操作失敗（非關鍵）', {
      key,
      ttl,
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

/**
 * 安全地刪除 Redis 鍵（非關鍵操作）
 *
 * @param key - Redis 鍵
 * @returns boolean - 是否刪除成功
 */
export async function safeDelete(key: string): Promise<boolean> {
  try {
    await redis.del(key)
    apiLogger.debug('[Redis] DEL 成功', { key })
    return true
  } catch (error) {
    apiLogger.warn('[Redis] DEL 操作失敗（非關鍵）', {
      key,
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

/**
 * 批量安全讀取（用於監控和調試）
 *
 * @param pattern - Redis 鍵模式（如 'user:*'）
 * @returns string[] - 匹配的鍵列表
 */
export async function safeKeys(pattern: string): Promise<string[]> {
  try {
    const keys = await redis.keys(pattern)
    apiLogger.debug('[Redis] KEYS 成功', { pattern, count: keys.length })
    return keys
  } catch (error) {
    apiLogger.warn('[Redis] KEYS 操作失敗', {
      pattern,
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}
