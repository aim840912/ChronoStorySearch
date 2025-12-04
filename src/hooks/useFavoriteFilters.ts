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
  const uniqueFavoriteItems = useMemo(() => {
    if (filterMode !== 'favorite-items' || favoriteItems.length === 0) return []

    const favItemIds = new Set(favoriteItems.map((fav) => fav.itemId))
    const itemMap = new Map<number, UniqueItem>()

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

    // 處理純轉蛋物品（不在 allDrops 中的收藏物品）
    gachaMachines.forEach((machine) => {
      machine.items.forEach((gachaItem) => {
        const itemId = gachaItem.itemId
        // 只處理已收藏且不在 itemMap 中的物品（純轉蛋物品）
        if (favItemIds.has(itemId) && !itemMap.has(itemId)) {
          itemMap.set(itemId, {
            itemId: itemId,
            itemName: gachaItem.name || gachaItem.itemName || '',
            chineseItemName: gachaItem.chineseName || null,
            monsterCount: 0, // 純轉蛋物品沒有怪物掉落
          })
        }
      })
    })

    return Array.from(itemMap.values())
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
