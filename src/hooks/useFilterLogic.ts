'use client'

import { useMemo } from 'react'
import type {
  DropItem,
  FilterMode,
  FavoriteMonster,
  FavoriteItem,
  AdvancedFilterOptions,
  ItemAttributes,
  GachaMachine,
  ExtendedUniqueItem
} from '@/types'
import { matchesAllKeywords } from '@/lib/search-utils'
import {
  applyAdvancedFilter,
  matchesItemCategoryFilter,
  matchesJobClassFilter,
  matchesLevelRangeFilter
} from '@/lib/filter-utils'
import { findGachaItemAttributes } from '@/lib/gacha-utils'
import { clientLogger } from '@/lib/logger'

interface UseFilterLogicParams {
  filterMode: FilterMode
  favoriteMonsters: FavoriteMonster[]
  favoriteItems: FavoriteItem[]
  allDrops: DropItem[]
  initialRandomDrops: DropItem[]
  debouncedSearchTerm: string // 延遲搜尋詞（已 debounce）
  advancedFilter: AdvancedFilterOptions
  itemAttributesMap: Map<number, ItemAttributes>
  gachaMachines: GachaMachine[]
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
  gachaMachines,
}: UseFilterLogicParams) {
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

  // 計算過濾後的掉落資料（只在「全部」模式計算）
  const filteredDrops = useMemo(() => {
    // 只在「全部」模式計算
    if (filterMode !== 'all') return []

    // 根據篩選模式選擇基礎資料
    // 使用 debouncedSearchTerm 確保資料來源和過濾邏輯同步
    // 當搜尋詞為空且無進階篩選時，使用隨機資料；否則使用全部資料
    const baseDrops = (debouncedSearchTerm.trim() === '' && !advancedFilter.enabled)
      ? initialRandomDrops
      : allDrops

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

    return filtered
  }, [filterMode, debouncedSearchTerm, allDrops, initialRandomDrops, advancedFilter, itemAttributesMap])

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

  // 計算「全部」模式的唯一物品清單（每個物品只出現一次，整合掉落和轉蛋）
  const uniqueAllItems = useMemo((): ExtendedUniqueItem[] => {
    if (filterMode !== 'all') return []

    const itemMap = new Map<number, ExtendedUniqueItem>()

    // 1. 從 filteredDrops 統計每個物品被多少怪物掉落
    filteredDrops.forEach((drop) => {
      if (!itemMap.has(drop.itemId)) {
        itemMap.set(drop.itemId, {
          itemId: drop.itemId,
          itemName: drop.itemName,
          chineseItemName: drop.chineseItemName,
          monsterCount: 0,
          source: {
            fromDrops: true,
            fromGacha: false,
          }
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

    // 2. 只在有搜尋或進階篩選（且不是僅怪物）時才整合轉蛋物品
    // 避免在隨機顯示模式下加入所有轉蛋物品（1306個）
    // 使用 debouncedSearchTerm 確保與資料來源同步，避免過渡期資料爆炸
    const shouldIncludeGacha =
      debouncedSearchTerm.trim() !== '' ||
      (advancedFilter.enabled &&
       (advancedFilter.dataType === 'all' ||
        advancedFilter.dataType === 'item' ||
        advancedFilter.dataType === 'gacha'))

    if (shouldIncludeGacha) {
      gachaMachines.forEach((machine) => {
      machine.items.forEach((gachaItem) => {
        // 如果有搜尋詞，先檢查轉蛋物品是否匹配搜尋條件
        if (debouncedSearchTerm.trim() !== '') {
          const itemName = gachaItem.name || gachaItem.itemName || ''
          const chineseItemName = gachaItem.chineseName || ''

          // 檢查英文或中文名稱是否匹配搜尋詞（使用與 filteredDrops 相同的邏輯）
          const matches = matchesAllKeywords(itemName, debouncedSearchTerm) ||
                         (chineseItemName && matchesAllKeywords(chineseItemName, debouncedSearchTerm))

          // 如果不匹配，跳過此物品
          if (!matches) {
            return
          }
        }

        const existing = itemMap.get(gachaItem.itemId)

        if (existing) {
          // 物品已存在（是掉落物品），合併轉蛋資訊
          existing.source.fromGacha = true
          if (!existing.source.gachaMachines) {
            existing.source.gachaMachines = []
          }
          existing.source.gachaMachines.push({
            machineId: machine.machineId,
            machineName: machine.machineName,
            chineseMachineName: machine.chineseMachineName,
            probability: gachaItem.probability
          })
        } else {
          // 純轉蛋物品（不是掉落物品）
          itemMap.set(gachaItem.itemId, {
            itemId: gachaItem.itemId,
            itemName: gachaItem.name || gachaItem.itemName || '',
            chineseItemName: gachaItem.chineseName || null,
            monsterCount: 0,
            source: {
              fromDrops: false,
              fromGacha: true,
              gachaMachines: [{
                machineId: machine.machineId,
                machineName: machine.machineName,
                chineseMachineName: machine.chineseMachineName,
                probability: gachaItem.probability
              }]
            }
          })
        }
      })
    })
    }

    // 3. 應用進階篩選到所有物品（包括轉蛋物品）
    let items = Array.from(itemMap.values())

    // a) dataType 篩選
    if (advancedFilter.enabled && advancedFilter.dataType === 'gacha') {
      // 只保留來自轉蛋機的物品
      items = items.filter(item => item.source.fromGacha)
    }

    // 3.5. 為轉蛋物品建立屬性 Map（用於後續篩選）
    // 因為轉蛋物品不在 item-attributes.json 中，需要動態生成屬性
    const extendedAttributesMap = new Map(itemAttributesMap)

    items.forEach(item => {
      if (!extendedAttributesMap.has(item.itemId)) {
        // 從轉蛋機資料生成屬性
        const gachaAttributes = findGachaItemAttributes(item.itemId, gachaMachines)
        if (gachaAttributes) {
          extendedAttributesMap.set(item.itemId, gachaAttributes)
        }
      }
    })

    // b) 物品類別篩選
    if (advancedFilter.enabled && advancedFilter.itemCategories.length > 0) {
      items = items.filter(item =>
        matchesItemCategoryFilter(item.itemId, extendedAttributesMap, advancedFilter)
      )
    }

    // c) 職業篩選
    if (advancedFilter.enabled && advancedFilter.jobClasses.length > 0) {
      items = items.filter(item =>
        matchesJobClassFilter(item.itemId, extendedAttributesMap, advancedFilter)
      )
    }

    // d) 等級範圍篩選
    if (advancedFilter.enabled &&
        (advancedFilter.levelRange.min !== null || advancedFilter.levelRange.max !== null)) {
      items = items.filter(item =>
        matchesLevelRangeFilter(item.itemId, extendedAttributesMap, advancedFilter)
      )
    }

    return items
  }, [filterMode, filteredDrops, gachaMachines, debouncedSearchTerm, advancedFilter])

  // 建立隨機混合的卡片資料（怪物 + 物品隨機排序）- 只在「全部」模式且無搜尋時使用
  const mixedCards = useMemo(() => {
    // 只在「全部」模式且無搜尋詞時計算
    // 使用 debouncedSearchTerm 確保與資料來源同步
    if (filterMode !== 'all' || debouncedSearchTerm.trim() !== '') return []

    // 定義混合卡片資料結構
    type MixedCard =
      | { type: 'monster'; data: { mobId: number; mobName: string; chineseMobName?: string | null; dropCount: number } }
      | { type: 'item'; data: ExtendedUniqueItem }

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

  // 判斷搜尋上下文 - 決定「全部」模式的顯示策略
  const hasItemMatch = useMemo(() => {
    if (filterMode !== 'all' || !debouncedSearchTerm.trim()) return false

    // 檢查 drops 中是否有物品名匹配
    const hasDropMatch = filteredDrops.some(drop =>
      matchesAllKeywords(drop.itemName, debouncedSearchTerm) ||
      (drop.chineseItemName && matchesAllKeywords(drop.chineseItemName, debouncedSearchTerm))
    )

    if (hasDropMatch) return true

    // 檢查轉蛋機中是否有物品名匹配（支援純轉蛋物品搜尋）
    const hasGachaMatch = gachaMachines.some(machine =>
      machine.items.some(item => {
        const itemName = item.name || item.itemName || ''
        const chineseItemName = item.chineseName || ''
        return matchesAllKeywords(itemName, debouncedSearchTerm) ||
               (chineseItemName && matchesAllKeywords(chineseItemName, debouncedSearchTerm))
      })
    )

    return hasGachaMatch
  }, [filterMode, debouncedSearchTerm, filteredDrops, gachaMachines])

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

    // 如果啟用進階篩選且選擇了物品專屬篩選，不顯示怪物
    if (advancedFilter.enabled) {
      const hasItemSpecificFilter =
        advancedFilter.itemCategories.length > 0 ||
        advancedFilter.jobClasses.length > 0 ||
        advancedFilter.levelRange.min !== null ||
        advancedFilter.levelRange.max !== null

      if (hasItemSpecificFilter) {
        return false  // 不顯示怪物
      }
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
