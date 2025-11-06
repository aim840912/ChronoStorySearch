/**
 * 怪物掉落模擬系統
 *
 * 功能：
 * - 模擬怪物擊殺掉落（每個掉落物獨立判定）
 * - 生成裝備隨機屬性（如同轉蛋機）
 * - 轉換為可強化裝備格式
 *
 * 掉落機制：
 * - 每個掉落物獨立計算（Math.random() < chance）
 * - 掉落數量隨機（minQty ~ maxQty）
 * - 只處理裝備類物品（過濾掉消耗品）
 */

import type { DropItem, ItemAttributesDetailed, RandomEquipmentStats } from '@/types'
import type { DroppedEquipment } from '@/types/enhance'
import { calculateRandomStats } from '@/lib/random-equipment-stats'
import { getItemAttributesDetailed, getItemNames } from '@/lib/cache/items-cache'

/**
 * 掉落結果（包含數量）
 */
interface DropResult {
  dropItem: DropItem
  quantity: number
  itemAttributes: ItemAttributesDetailed | null
}

/**
 * 模擬怪物掉落（每個掉落物獨立判定）
 *
 * @param drops - 怪物的掉落列表
 * @returns 掉落結果列表（可能為空陣列）
 */
export function simulateMonsterDrops(drops: DropItem[]): DropResult[] {
  const results: DropResult[] = []

  for (const drop of drops) {
    // 獨立判定是否掉落
    const rolled = Math.random()
    if (rolled < drop.chance) {
      // 隨機數量（minQty ~ maxQty）
      const quantity = Math.floor(Math.random() * (drop.maxQty - drop.minQty + 1)) + drop.minQty

      // 獲取物品完整屬性（包含 equipment 物件）
      const itemAttributes = getItemAttributesDetailed(drop.itemId) ?? null

      results.push({
        dropItem: drop,
        quantity,
        itemAttributes
      })
    }
  }

  return results
}

/**
 * 過濾出裝備類掉落物
 *
 * @param dropResults - 掉落結果列表
 * @returns 只包含裝備類的掉落結果
 */
export function filterEquipmentDrops(dropResults: DropResult[]): DropResult[] {
  return dropResults.filter(result => {
    // 必須有 equipment 屬性才是裝備
    return result.itemAttributes?.equipment !== undefined
  })
}

/**
 * 將掉落物品轉換為可強化裝備（包含隨機屬性）
 *
 * @param dropResult - 掉落結果
 * @param monsterInfo - 怪物資訊 { id, name, chineseName }
 * @returns 可強化裝備或 null（如果不是裝備）
 */
export function convertDropToEnhanceableEquipment(
  dropResult: DropResult,
  monsterInfo: { id: number; name: string; chineseName: string }
): DroppedEquipment | null {
  const { dropItem, itemAttributes } = dropResult

  // 檢查是否為裝備
  if (!itemAttributes?.equipment) {
    return null
  }

  const equipment = itemAttributes.equipment
  const stats = equipment.stats

  // 計算隨機屬性（如同轉蛋機）
  const randomStats: RandomEquipmentStats | null = calculateRandomStats(itemAttributes)

  // 獲取物品名稱（中英文）
  const names = getItemNames(dropItem.itemId)

  // 轉換為可強化裝備格式
  const enhanceableEquipment: DroppedEquipment = {
    itemId: dropItem.itemId,
    itemName: names.itemName || dropItem.itemName,
    chineseName: names.chineseItemName || dropItem.chineseItemName || dropItem.itemName,
    category: equipment.category,
    originalStats: { ...stats },
    currentStats: { ...stats },
    remainingUpgrades: stats.upgrades ?? 0,
    enhanceCount: 0,
    isDestroyed: false,
    randomStats: randomStats ?? undefined,
    // 掉落來源資訊
    dropSource: 'monster',
    monsterId: monsterInfo.id,
    monsterName: monsterInfo.name,
    dropTimestamp: Date.now()
  }

  return enhanceableEquipment
}

/**
 * 完整的怪物掉落流程（模擬 → 過濾 → 轉換）
 *
 * @param drops - 怪物的掉落列表
 * @param monsterInfo - 怪物資訊
 * @returns 掉落的可強化裝備列表
 */
export function simulateAndConvertDrops(
  drops: DropItem[],
  monsterInfo: { id: number; name: string; chineseName: string }
): DroppedEquipment[] {
  // 1. 模擬掉落
  const dropResults = simulateMonsterDrops(drops)

  // 2. 過濾出裝備類
  const equipmentDrops = filterEquipmentDrops(dropResults)

  // 3. 轉換為可強化裝備
  const enhanceableEquipments = equipmentDrops
    .map(result => convertDropToEnhanceableEquipment(result, monsterInfo))
    .filter((eq): eq is DroppedEquipment => eq !== null)

  return enhanceableEquipments
}

/**
 * 獲取怪物掉落的裝備數量（不包含消耗品）
 *
 * @param drops - 怪物的掉落列表
 * @returns 裝備類掉落物的數量
 */
export function getEquipmentDropCount(drops: DropItem[]): number {
  let count = 0
  for (const drop of drops) {
    const itemAttributes = getItemAttributesDetailed(drop.itemId)
    if (itemAttributes?.equipment) {
      count++
    }
  }
  return count
}
