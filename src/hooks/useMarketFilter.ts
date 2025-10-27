'use client'

import { useState, useCallback, useMemo } from 'react'
import type {
  MarketFilterOptions,
  TradeType,
  AdvancedFilterOptions,
  ItemAttributesEssential
} from '@/types'
import type { StatsGrade } from '@/types/item-stats'
import {
  matchesItemCategoryFilter,
  matchesJobClassFilter,
  matchesLevelRangeFilter
} from '@/lib/filter-utils'

interface UseMarketFilterParams {
  advancedFilter: AdvancedFilterOptions
  itemAttributesMap: Map<number, ItemAttributesEssential>
}

/**
 * 市場篩選 Hook
 *
 * 職責：
 * - 管理市場篩選狀態（交易類型、價格範圍、物品屬性）
 * - 將進階篩選（類別、職業、等級）轉換為符合的物品 ID 列表
 * - 提供篩選重置和更新方法
 *
 * @param advancedFilter - 進階篩選選項（來自一般物品篩選）
 * @param itemAttributesMap - 物品屬性對照表
 * @returns 市場篩選狀態和方法
 */
export function useMarketFilter({
  advancedFilter,
  itemAttributesMap
}: UseMarketFilterParams) {

  // 市場篩選狀態
  const [marketFilter, setMarketFilter] = useState<MarketFilterOptions>({
    tradeTypes: [],
    priceRange: { min: null, max: null },
    itemStatsFilter: {},
    sortBy: 'created_at',
    sortOrder: 'desc'
  })

  /**
   * 將進階篩選轉換為符合條件的物品 ID 列表
   *
   * 邏輯：
   * 1. 遍歷所有物品屬性
   * 2. 檢查物品是否符合類別、職業、等級範圍篩選
   * 3. 返回符合條件的物品 ID 陣列
   */
  const getFilteredItemIds = useCallback((): number[] => {
    // 如果進階篩選未啟用或沒有設定任何篩選條件，返回空陣列（表示不限制）
    if (!advancedFilter.enabled) {
      return []
    }

    const hasItemCategoryFilter = advancedFilter.itemCategories.length > 0
    const hasJobClassFilter = advancedFilter.jobClasses.length > 0
    const hasLevelRangeFilter =
      advancedFilter.levelRange.min !== null ||
      advancedFilter.levelRange.max !== null

    // 如果沒有任何篩選條件，返回空陣列
    if (!hasItemCategoryFilter && !hasJobClassFilter && !hasLevelRangeFilter) {
      return []
    }

    const filteredItemIds: number[] = []

    // 遍歷所有物品
    itemAttributesMap.forEach((_itemAttr, itemId) => {
      let matches = true

      // 檢查物品類別
      if (hasItemCategoryFilter) {
        if (!matchesItemCategoryFilter(itemId, itemAttributesMap, advancedFilter)) {
          matches = false
        }
      }

      // 檢查職業
      if (matches && hasJobClassFilter) {
        if (!matchesJobClassFilter(itemId, itemAttributesMap, advancedFilter)) {
          matches = false
        }
      }

      // 檢查等級範圍
      if (matches && hasLevelRangeFilter) {
        if (!matchesLevelRangeFilter(itemId, itemAttributesMap, advancedFilter)) {
          matches = false
        }
      }

      if (matches) {
        filteredItemIds.push(itemId)
      }
    })

    return filteredItemIds
  }, [advancedFilter, itemAttributesMap])

  /**
   * 更新交易類型篩選
   */
  const setTradeTypes = useCallback((tradeTypes: TradeType[]) => {
    setMarketFilter(prev => ({ ...prev, tradeTypes }))
  }, [])

  /**
   * 更新價格範圍篩選
   */
  const setPriceRange = useCallback((min: number | null, max: number | null) => {
    setMarketFilter(prev => ({
      ...prev,
      priceRange: { min, max }
    }))
  }, [])

  /**
   * 更新物品屬性篩選
   */
  const setItemStatsFilter = useCallback((
    stats: {
      min_watk?: number
      min_matk?: number
      min_wdef?: number
      stats_grade?: StatsGrade[]
    }
  ) => {
    setMarketFilter(prev => ({
      ...prev,
      itemStatsFilter: stats
    }))
  }, [])

  /**
   * 更新排序方式
   */
  const setSorting = useCallback((
    sortBy: 'created_at' | 'price' | 'stats_score',
    sortOrder: 'asc' | 'desc'
  ) => {
    setMarketFilter(prev => ({ ...prev, sortBy, sortOrder }))
  }, [])

  /**
   * 重置所有市場篩選
   */
  const resetMarketFilter = useCallback(() => {
    setMarketFilter({
      tradeTypes: [],
      priceRange: { min: null, max: null },
      itemStatsFilter: {},
      sortBy: 'created_at',
      sortOrder: 'desc'
    })
  }, [])

  /**
   * 檢查是否有任何市場篩選條件
   */
  const hasActiveFilters = useMemo(() => {
    return (
      marketFilter.tradeTypes.length > 0 ||
      marketFilter.priceRange.min !== null ||
      marketFilter.priceRange.max !== null ||
      Object.keys(marketFilter.itemStatsFilter).length > 0
    )
  }, [marketFilter])

  return {
    marketFilter,
    setMarketFilter,
    setTradeTypes,
    setPriceRange,
    setItemStatsFilter,
    setSorting,
    resetMarketFilter,
    getFilteredItemIds,
    hasActiveFilters
  }
}
