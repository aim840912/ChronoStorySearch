'use client'

import { useMemo, useEffect, useState } from 'react'
import type {
  DropItem,
  FilterMode,
  FavoriteMonster,
  FavoriteItem,
  AdvancedFilterOptions,
  ItemAttributes
} from '@/types'
import { matchesAllKeywords } from '@/lib/search-utils'
import { applyAdvancedFilter } from '@/lib/filter-utils'
import { clientLogger } from '@/lib/logger'

interface UseFilterLogicParams {
  filterMode: FilterMode
  favoriteMonsters: FavoriteMonster[]
  favoriteItems: FavoriteItem[]
  allDrops: DropItem[]
  initialRandomDrops: DropItem[]
  debouncedSearchTerm: string
  advancedFilter: AdvancedFilterOptions
  itemAttributesMap: Map<number, ItemAttributes>
}

/**
 * 篩選邏輯 Hook
 * 職責：
 * - 計算最愛怪物/物品清單
 * - 計算「全部」模式的怪物/物品清單
 * - 處理搜尋過濾
 * - 建立混合卡片資料
 */
export function useFilterLogic({
  filterMode,
  favoriteMonsters,
  favoriteItems,
  allDrops,
  initialRandomDrops,
  debouncedSearchTerm,
  advancedFilter,
  itemAttributesMap,
}: UseFilterLogicParams) {
  // 過濾後的掉落資料
  const [filteredDrops, setFilteredDrops] = useState<DropItem[]>([])

  // 計算去重的最愛怪物清單（每個怪物只出現一次）
  const uniqueFavoriteMonsters = useMemo(() => {
    if (filterMode !== 'favorite-monsters' || favoriteMonsters.length === 0) return []

    const favMobIds = new Set(favoriteMonsters.map((fav) => fav.mobId))
    const monsterMap = new Map<number, { mobId: number; mobName: string; chineseMobName?: string | null; dropCount: number }>()

    // 統計每個怪物的掉落物數量
    allDrops.forEach((drop) => {
      if (favMobIds.has(drop.mobId)) {
        if (!monsterMap.has(drop.mobId)) {
          monsterMap.set(drop.mobId, {
            mobId: drop.mobId,
            mobName: drop.mobName,
            chineseMobName: drop.chineseMobName,
            dropCount: 0,
          })
        }
        monsterMap.get(drop.mobId)!.dropCount++
      }
    })

    return Array.from(monsterMap.values())
  }, [filterMode, favoriteMonsters, allDrops])

  // 計算去重的最愛物品清單（每個物品只出現一次）
  const uniqueFavoriteItems = useMemo(() => {
    if (filterMode !== 'favorite-items' || favoriteItems.length === 0) return []

    const favItemIds = new Set(favoriteItems.map((fav) => fav.itemId))
    const itemMap = new Map<number, { itemId: number; itemName: string; chineseItemName?: string | null; monsterCount: number }>()

    // 統計每個物品被多少怪物掉落
    allDrops.forEach((drop) => {
      if (favItemIds.has(drop.itemId)) {
        if (!itemMap.has(drop.itemId)) {
          itemMap.set(drop.itemId, {
            itemId: drop.itemId,
            itemName: drop.itemName,
            chineseItemName: drop.chineseItemName,
            monsterCount: 0,
          })
        }
        // 統計獨特的怪物數量（避免重複計算同一怪物）
        const uniqueMonsters = new Set<number>()
        allDrops.forEach((d) => {
          if (d.itemId === drop.itemId) {
            uniqueMonsters.add(d.mobId)
          }
        })
        itemMap.get(drop.itemId)!.monsterCount = uniqueMonsters.size
      }
    })

    return Array.from(itemMap.values())
  }, [filterMode, favoriteItems, allDrops])

  // 最愛怪物搜尋過濾（支援多關鍵字搜尋 + 中英文搜尋）
  const filteredUniqueMonsters = useMemo(() => {
    if (filterMode !== 'favorite-monsters') return []

    if (debouncedSearchTerm.trim() === '') {
      return uniqueFavoriteMonsters
    }

    return uniqueFavoriteMonsters.filter((monster) =>
      matchesAllKeywords(monster.mobName, debouncedSearchTerm) ||
      (monster.chineseMobName && matchesAllKeywords(monster.chineseMobName, debouncedSearchTerm))
    )
  }, [uniqueFavoriteMonsters, debouncedSearchTerm, filterMode])

  // 最愛物品搜尋過濾（支援多關鍵字搜尋 + 中英文搜尋）
  const filteredUniqueItems = useMemo(() => {
    if (filterMode !== 'favorite-items') return []

    if (debouncedSearchTerm.trim() === '') {
      return uniqueFavoriteItems
    }

    return uniqueFavoriteItems.filter((item) =>
      matchesAllKeywords(item.itemName, debouncedSearchTerm) ||
      (item.chineseItemName && matchesAllKeywords(item.chineseItemName, debouncedSearchTerm))
    )
  }, [uniqueFavoriteItems, debouncedSearchTerm, filterMode])

  // 計算「全部」模式的唯一怪物清單（每個怪物只出現一次）
  const uniqueAllMonsters = useMemo(() => {
    if (filterMode !== 'all') return []

    const monsterMap = new Map<number, { mobId: number; mobName: string; chineseMobName?: string | null; dropCount: number }>()

    // 從 filteredDrops 統計每個怪物的掉落物數量
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

    return Array.from(monsterMap.values())
  }, [filterMode, filteredDrops])

  // 計算「全部」模式的唯一物品清單（每個物品只出現一次）
  const uniqueAllItems = useMemo(() => {
    if (filterMode !== 'all') return []

    const itemMap = new Map<number, { itemId: number; itemName: string; chineseItemName?: string | null; monsterCount: number }>()

    // 從 filteredDrops 統計每個物品被多少怪物掉落
    filteredDrops.forEach((drop) => {
      if (!itemMap.has(drop.itemId)) {
        itemMap.set(drop.itemId, {
          itemId: drop.itemId,
          itemName: drop.itemName,
          chineseItemName: drop.chineseItemName,
          monsterCount: 0,
        })
      }
    })

    // 計算每個物品的獨特怪物數量
    itemMap.forEach((item, itemId) => {
      const uniqueMonsters = new Set<number>()
      filteredDrops.forEach((drop) => {
        if (drop.itemId === itemId) {
          uniqueMonsters.add(drop.mobId)
        }
      })
      item.monsterCount = uniqueMonsters.size
    })

    return Array.from(itemMap.values())
  }, [filterMode, filteredDrops])

  // 建立隨機混合的卡片資料（怪物 + 物品隨機排序）- 只在「全部」模式且無搜尋時使用
  const mixedCards = useMemo(() => {
    // 只在「全部」模式且無搜尋詞時計算
    if (filterMode !== 'all' || debouncedSearchTerm.trim() !== '') return []

    // 定義混合卡片資料結構
    type MixedCard =
      | { type: 'monster'; data: { mobId: number; mobName: string; chineseMobName?: string | null; dropCount: number } }
      | { type: 'item'; data: { itemId: number; itemName: string; chineseItemName?: string | null; monsterCount: number } }

    // 根據進階篩選決定要包含哪些卡片
    const shouldIncludeMonsters = !advancedFilter.enabled ||
                                   advancedFilter.dataType === 'all' ||
                                   advancedFilter.dataType === 'monster'

    const shouldIncludeItems = !advancedFilter.enabled ||
                                advancedFilter.dataType === 'all' ||
                                advancedFilter.dataType === 'item' ||
                                advancedFilter.dataType === 'gacha'

    // 合併怪物和物品成混合陣列
    const mixed: MixedCard[] = [
      ...(shouldIncludeMonsters ? uniqueAllMonsters.map((m): MixedCard => ({ type: 'monster', data: m })) : []),
      ...(shouldIncludeItems ? uniqueAllItems.map((i): MixedCard => ({ type: 'item', data: i })) : [])
    ]

    // Fisher-Yates shuffle 演算法進行隨機排序
    for (let i = mixed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[mixed[i], mixed[j]] = [mixed[j], mixed[i]]
    }

    const monsterCount = shouldIncludeMonsters ? uniqueAllMonsters.length : 0
    const itemCount = shouldIncludeItems ? uniqueAllItems.length : 0
    clientLogger.info(`建立隨機混合卡片: ${monsterCount} 怪物 + ${itemCount} 物品 = ${mixed.length} 張卡片`)
    return mixed
  }, [filterMode, debouncedSearchTerm, uniqueAllMonsters, uniqueAllItems, advancedFilter])

  // 搜尋功能 - 即時搜尋（使用 debounced 值）+ 最愛篩選 + 進階篩選
  useEffect(() => {
    let baseDrops: DropItem[] = []

    // 根據篩選模式選擇基礎資料
    if (filterMode === 'favorite-monsters' || filterMode === 'favorite-items') {
      // 最愛模式：不使用此 effect（由 filteredUniqueMonsters/filteredUniqueItems 處理）
      return
    } else {
      // 全部模式
      // 當有搜尋詞或啟用進階篩選時，使用全部資料；否則使用隨機資料
      baseDrops = (debouncedSearchTerm.trim() === '' && !advancedFilter.enabled)
        ? initialRandomDrops
        : allDrops
    }

    // 應用搜尋過濾（支援多關鍵字搜尋 + 中英文搜尋）
    let filtered: DropItem[]
    if (debouncedSearchTerm.trim() === '') {
      filtered = baseDrops
    } else {
      filtered = baseDrops.filter((drop) => {
        return (
          matchesAllKeywords(drop.mobName, debouncedSearchTerm) ||
          matchesAllKeywords(drop.itemName, debouncedSearchTerm) ||
          (drop.chineseMobName && matchesAllKeywords(drop.chineseMobName, debouncedSearchTerm)) ||
          (drop.chineseItemName && matchesAllKeywords(drop.chineseItemName, debouncedSearchTerm))
        )
      })
    }

    // 應用進階篩選
    if (advancedFilter.enabled) {
      filtered = applyAdvancedFilter(filtered, advancedFilter, itemAttributesMap)
    }

    setFilteredDrops(filtered)
  }, [debouncedSearchTerm, allDrops, initialRandomDrops, filterMode, favoriteMonsters, advancedFilter, itemAttributesMap])

  // 判斷搜尋上下文 - 決定「全部」模式的顯示策略
  const hasItemMatch = useMemo(() => {
    if (filterMode !== 'all' || !debouncedSearchTerm.trim()) return false

    // 檢查是否有物品名匹配
    return filteredDrops.some(drop =>
      matchesAllKeywords(drop.itemName, debouncedSearchTerm) ||
      (drop.chineseItemName && matchesAllKeywords(drop.chineseItemName, debouncedSearchTerm))
    )
  }, [filterMode, debouncedSearchTerm, filteredDrops])

  // 顯示策略
  const shouldShowItems = useMemo(() => {
    if (filterMode !== 'all') return false

    // 如果啟用進階篩選且選擇了特定資料類型
    if (advancedFilter.enabled && advancedFilter.dataType !== 'all') {
      // 只在選擇 'item' 或 'gacha' 時顯示物品
      return advancedFilter.dataType === 'item' || advancedFilter.dataType === 'gacha'
    }

    // 預設邏輯：無搜尋詞時顯示，或有物品匹配時顯示
    return !debouncedSearchTerm.trim() || hasItemMatch
  }, [filterMode, advancedFilter, debouncedSearchTerm, hasItemMatch])

  const shouldShowMonsters = useMemo(() => {
    if (filterMode !== 'all') return false

    // 如果啟用進階篩選且選擇了特定資料類型
    if (advancedFilter.enabled && advancedFilter.dataType !== 'all') {
      // 只在選擇 'monster' 時顯示怪物
      return advancedFilter.dataType === 'monster'
    }

    // 預設邏輯：全部模式下總是顯示怪物
    return true
  }, [filterMode, advancedFilter])

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
