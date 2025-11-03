/**
 * 市場搜尋快取模組
 *
 * 功能：
 * - 快取市場搜尋結果（15 分鐘 TTL）
 * - 減少資料庫查詢負載
 * - 提升 API 響應速度
 *
 * 優化記錄（2025-11-03）：
 * - TTL 從 5 分鐘延長到 15 分鐘（減少 20-30% Cache SET 操作）
 * - 新增動態 TTL（根據搜尋類型）
 * - 市場刊登更新不頻繁，15 分鐘延遲可接受
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

/**
 * 不同搜尋類型的 TTL 配置
 *
 * 設計理念：
 * - 熱門商品：較長 TTL（30 分鐘）- 資料變動最少
 * - 一般搜尋：中等 TTL（15 分鐘）- 平衡即時性與快取效益
 * - 精確搜尋（有物品屬性篩選）：較短 TTL（5 分鐘）- 需要較即時的資料
 */
export const CACHE_TTL_BY_TYPE = {
  /** 熱門商品列表：30 分鐘 TTL */
  trending: 1800,
  /** 一般搜尋：15 分鐘 TTL */
  search: 900,
  /** 精確搜尋（有篩選條件）：5 分鐘 TTL */
  filtered: 300,
  /** 預設：15 分鐘 TTL */
  default: 900
} as const

/**
 * Cache TTL 選項
 */
export interface CacheTTLOptions {
  /** 是否有篩選條件（如物品屬性、價格範圍等） */
  hasFilters?: boolean
  /** 是否為熱門商品列表 */
  isTrending?: boolean
}

/**
 * 根據搜尋類型獲取適當的 TTL
 *
 * @param options - TTL 選項
 * @returns TTL（秒）
 *
 * @example
 * ```typescript
 * // 熱門商品
 * getCacheTTL({ isTrending: true }) // → 1800 秒（30 分鐘）
 *
 * // 精確搜尋（有篩選）
 * getCacheTTL({ hasFilters: true }) // → 300 秒（5 分鐘）
 *
 * // 一般搜尋
 * getCacheTTL({}) // → 900 秒（15 分鐘）
 * ```
 */
export function getCacheTTL(options: CacheTTLOptions = {}): number {
  if (options.isTrending) {
    return CACHE_TTL_BY_TYPE.trending
  }

  if (options.hasFilters) {
    return CACHE_TTL_BY_TYPE.filtered
  }

  return CACHE_TTL_BY_TYPE.search
}

// 移除舊的固定 TTL 常數（已由動態 TTL 系統取代）
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
 * 設定市場刊登列表快取（使用動態 TTL）
 *
 * @param cacheKey - Redis key
 * @param data - 要快取的資料
 * @param options - TTL 選項（根據搜尋類型調整 TTL）
 *
 * @example
 * ```typescript
 * // 熱門商品（30 分鐘 TTL）
 * await setCachedMarketListings('market:trending', data, { isTrending: true })
 *
 * // 精確搜尋（5 分鐘 TTL）
 * await setCachedMarketListings('market:filtered', data, { hasFilters: true })
 *
 * // 一般搜尋（15 分鐘 TTL）
 * await setCachedMarketListings('market:search', data)
 * ```
 */
export async function setCachedMarketListings(
  cacheKey: string,
  data: unknown,
  options?: CacheTTLOptions
) {
  try {
    // 根據搜尋類型獲取適當的 TTL
    const ttl = getCacheTTL(options || {})

    // 簡化快取策略：僅設定 key + TTL，依賴 Redis 自動過期
    // 移除 ZSET 追蹤和清理邏輯，減少 Redis 命令使用
    await redis.set(cacheKey, JSON.stringify(data), { ex: ttl })

    // 記錄快取類型（用於監控）
    const cacheType = options?.isTrending
      ? 'trending'
      : options?.hasFilters
      ? 'filtered'
      : 'search'

    apiLogger.debug('Market listings cached', {
      cacheKey,
      ttl,
      type: cacheType
    })
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
