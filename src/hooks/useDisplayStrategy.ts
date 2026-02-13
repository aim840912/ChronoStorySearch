'use client'

/**
 * 顯示策略 Hook
 *
 * 職責：
 * - 決定是否顯示怪物列表
 * - 決定是否顯示物品列表
 * - 處理搜尋上下文判斷
 */

import { useMemo } from 'react'
import type {
  FilterMode,
  AdvancedFilterOptions,
  DropsEssential,
  GachaMachine,
  SearchTypeFilter,
  ItemIndexItem,
} from '@/types'
import { matchesAllKeywords } from '@/lib/search-utils'

interface UseDisplayStrategyParams {
  filterMode: FilterMode
  searchType: SearchTypeFilter
  debouncedSearchTerm: string
  advancedFilter: AdvancedFilterOptions
  filteredDrops: DropsEssential[]
  gachaMachines: GachaMachine[]
  itemIndexMap?: Map<number, ItemIndexItem>  // 物品索引（補充沒有掉落的物品）
}

interface UseDisplayStrategyReturn {
  /** 是否有物品匹配搜尋詞 */
  hasItemMatch: boolean
  /** 是否有怪物匹配搜尋詞 */
  hasMonsterMatch: boolean
  /** 是否應該顯示物品列表 */
  shouldShowItems: boolean
  /** 是否應該顯示怪物列表 */
  shouldShowMonsters: boolean
}

