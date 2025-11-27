'use client'

/**
 * 篩選邏輯 Hook
 *
 * 職責：
 * - 協調各個子 Hook 和工具函數
 * - 計算過濾後的掉落資料
 * - 計算「全部」模式的怪物/物品清單
 * - 建立混合卡片資料
 */

import { useMemo } from 'react'
import type {
  DropsEssential,
  FilterMode,
  FavoriteMonster,
  FavoriteItem,
  AdvancedFilterOptions,
  ItemAttributesEssential,
  GachaMachine,
  ExtendedUniqueItem,
  SearchTypeFilter,
  MobInfo
} from '@/types'
import { matchesAllKeywords } from '@/lib/search-utils'
import {
  applyAdvancedFilter,
  matchesMonsterLevelRangeFilter,
  matchesElementWeaknessFilter
} from '@/lib/filter-utils'
import {
  buildItemMapFromDrops,
  integrateGachaItems,
  addRandomGachaItems,
  applyItemFilters,
  sortItemsByLevel,
} from '@/lib/item-list-utils'
import { useFavoriteFilters } from './useFavoriteFilters'
import { useDisplayStrategy } from './useDisplayStrategy'
import { clientLogger } from '@/lib/logger'

interface UseFilterLogicParams {
  filterMode: FilterMode
  favoriteMonsters: FavoriteMonster[]
  favoriteItems: FavoriteItem[]
  allDrops: DropsEssential[]
  initialRandomDrops: DropsEssential[]
  debouncedSearchTerm: string
  searchType: SearchTypeFilter
  advancedFilter: AdvancedFilterOptions
  itemAttributesMap: Map<number, ItemAttributesEssential>
  mobLevelMap: Map<number, number | null>
  mobInfoMap: Map<number, MobInfo>
  gachaMachines: GachaMachine[]
  initialRandomGachaItems: Array<{
    itemId: number
    name: string
    chineseName?: string
    machineId: number
    machineName: string
    chineseMachineName?: string
    probability: string
  }>
}

