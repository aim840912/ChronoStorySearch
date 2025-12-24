'use client'

/**
 * 最愛篩選 Hook
 *
 * 職責：
 * - 計算去重的最愛怪物清單
 * - 計算去重的最愛物品清單
 * - 處理最愛列表的搜尋過濾
 */

import { useMemo } from 'react'
import type {
  DropsEssential,
  FilterMode,
  FavoriteMonster,
  FavoriteItem,
  GachaMachine,
} from '@/types'
import { matchesAllKeywords } from '@/lib/search-utils'

interface UseFavoriteFiltersParams {
  filterMode: FilterMode
  favoriteMonsters: FavoriteMonster[]
  favoriteItems: FavoriteItem[]
  allDrops: DropsEssential[]
  gachaMachines: GachaMachine[]
  debouncedSearchTerm: string
}

interface UniqueMonster {
  mobId: number
  mobName: string
  chineseMobName?: string | null
  dropCount: number
}

interface UniqueItem {
  itemId: number
  itemName: string
  chineseItemName?: string | null
  monsterCount: number
}

interface UseFavoriteFiltersReturn {
  uniqueFavoriteMonsters: UniqueMonster[]
  uniqueFavoriteItems: UniqueItem[]
  filteredUniqueMonsters: UniqueMonster[]
  filteredUniqueItems: UniqueItem[]
}

export function useFavoriteFilters({
  filterMode,
  favoriteMonsters,
  favoriteItems,
  allDrops,
  gachaMachines,
  debouncedSearchTerm,
}: UseFavoriteFiltersParams): UseFavoriteFiltersReturn {
  // 計算去重的最愛怪物清單（每個怪物只出現一次）
  const uniqueFavoriteMonsters = useMemo(() => {
    if (filterMode !== 'favorite-monsters' || favoriteMonsters.length === 0) return []

    const favMobIds = new Set(favoriteMonsters.map((fav) => fav.mobId))
    const monsterMap = new Map<number, UniqueMonster>()

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
  // 重要：保持 favoriteItems 的原始順序，以支援拖曳排序功能
  const uniqueFavoriteItems = useMemo(() => {
    if (filterMode !== 'favorite-items' || favoriteItems.length === 0) return []

    // 1. 先統計每個物品的怪物數量和中文名稱（不關心順序）
    const itemStatsMap = new Map<number, {
      monsterCount: number
      chineseItemName: string | null
    }>()

    allDrops.forEach((drop) => {
      if (!itemStatsMap.has(drop.itemId)) {
        // 計算獨特怪物數量
        const uniqueMonsters = new Set<number>()
        allDrops.forEach((d) => {
          if (d.itemId === drop.itemId) {
            uniqueMonsters.add(d.mobId)
          }
        })
        itemStatsMap.set(drop.itemId, {
          monsterCount: uniqueMonsters.size,
          chineseItemName: drop.chineseItemName ?? null,
        })
      }
    })

    // 2. 以 favoriteItems 順序為主，附加統計資訊
    const result: UniqueItem[] = []

    for (const fav of favoriteItems) {
      const stats = itemStatsMap.get(fav.itemId)
      if (stats) {
        // 在 allDrops 中找到的物品
        result.push({
          itemId: fav.itemId,
          itemName: fav.itemName,
          chineseItemName: stats.chineseItemName,
          monsterCount: stats.monsterCount,
        })
      } else {
        // 純轉蛋物品（不在 allDrops 中）- 從 gachaMachines 查找中文名稱
        let chineseName: string | null = null
        for (const machine of gachaMachines) {
          const gachaItem = machine.items.find(item => item.itemId === fav.itemId)
          if (gachaItem) {
            chineseName = gachaItem.chineseName ?? null
            break
          }
        }
        result.push({
          itemId: fav.itemId,
          itemName: fav.itemName,
          chineseItemName: chineseName,
          monsterCount: 0, // 純轉蛋物品沒有怪物掉落
        })
      }
    }

    return result
  }, [filterMode, favoriteItems, allDrops, gachaMachines])

  // 最愛怪物搜尋過濾（支援多關鍵字搜尋 + 中英文搜尋）
  const filteredUniqueMonsters = useMemo(() => {
    if (filterMode !== 'favorite-monsters') return []

    if (debouncedSearchTerm.trim() === '') {
      return uniqueFavoriteMonsters
    }

    const trimmedSearch = debouncedSearchTerm.trim()
    // 檢查是否為 ID 搜尋（純數字）
    const isIdSearch = /^\d+$/.test(trimmedSearch)

    return uniqueFavoriteMonsters.filter((monster) =>
      isIdSearch
        ? monster.mobId.toString() === trimmedSearch
        : matchesAllKeywords(monster.mobName, debouncedSearchTerm) ||
          (monster.chineseMobName && matchesAllKeywords(monster.chineseMobName, debouncedSearchTerm))
    )
  }, [uniqueFavoriteMonsters, debouncedSearchTerm, filterMode])

  // 最愛物品搜尋過濾（支援多關鍵字搜尋 + 中英文搜尋）
  const filteredUniqueItems = useMemo(() => {
    if (filterMode !== 'favorite-items') return []

    if (debouncedSearchTerm.trim() === '') {
      return uniqueFavoriteItems
    }

    const trimmedSearch = debouncedSearchTerm.trim()
    // 檢查是否為 ID 搜尋（純數字）
    const isIdSearch = /^\d+$/.test(trimmedSearch)

    return uniqueFavoriteItems.filter((item) =>
      isIdSearch
        ? item.itemId.toString() === trimmedSearch
        : matchesAllKeywords(item.itemName, debouncedSearchTerm) ||
          (item.chineseItemName && matchesAllKeywords(item.chineseItemName, debouncedSearchTerm))
    )
  }, [uniqueFavoriteItems, debouncedSearchTerm, filterMode])

  return {
    uniqueFavoriteMonsters,
    uniqueFavoriteItems,
    filteredUniqueMonsters,
    filteredUniqueItems,
  }
}