export function useDisplayStrategy({
  filterMode,
  searchType,
  debouncedSearchTerm,
  advancedFilter,
  filteredDrops,
  gachaMachines,
  itemIndexMap,
}: UseDisplayStrategyParams): UseDisplayStrategyReturn {
  // 判斷搜尋上下文 - 決定「全部」模式的顯示策略
  const hasItemMatch = useMemo(() => {
    if (filterMode !== 'all' || !debouncedSearchTerm.trim()) return false

    // 如果 searchType 是 'monster'，不匹配物品
    if (searchType === 'monster') return false

    // 檢查是否為 ID 搜尋（純數字）
    const trimmedSearch = debouncedSearchTerm.trim()
    const isIdSearch = /^\d+$/.test(trimmedSearch)

    // 檢查 drops 中是否有物品匹配（純數字時同時搜尋 ID 和名稱）
    const hasDropMatch = filteredDrops.some(drop => {
      const matchesId = isIdSearch && (
        drop.itemId.toString() === trimmedSearch || drop.mobId.toString() === trimmedSearch
      )
      const matchesName = matchesAllKeywords(drop.itemName, debouncedSearchTerm) ||
             (!!drop.chineseItemName && matchesAllKeywords(drop.chineseItemName, debouncedSearchTerm)) ||
             matchesAllKeywords(drop.mobName, debouncedSearchTerm) ||
             (!!drop.chineseMobName && matchesAllKeywords(drop.chineseMobName, debouncedSearchTerm))
      return matchesId || matchesName
    })

    if (hasDropMatch) return true

    // 檢查轉蛋機中是否有物品名匹配（純數字時同時搜尋 ID 和名稱）
    const hasGachaMatch = gachaMachines.some(machine =>
      machine.items.some(item => {
        const matchesId = isIdSearch && item.itemId.toString() === trimmedSearch
        const itemName = item.name || item.itemName || ''
        const chineseItemName = item.chineseName || ''
        const matchesName = matchesAllKeywords(itemName, debouncedSearchTerm) ||
               (chineseItemName && matchesAllKeywords(chineseItemName, debouncedSearchTerm))
        return matchesId || matchesName
      })
    )

    if (hasGachaMatch) return true

    // 檢查 item-index 中是否有物品匹配（純數字時同時搜尋 ID 和名稱）
    if (itemIndexMap) {
      for (const indexItem of itemIndexMap.values()) {
        const matchesId = isIdSearch && indexItem.itemId.toString() === trimmedSearch
        const matchesName = matchesAllKeywords(indexItem.itemName, debouncedSearchTerm) ||
            (!!indexItem.chineseItemName && matchesAllKeywords(indexItem.chineseItemName, debouncedSearchTerm))
        if (matchesId || matchesName) return true
      }
    }

    return false
  }, [filterMode, debouncedSearchTerm, searchType, filteredDrops, gachaMachines, itemIndexMap])

  // 判斷搜尋上下文 - 決定是否有怪物匹配
  const hasMonsterMatch = useMemo(() => {
    if (filterMode !== 'all' || !debouncedSearchTerm.trim()) return false

    // 如果 searchType 是 'item' 或 'gacha'，不匹配怪物
    if (searchType === 'item' || searchType === 'gacha') return false

    // 檢查是否為 ID 搜尋（純數字）
    const trimmedSearch = debouncedSearchTerm.trim()
    const isIdSearch = /^\d+$/.test(trimmedSearch)

    // 檢查 drops 中是否有怪物匹配（純數字時同時搜尋 ID 和名稱）
    return filteredDrops.some(drop => {
      const matchesId = isIdSearch && (
        drop.mobId.toString() === trimmedSearch || drop.itemId.toString() === trimmedSearch
      )
      const matchesName = matchesAllKeywords(drop.mobName, debouncedSearchTerm) ||
             (!!drop.chineseMobName && matchesAllKeywords(drop.chineseMobName, debouncedSearchTerm)) ||
             matchesAllKeywords(drop.itemName, debouncedSearchTerm) ||
             (!!drop.chineseItemName && matchesAllKeywords(drop.chineseItemName, debouncedSearchTerm))
      return matchesId || matchesName
    })
  }, [filterMode, debouncedSearchTerm, searchType, filteredDrops])

  // 顯示策略 - 物品
  const shouldShowItems = useMemo(() => {
    if (filterMode !== 'all') return false

    // 如果 searchType 選擇了特定類型
    if (searchType !== 'all') {
      // 只在選擇 'item' 或 'gacha' 時顯示物品
      return searchType === 'item' || searchType === 'gacha'
    }

    // 預設邏輯：無搜尋詞時顯示，或有物品匹配時顯示
    return !debouncedSearchTerm.trim() || hasItemMatch
  }, [filterMode, searchType, debouncedSearchTerm, hasItemMatch])

  // 顯示策略 - 怪物
  const shouldShowMonsters = useMemo(() => {
    if (filterMode !== 'all') return false

    // 如果 searchType 選擇了特定類型
    if (searchType !== 'all') {
      // 只在選擇 'monster' 時顯示怪物
      return searchType === 'monster'
    }

    // 如果啟用進階篩選且選擇了物品專屬篩選，不顯示怪物
    // 但如果選擇了屬性弱點（怪物專屬篩選），則顯示怪物
    if (advancedFilter.enabled) {
      const hasMonsterSpecificFilter = advancedFilter.elementWeaknesses.length > 0

      const hasItemSpecificFilter =
        advancedFilter.itemCategories.length > 0 ||
        // 在 'all' 模式下（能執行到這裡表示 searchType === 'all'），等級範圍視為物品專屬篩選
        (advancedFilter.levelRange.min !== null || advancedFilter.levelRange.max !== null) ||
        // 攻擊速度僅適用於武器物品
        (advancedFilter.attackSpeedRange.min !== null || advancedFilter.attackSpeedRange.max !== null)

      // 如果有怪物專屬篩選，則顯示怪物（即使也有物品篩選）
      if (hasMonsterSpecificFilter) {
        return true
      }

      if (hasItemSpecificFilter) {
        return false  // 不顯示怪物
      }
    }

    // 預設邏輯：無搜尋詞時顯示，或有怪物匹配時顯示
    return !debouncedSearchTerm.trim() || hasMonsterMatch
  }, [filterMode, searchType, advancedFilter, debouncedSearchTerm, hasMonsterMatch])

  return {
    hasItemMatch,
    hasMonsterMatch,
    shouldShowItems,
    shouldShowMonsters,
  }
}
