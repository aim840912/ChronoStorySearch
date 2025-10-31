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

const CACHE_TTL = 60 // 60 秒
const CACHE_KEYS_SET = 'market:cache:keys' // Redis Set 用於追蹤所有快取 keys

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
    // 使用 pipeline 批次執行操作，減少網路往返
    const pipeline = redis.pipeline()
    pipeline.set(cacheKey, JSON.stringify(data), { ex: CACHE_TTL })
    pipeline.sadd(CACHE_KEYS_SET, cacheKey) // 將 key 加入追蹤 Set
    pipeline.expire(CACHE_KEYS_SET, CACHE_TTL + 60) // 延長 Set TTL，防止遺漏
    await pipeline.exec()

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
 * 清除市場快取（當有新刊登建立時）
 *
 * @param pattern - Redis key pattern（支援萬用字元，預設為 'market:*'）
 */
export async function invalidateMarketCache(pattern: string = 'market:*') {
  try {
    // 使用 Set-based 追蹤，避免阻塞的 KEYS 命令
    const allKeys = await redis.smembers(CACHE_KEYS_SET)

    if (!allKeys || allKeys.length === 0) {
      apiLogger.debug('No market cache keys to invalidate')
      return
    }

    // 將 pattern 轉換為正則表達式
    const regexPattern = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    )

    // 過濾符合 pattern 的 keys
    const keysToDelete = allKeys.filter((key) => regexPattern.test(key))

    if (keysToDelete.length === 0) {
      apiLogger.debug('No matching market cache keys found', { pattern })
      return
    }

    // 批次刪除快取和 Set 成員
    const pipeline = redis.pipeline()
    keysToDelete.forEach((key) => {
      pipeline.del(key)
      pipeline.srem(CACHE_KEYS_SET, key)
    })
    await pipeline.exec()

    apiLogger.info('Market cache invalidated', {
      pattern,
      count: keysToDelete.length
    })
  } catch (error) {
    apiLogger.error('Failed to invalidate market cache', { error, pattern })
  }
}
