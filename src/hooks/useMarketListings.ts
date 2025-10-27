'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  ListingWithUserInfo,
  Pagination,
  MarketFilterOptions
} from '@/types'
import { clientLogger } from '@/lib/logger'

interface UseMarketListingsParams {
  enabled: boolean // 是否啟用（例如只在 market-listings 模式下啟用）
}

interface FetchListingsParams {
  page?: number
  filter?: MarketFilterOptions
  itemIds?: number[] // 來自進階篩選的物品 ID 列表
}

/**
 * 市場刊登資料管理 Hook
 *
 * 職責：
 * - 調用 /api/market/search API
 * - 管理刊登列表資料、分頁、載入和錯誤狀態
 * - 實作簡單的緩存策略（避免相同參數的重複請求）
 * - 提供分頁和篩選控制
 *
 * @param enabled - 是否啟用此 hook（優化性能，避免不必要的請求）
 * @returns 市場刊登資料和控制方法
 */
export function useMarketListings({
  enabled
}: UseMarketListingsParams) {
  const [listings, setListings] = useState<ListingWithUserInfo[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 用於緩存和防止重複請求
  const lastRequestRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * 建構 API 查詢參數
   */
  const buildQueryParams = useCallback((
    page: number,
    filter?: MarketFilterOptions,
    itemIds?: number[]
  ): URLSearchParams => {
    const params = new URLSearchParams()

    // 分頁
    params.append('page', page.toString())
    params.append('limit', '20')

    if (!filter) return params

    // 交易類型篩選
    if (filter.tradeTypes.length > 0) {
      // 如果選擇了多個交易類型，目前 API 可能不支援，所以只傳第一個
      // 或者需要多次請求並合併結果
      params.append('trade_type', filter.tradeTypes[0])
    }

    // 價格範圍篩選
    if (filter.priceRange.min !== null) {
      params.append('min_price', filter.priceRange.min.toString())
    }
    if (filter.priceRange.max !== null) {
      params.append('max_price', filter.priceRange.max.toString())
    }

    // 物品屬性篩選
    if (filter.itemStatsFilter.min_watk) {
      params.append('min_watk', filter.itemStatsFilter.min_watk.toString())
    }
    if (filter.itemStatsFilter.min_matk) {
      params.append('min_matk', filter.itemStatsFilter.min_matk.toString())
    }
    if (filter.itemStatsFilter.min_wdef) {
      params.append('min_wdef', filter.itemStatsFilter.min_wdef.toString())
    }
    if (filter.itemStatsFilter.stats_grade && filter.itemStatsFilter.stats_grade.length > 0) {
      params.append('stats_grade', filter.itemStatsFilter.stats_grade.join(','))
    }

    // 排序
    params.append('sort', filter.sortBy)
    params.append('order', filter.sortOrder)

    // 物品 ID 篩選（來自進階篩選）
    if (itemIds && itemIds.length > 0) {
      // 如果物品 ID 太多，可能需要調整策略
      // 這裡假設 API 支援 item_id 參數（單個）
      // 實際實作時可能需要調整
      params.append('item_id', itemIds.join(','))
    }

    return params
  }, [])

  /**
   * 獲取市場刊登列表
   */
  const fetchListings = useCallback(async ({
    page = 1,
    filter,
    itemIds
  }: FetchListingsParams = {}) => {
    if (!enabled) {
      clientLogger.info('[useMarketListings] Hook is disabled, skipping fetch')
      return
    }

    // 建構請求識別符（用於緩存比對）
    const queryParams = buildQueryParams(page, filter, itemIds)
    const requestKey = queryParams.toString()

    // 檢查是否與上次請求相同（簡單緩存）
    if (lastRequestRef.current === requestKey && listings.length > 0) {
      clientLogger.info('[useMarketListings] Using cached data for:', requestKey)
      return
    }

    // 取消上一個進行中的請求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 建立新的 AbortController
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      clientLogger.info('[useMarketListings] Fetching listings:', { page, filter, itemIds })

      const response = await fetch(
        `/api/market/search?${queryParams.toString()}`,
        {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load market listings')
      }

      setListings(data.data || [])
      setPagination(data.pagination || null)
      lastRequestRef.current = requestKey

      clientLogger.info('[useMarketListings] Listings loaded:', {
        count: data.data?.length || 0,
        pagination: data.pagination
      })
    } catch (err: any) {
      // 忽略取消的請求
      if (err.name === 'AbortError') {
        clientLogger.info('[useMarketListings] Request aborted')
        return
      }

      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError(errorMessage)
      clientLogger.error('[useMarketListings] Failed to fetch listings:', err)
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [enabled, buildQueryParams, listings.length])

  /**
   * 載入下一頁（無限滾動）
   */
  const loadMore = useCallback(async (
    filter?: MarketFilterOptions,
    itemIds?: number[]
  ) => {
    if (!pagination || pagination.page >= pagination.totalPages) {
      clientLogger.info('[useMarketListings] No more pages to load')
      return
    }

    const nextPage = pagination.page + 1
    await fetchListings({ page: nextPage, filter, itemIds })
  }, [pagination, fetchListings])

  /**
   * 跳轉到指定頁碼
   */
  const goToPage = useCallback(async (
    page: number,
    filter?: MarketFilterOptions,
    itemIds?: number[]
  ) => {
    if (page < 1 || (pagination && page > pagination.totalPages)) {
      clientLogger.warn('[useMarketListings] Invalid page number:', page)
      return
    }

    await fetchListings({ page, filter, itemIds })
  }, [pagination, fetchListings])

  /**
   * 刷新當前頁面
   */
  const refresh = useCallback(async (
    filter?: MarketFilterOptions,
    itemIds?: number[]
  ) => {
    const currentPage = pagination?.page || 1
    // 清除緩存以強制重新載入
    lastRequestRef.current = null
    await fetchListings({ page: currentPage, filter, itemIds })
  }, [pagination, fetchListings])

  /**
   * 重置狀態
   */
  const reset = useCallback(() => {
    setListings([])
    setPagination(null)
    setError(null)
    lastRequestRef.current = null
  }, [])

  // 當 hook 被禁用時重置狀態
  useEffect(() => {
    if (!enabled) {
      reset()
    }
  }, [enabled, reset])

  // 清理：取消進行中的請求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    listings,
    pagination,
    isLoading,
    error,
    fetchListings,
    loadMore,
    goToPage,
    refresh,
    reset
  }
}
