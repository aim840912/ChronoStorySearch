/**
 * 物品清單工具函數
 *
 * 職責：
 * - 從掉落資料建立物品 Map
 * - 整合轉蛋物品到物品清單
 * - 應用進階篩選到物品清單
 */

import type {
  DropsEssential,
  AdvancedFilterOptions,
  ItemAttributes,
  ItemAttributesEssential,
  GachaMachine,
  ExtendedUniqueItem,
  SearchTypeFilter,
} from '@/types'
import { matchesAllKeywords } from '@/lib/search-utils'
import {
  matchesItemCategoryFilter,
  matchesJobClassFilter,
  matchesLevelRangeFilter,
} from '@/lib/filter-utils'
import { findGachaItemAttributes } from '@/lib/gacha-utils'

// 統一的篩選資料介面（支援 Essential 和完整 Attributes）
type FilterableItem = ItemAttributes | ItemAttributesEssential

/**
 * 從掉落資料建立物品 Map
 */
export function buildItemMapFromDrops(
  filteredDrops: DropsEssential[]
): Map<number, ExtendedUniqueItem> {
  const itemMap = new Map<number, ExtendedUniqueItem>()

  // 從 filteredDrops 統計每個物品
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

  return itemMap
}

/**
 * 整合轉蛋物品到物品 Map（用於搜尋/篩選模式）
 */
export function integrateGachaItems(
  itemMap: Map<number, ExtendedUniqueItem>,
  gachaMachines: GachaMachine[],
  searchType: SearchTypeFilter,
  debouncedSearchTerm: string
): void {
  gachaMachines.forEach((machine) => {
    machine.items.forEach((gachaItem) => {
      // 如果 searchType 為 'monster'，不包含轉蛋物品
      if (searchType === 'monster') {
        return
      }

      // 如果有搜尋詞，先檢查轉蛋物品是否匹配搜尋條件
      if (debouncedSearchTerm.trim() !== '') {
        const itemName = gachaItem.name || gachaItem.itemName || ''
        const chineseItemName = gachaItem.chineseName || ''

        const matches = matchesAllKeywords(itemName, debouncedSearchTerm) ||
                       (chineseItemName && matchesAllKeywords(chineseItemName, debouncedSearchTerm))

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

/**
 * 添加隨機轉蛋物品到物品 Map
 */
export function addRandomGachaItems(
  itemMap: Map<number, ExtendedUniqueItem>,
  randomGachaItems: Array<{
    itemId: number
    name: string
    chineseName?: string
    machineId: number
    machineName: string
    chineseMachineName?: string
    probability: string
  }>
): void {
  randomGachaItems.forEach((gachaItem) => {
    itemMap.set(gachaItem.itemId, {
      itemId: gachaItem.itemId,
      itemName: gachaItem.name,
      chineseItemName: gachaItem.chineseName || null,
      monsterCount: 0,
      source: {
        fromDrops: false,
        fromGacha: true,
        gachaMachines: [{
          machineId: gachaItem.machineId,
          machineName: gachaItem.machineName,
          chineseMachineName: gachaItem.chineseMachineName,
          probability: gachaItem.probability
        }]
      }
    })
  })
}

/**
 * 應用進階篩選到物品清單
 */
export function applyItemFilters(
  items: ExtendedUniqueItem[],
  searchType: SearchTypeFilter,
  advancedFilter: AdvancedFilterOptions,
  itemAttributesMap: Map<number, ItemAttributesEssential>,
  gachaMachines: GachaMachine[]
): ExtendedUniqueItem[] {
  let filtered = items

  // searchType 篩選
  if (searchType === 'gacha') {
    filtered = filtered.filter(item => item.source.fromGacha)
  }

  // 為轉蛋物品建立擴展屬性 Map
  const extendedAttributesMap: Map<number, FilterableItem> = new Map(itemAttributesMap)

  filtered.forEach(item => {
    if (!extendedAttributesMap.has(item.itemId)) {
      const gachaAttributes = findGachaItemAttributes(item.itemId, gachaMachines)
      if (gachaAttributes) {
        extendedAttributesMap.set(item.itemId, gachaAttributes)
      }
    }
  })

  // 物品類別篩選
  if (advancedFilter.enabled && advancedFilter.itemCategories.length > 0) {
    filtered = filtered.filter(item =>
      matchesItemCategoryFilter(item.itemId, extendedAttributesMap, advancedFilter)
    )
  }

  // 職業篩選
  if (advancedFilter.enabled && advancedFilter.jobClasses.length > 0) {
    filtered = filtered.filter(item =>
      matchesJobClassFilter(item.itemId, extendedAttributesMap, advancedFilter)
    )
  }

  // 等級範圍篩選
  if (advancedFilter.enabled &&
      (advancedFilter.levelRange.min !== null || advancedFilter.levelRange.max !== null)) {
    filtered = filtered.filter(item =>
      matchesLevelRangeFilter(item.itemId, extendedAttributesMap, advancedFilter)
    )
  }

  return filtered
}

/**
 * 按需求等級排序物品
 */
export function sortItemsByLevel(
  items: ExtendedUniqueItem[],
  itemAttributesMap: Map<number, ItemAttributesEssential>,
  gachaMachines: GachaMachine[]
): ExtendedUniqueItem[] {
  // 建立擴展屬性 Map（包含轉蛋物品屬性）
  const extendedAttributesMap: Map<number, FilterableItem> = new Map(itemAttributesMap)

  items.forEach(item => {
    if (!extendedAttributesMap.has(item.itemId)) {
      const gachaAttributes = findGachaItemAttributes(item.itemId, gachaMachines)
      if (gachaAttributes) {
        extendedAttributesMap.set(item.itemId, gachaAttributes)
      }
    }
  })

  return [...items].sort((a, b) => {
    const attrA = extendedAttributesMap.get(a.itemId)
    const attrB = extendedAttributesMap.get(b.itemId)

    // 支援 Essential (扁平化) 和 Attributes (嵌套) 兩種結構
    const levelA = attrA && ('req_level' in attrA)
      ? attrA.req_level
      : attrA?.equipment?.requirements?.req_level ?? null
    const levelB = attrB && ('req_level' in attrB)
      ? attrB.req_level
      : attrB?.equipment?.requirements?.req_level ?? null

    // null 值排在最後
    if (levelA === null && levelB === null) return 0
    if (levelA === null) return 1
    if (levelB === null) return -1

    return levelA - levelB
  })
}