export function useFilterLogic({
  filterMode,
  favoriteMonsters,
  favoriteItems,
  allDrops,
  initialRandomDrops,
  debouncedSearchTerm,
  searchType,
  advancedFilter,
  itemAttributesMap,
  mobLevelMap,
  mobInfoMap,
  gachaMachines,
  initialRandomGachaItems,
}: UseFilterLogicParams) {
  // 使用最愛篩選 Hook
  const {
    uniqueFavoriteMonsters,
    uniqueFavoriteItems,
    filteredUniqueMonsters,
    filteredUniqueItems,
  } = useFavoriteFilters({
    filterMode,
    favoriteMonsters,
    favoriteItems,
    allDrops,
    gachaMachines,
    debouncedSearchTerm,
  })

  // 計算過濾後的掉落資料（只在「全部」模式計算）
  const filteredDrops = useMemo(() => {
    if (filterMode !== 'all') return []

    // 根據篩選模式選擇基礎資料
    const baseDrops = (debouncedSearchTerm.trim() === '' && !advancedFilter.enabled)
      ? initialRandomDrops
      : allDrops

    // 應用搜尋過濾
    let filtered: DropsEssential[]
    if (debouncedSearchTerm.trim() === '') {
      filtered = baseDrops
    } else {
      filtered = baseDrops.filter((drop) => {
        // 根據 searchType 決定搜尋範圍（雙向搜尋）
        if (searchType === 'monster') {
          return (
            matchesAllKeywords(drop.mobName, debouncedSearchTerm) ||
            (drop.chineseMobName && matchesAllKeywords(drop.chineseMobName, debouncedSearchTerm)) ||
            matchesAllKeywords(drop.itemName, debouncedSearchTerm) ||
            (drop.chineseItemName && matchesAllKeywords(drop.chineseItemName, debouncedSearchTerm))
          )
        } else if (searchType === 'item') {
          return (
            matchesAllKeywords(drop.itemName, debouncedSearchTerm) ||
            (drop.chineseItemName && matchesAllKeywords(drop.chineseItemName, debouncedSearchTerm)) ||
            matchesAllKeywords(drop.mobName, debouncedSearchTerm) ||
            (drop.chineseMobName && matchesAllKeywords(drop.chineseMobName, debouncedSearchTerm))
          )
        } else {
          return (
            matchesAllKeywords(drop.mobName, debouncedSearchTerm) ||
            matchesAllKeywords(drop.itemName, debouncedSearchTerm) ||
            (drop.chineseMobName && matchesAllKeywords(drop.chineseMobName, debouncedSearchTerm)) ||
            (drop.chineseItemName && matchesAllKeywords(drop.chineseItemName, debouncedSearchTerm))
          )
        }
      })
    }

    // 應用進階篩選
    if (advancedFilter.enabled) {
      filtered = applyAdvancedFilter(filtered, advancedFilter, itemAttributesMap)
    }

    return filtered
  }, [filterMode, debouncedSearchTerm, searchType, allDrops, initialRandomDrops, advancedFilter, itemAttributesMap])

  // 計算「全部」模式的唯一怪物清單
  const uniqueAllMonsters = useMemo(() => {
    if (filterMode !== 'all') return []

    const monsterMap = new Map<number, { mobId: number; mobName: string; chineseMobName?: string | null; dropCount: number }>()

    filteredDrops.forEach((drop) => {
      if (!monsterMap.has(drop.mobId)) {
        monsterMap.set(drop.mobId, {
          mobId: drop.mobId,
          mobName: drop.mobName,
          chineseMobName: drop.chineseMobName,
          dropCount: 0,
        })
      }
      monsterMap.get(drop.mobId)!.dropCount++
    })

    let monsters = Array.from(monsterMap.values())

    // 應用怪物等級範圍篩選
    if (searchType === 'monster' && advancedFilter.enabled &&
        (advancedFilter.levelRange.min !== null || advancedFilter.levelRange.max !== null)) {
      monsters = monsters.filter(monster =>
        matchesMonsterLevelRangeFilter(monster.mobId, mobLevelMap, advancedFilter)
      )
    }

    // 應用屬性弱點篩選
    if (advancedFilter.enabled && advancedFilter.elementWeaknesses.length > 0) {
      monsters = monsters.filter(monster =>
        matchesElementWeaknessFilter(monster.mobId, mobInfoMap, advancedFilter)
      )
    }

    // 按等級排序
    monsters.sort((a, b) => {
      const levelA = mobLevelMap.get(a.mobId) ?? null
      const levelB = mobLevelMap.get(b.mobId) ?? null

      if (levelA === null && levelB === null) return 0
      if (levelA === null) return 1
      if (levelB === null) return -1

      return levelA - levelB
    })

    return monsters
  }, [filterMode, filteredDrops, searchType, advancedFilter, mobLevelMap, mobInfoMap])

  // 計算「全部」模式的唯一物品清單（整合掉落和轉蛋）
  const uniqueAllItems = useMemo((): ExtendedUniqueItem[] => {
    if (filterMode !== 'all') return []

    // 1. 從掉落資料建立物品 Map
    const itemMap = buildItemMapFromDrops(filteredDrops)

    // 2. 決定是否整合轉蛋物品
    const shouldIncludeAllGacha =
      debouncedSearchTerm.trim() !== '' ||
      (advancedFilter.enabled && (
        advancedFilter.itemCategories.length > 0 ||
        advancedFilter.jobClasses.length > 0 ||
        advancedFilter.levelRange.min !== null ||
        advancedFilter.levelRange.max !== null
      ))

    if (shouldIncludeAllGacha) {
      integrateGachaItems(itemMap, gachaMachines, searchType, debouncedSearchTerm)
    } else if (searchType === 'gacha' && !advancedFilter.enabled) {
      // 無搜尋詞且選擇「轉蛋」類型：使用隨機轉蛋物品
      addRandomGachaItems(itemMap, initialRandomGachaItems)
    }

    // 3. 應用篩選
    let items = applyItemFilters(
      Array.from(itemMap.values()),
      searchType,
      advancedFilter,
      itemAttributesMap,
      gachaMachines
    )

    // 4. 排序
    items = sortItemsByLevel(items, itemAttributesMap, gachaMachines)

    return items
  }, [filterMode, filteredDrops, gachaMachines, debouncedSearchTerm, searchType, advancedFilter, itemAttributesMap, initialRandomGachaItems])

  // 使用顯示策略 Hook
  const { hasItemMatch, shouldShowItems, shouldShowMonsters } = useDisplayStrategy({
    filterMode,
    searchType,
    debouncedSearchTerm,
    advancedFilter,
    filteredDrops,
    gachaMachines,
  })

  // 建立混合卡片資料（怪物 + 物品按等級排序）
  const mixedCards = useMemo(() => {
    if (filterMode !== 'all' || debouncedSearchTerm.trim() !== '') return []

    type MixedCard =
      | { type: 'monster'; data: { mobId: number; mobName: string; chineseMobName?: string | null; dropCount: number } }
      | { type: 'item'; data: ExtendedUniqueItem }

    const includeMonsters = searchType === 'all' || searchType === 'monster'
    const includeItems = searchType === 'all' || searchType === 'item' || searchType === 'gacha'

    const mixed: MixedCard[] = [
      ...(includeMonsters ? uniqueAllMonsters.map((m): MixedCard => ({ type: 'monster', data: m })) : []),
      ...(includeItems ? uniqueAllItems.map((i): MixedCard => ({ type: 'item', data: i })) : [])
    ]

    // 按等級排序
    mixed.sort((a, b) => {
      let levelA: number | null = null
      let levelB: number | null = null

      if (a.type === 'monster') {
        levelA = mobLevelMap.get(a.data.mobId) ?? null
      } else {
        const attr = itemAttributesMap.get(a.data.itemId)
        levelA = attr?.req_level ?? null
      }

      if (b.type === 'monster') {
        levelB = mobLevelMap.get(b.data.mobId) ?? null
      } else {
        const attr = itemAttributesMap.get(b.data.itemId)
        levelB = attr?.req_level ?? null
      }

      if (levelA === null && levelB === null) return 0
      if (levelA === null) return 1
      if (levelB === null) return -1

      return levelA - levelB
    })

    const monsterCount = includeMonsters ? uniqueAllMonsters.length : 0
    const itemCount = includeItems ? uniqueAllItems.length : 0
    clientLogger.info(`建立等級排序混合卡片: ${monsterCount} 怪物 + ${itemCount} 物品 = ${mixed.length} 張卡片`)
    return mixed
  }, [filterMode, debouncedSearchTerm, searchType, uniqueAllMonsters, uniqueAllItems, mobLevelMap, itemAttributesMap])

  return {
    // 最愛模式資料
    uniqueFavoriteMonsters,
    uniqueFavoriteItems,
    filteredUniqueMonsters,
    filteredUniqueItems,

    // 全部模式資料
    uniqueAllMonsters,
    uniqueAllItems,
    mixedCards,
    filteredDrops,

    // 顯示控制
    shouldShowItems,
    shouldShowMonsters,
    hasItemMatch,
  }
}
