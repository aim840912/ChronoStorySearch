/**
 * 物品資料管理模組
 *
 * 功能：
 * - 從 drops 和 gacha 資料中提取唯一物品
 * - 提供物品搜尋功能（支援中英文）
 * - 提供 ID 查詢功能
 * - 提供物品驗證功能
 *
 * 參考：docs/architecture/交易系統/10-物品整合設計.md
 */

import type { ExtendedUniqueItem, DropsEssential, GachaMachine } from '@/types'

/**
 * 從掉落和轉蛋資料中提取唯一物品列表
 *
 * @param drops - 掉落資料
 * @param gachaMachines - 轉蛋機資料
 * @returns 唯一物品列表
 */
export function extractUniqueItems(
  drops: DropsEssential[],
  gachaMachines: GachaMachine[]
): ExtendedUniqueItem[] {
  const itemMap = new Map<number, ExtendedUniqueItem>()

  // 1. 從掉落資料中提取物品
  drops.forEach((drop) => {
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
    drops.forEach((drop) => {
      if (drop.itemId === itemId) {
        uniqueMonsters.add(drop.mobId)
      }
    })
    item.monsterCount = uniqueMonsters.size
  })

  // 2. 從轉蛋機資料中提取物品
  gachaMachines.forEach((machine) => {
    machine.items.forEach((gachaItem) => {
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
          probability: gachaItem.probability || '0%'
        })
      } else {
        // 新物品（純轉蛋物品）
        itemMap.set(gachaItem.itemId, {
          itemId: gachaItem.itemId,
          itemName: gachaItem.name || gachaItem.itemName || '',
          chineseItemName: gachaItem.chineseName,
          monsterCount: 0,
          source: {
            fromDrops: false,
            fromGacha: true,
            gachaMachines: [{
              machineId: machine.machineId,
              machineName: machine.machineName,
              chineseMachineName: machine.chineseMachineName,
              probability: gachaItem.probability || '0%'
            }]
          }
        })
      }
    })
  })

  return Array.from(itemMap.values())
}

/**
 * 搜尋物品（支援中英文）
 *
 * @param items - 物品列表
 * @param query - 搜尋關鍵字
 * @param limit - 最大返回數量（預設 10）
 * @returns 匹配的物品列表
 */
export function searchItems(
  items: ExtendedUniqueItem[],
  query: string,
  limit = 10
): ExtendedUniqueItem[] {
  if (!query || query.trim().length < 2) {
    return []
  }

  const lowerQuery = query.toLowerCase().trim()

  // 使用 filter + slice 而非 reduce 提升可讀性
  return items
    .filter((item) => {
      const itemName = item.itemName.toLowerCase()
      const chineseItemName = item.chineseItemName?.toLowerCase() || ''

      return itemName.includes(lowerQuery) || chineseItemName.includes(lowerQuery)
    })
    .slice(0, limit)
}

/**
 * 根據 ID 查詢物品
 *
 * @param items - 物品列表
 * @param itemId - 物品 ID
 * @returns 物品資料或 undefined
 */
export function getItemById(
  items: ExtendedUniqueItem[],
  itemId: number
): ExtendedUniqueItem | undefined {
  return items.find((item) => item.itemId === itemId)
}

/**
 * 驗證物品 ID 是否存在
 *
 * @param items - 物品列表
 * @param itemId - 物品 ID
 * @returns 是否存在
 */
export function validateItemId(
  items: ExtendedUniqueItem[],
  itemId: number
): boolean {
  return items.some((item) => item.itemId === itemId)
}

/**
 * 建立物品 ID 到物品的索引 Map（加速查詢）
 *
 * @param items - 物品列表
 * @returns 物品索引 Map
 */
export function createItemsMap(
  items: ExtendedUniqueItem[]
): Map<number, ExtendedUniqueItem> {
  const map = new Map<number, ExtendedUniqueItem>()
  items.forEach((item) => map.set(item.itemId, item))
  return map
}
