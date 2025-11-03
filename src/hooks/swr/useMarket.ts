/**
 * SWR 版本的市場 Hooks
 *
 * 功能：
 * - 市場搜尋快取
 * - 熱門商品快取
 * - 自動去重和重新驗證
 *
 * 優化效果：
 * - 減少重複搜尋請求（dedupingInterval: 10 秒）
 * - 更好的使用者體驗（stale-while-revalidate）
 * - 配合後端 Redis 快取（15 分鐘 TTL）
 */

import useSWR from 'swr'
import { swrStrategies } from '@/lib/swr/config'

// ==================== 型別定義 ====================

export interface ListingWithUserInfo {
  id: string
  trade_type: 'sell' | 'buy' | 'exchange'
  item_id: number
  quantity: number
  price: number | null
  wanted_item_id: number | null
  wanted_quantity: number | null
  wanted_items: Array<{
    item_id: number
    quantity: number
  }>
  status: string
  view_count: number
  interest_count: number
  created_at: string
  updated_at: string
  item_stats: Record<string, number> | null
  stats_grade: string | null
  stats_score: number | null
  item: {
    itemName: string
    chineseItemName: string | null
  }
  seller: {
    discord_username: string
    reputation_score: number
  }
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface MarketSearchResponse {
  success: boolean
  data: ListingWithUserInfo[]
  pagination: PaginationInfo
  message?: string
}

export interface MarketSearchParams {
  trade_type?: string
  item_id?: number
  search_term?: string
  min_price?: number
  max_price?: number
  stats_grade?: string
  sort_by?: 'created_at' | 'price' | 'stats_score'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// ==================== Hook: 市場搜尋 ====================

/**
 * 使用 SWR 進行市場搜尋
 *
 * @param params - 搜尋參數
 * @param options - SWR 選項
 * @returns SWR 返回值 + 便利屬性
 *
 * @example
 * ```tsx
 * function MarketSearch() {
 *   const { listings, pagination, isLoading, error, mutate } = useMarketSearch({
 *     trade_type: 'sell',
 *     search_term: '勇者',
 *     page: 1,
 *     limit: 20
 *   })
 *
 *   if (isLoading) return <div>載入中...</div>
 *   if (error) return <div>錯誤</div>
 *
 *   return (
 *     <div>
 *       {listings.map(listing => (
 *         <ListingCard key={listing.id} listing={listing} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useMarketSearch(
  params: MarketSearchParams = {},
  options: { enabled?: boolean } = {}
) {
  // 建立查詢字串
  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  ).toString()

  const url = queryString ? `/api/market/search?${queryString}` : null

  const { data, error, isLoading, mutate } = useSWR<MarketSearchResponse>(
    // 如果 enabled 為 false，不發送請求
    options.enabled !== false ? url : null,
    {
      ...swrStrategies.marketSearch,
      // 快取 key 包含查詢參數，確保不同搜尋有不同快取
      revalidateOnMount: true,
    }
  )

  return {
    listings: data?.data || [],
    pagination: data?.pagination || {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
    isLoading,
    error,
    mutate,
  }
}

// ==================== Hook: 熱門商品 ====================

export interface TrendingListingResponse {
  success: boolean
  data: Array<{
    id: string
    trade_type: 'sell' | 'buy' | 'exchange'
    item_id: number
    quantity: number
    price: number | null
    wanted_item_id: number | null
    wanted_quantity: number | null
    status: string
    view_count: number
    interest_count: number
    created_at: string
    updated_at: string
    seller: {
      discord_username: string
      reputation_score: number
    }
  }>
  message?: string
}

/**
 * 使用 SWR 獲取熱門商品列表
 *
 * @returns SWR 返回值 + 便利屬性
 *
 * @example
 * ```tsx
 * function TrendingItems() {
 *   const { listings, isLoading } = useTrendingListings()
 *
 *   if (isLoading) return <div>載入中...</div>
 *
 *   return (
 *     <div>
 *       <h2>熱門商品</h2>
 *       {listings.map(listing => (
 *         <ListingCard key={listing.id} listing={listing} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useTrendingListings() {
  const { data, error, isLoading, mutate } = useSWR<TrendingListingResponse>(
    '/api/market/trending',
    swrStrategies.trending // 使用熱門商品策略（30 秒去重）
  )

  return {
    listings: data?.data || [],
    isLoading,
    error,
    mutate,
  }
}
