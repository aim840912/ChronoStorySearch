/**
 * 市場搜尋快取模組
 *
 * 功能：
 * - 快取市場搜尋結果（60 秒 TTL）
 * - 減少資料庫查詢負載
 * - 提升 API 響應速度
 */

import { redis } from '@/lib/redis/client'
import { apiLogger } from '@/lib/logger'
import type { ListingWithUserInfo } from '@/types'
import type { PaginationInfo } from '@/lib/api-response'

/**
 * 市場快取資料結構
 */
export interface MarketCacheData {
  listings: ListingWithUserInfo[]
  pagination: PaginationInfo
}

const CACHE_TTL = 300 // 300 秒（5 分鐘）- 延長 TTL 提升快取命中率
// 移除 ZSET 追蹤（依賴 Redis TTL 自動過期，減少 Redis 命令使用）
// const CACHE_KEYS_ZSET = 'market:cache:keys:zset'
// const MAX_CACHE_KEYS = 1000

/**
 * 獲取快取的市場刊登列表
 *
 * @param cacheKey - Redis key
 * @returns 快取的資料或 null
 */
export async function getCachedMarketListings(cacheKey: string): Promise<MarketCacheData | null> {
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      apiLogger.info('Market listings cache hit', { cacheKey })
      return cached as MarketCacheData
    }
    return null
  } catch (error) {
    apiLogger.error('Redis cache get error', { error, cacheKey })
    return null
  }
}

/**
 * 設定市場刊登列表快取
 *
 * @param cacheKey - Redis key
 * @param data - 要快取的資料
 */
export async function setCachedMarketListings(cacheKey: string, data: unknown) {
  try {
    // 簡化快取策略：僅設定 key + TTL，依賴 Redis 自動過期
    // 移除 ZSET 追蹤和清理邏輯，減少 Redis 命令使用
    await redis.set(cacheKey, JSON.stringify(data), { ex: CACHE_TTL })

    apiLogger.debug('Market listings cached', { cacheKey, ttl: CACHE_TTL })
  } catch (error) {
    apiLogger.error('Redis cache set error', { error, cacheKey })
  }
}

/**
 * 建立市場搜尋快取 key
 *
 * @param params - 搜尋參數
 * @returns Redis key
 */
export function buildMarketCacheKey(params: {
  tradeType?: string
  searchTerm?: string
  itemId?: number
  page?: number
}): string {
  const tradeType = params.tradeType || 'all'
  const searchTerm = params.searchTerm || 'none'
  const itemId = params.itemId || 'all'
  const page = params.page || 1

  return `market:${tradeType}:${searchTerm}:${itemId}:page${page}`
}

/**
 * 清理過期的快取 keys（已廢棄）
 *
 * 原本使用 ZSET 追蹤 keys 並定期清理
 * 現已移除 ZSET，改為依賴 Redis TTL 自動過期
 */
// async function cleanupExpiredCacheKeys(): Promise<number> {
//   ... (已移除，依賴 Redis TTL)
// }

/**
 * 限制 ZSET 大小（已廢棄）
 *
 * 原本限制 ZSET 大小防止無限增長
 * 現已移除 ZSET，改為依賴 Redis TTL 自動過期
 */
// async function limitCacheKeysSize(): Promise<number> {
//   ... (已移除，依賴 Redis TTL)
// }

/**
 * 清除市場快取（當有新刊登建立時）
 *
 * 簡化版本：使用 SCAN 掃描符合 pattern 的 keys，然後批次刪除
 * 依賴 Redis TTL 自動過期，無需手動維護
 *
 * @param pattern - Redis key pattern（支援萬用字元，預設為 'market:*'）
 */
export async function invalidateMarketCache(pattern: string = 'market:*') {
  try {
    // 使用 RedisUtils.deletePattern 批次刪除符合 pattern 的 keys
    // 內部使用 SCAN（非阻塞）+ DEL（批次）
    const { RedisUtils } = await import('@/lib/redis/client')
    const deletedCount = await RedisUtils.deletePattern(pattern)

    apiLogger.info('Market cache invalidated', {
      pattern,
      count: deletedCount
    })
  } catch (error) {
    apiLogger.error('Failed to invalidate market cache', { error, pattern })
  }
}
