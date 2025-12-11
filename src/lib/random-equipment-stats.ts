/**
 * 隨機裝備屬性計算系統
 *
 * 根據 Random Equipment Stats.md 的公式計算裝備的隨機屬性
 *
 * 公式說明：
 * - Range = Req Lv / 10
 * - Overall 的 Range × 2
 * - 每個屬性 = 基礎值 + Range × 倍率 × ROLL(-1,0,1) × RNG
 *
 * 倍率規則：
 * - STR, DEX, INT, LUK = Range / 主要屬性數量
 * - WATK, MATK = Range × 0.5
 * - ACC, AVOID = Range
 * - Speed = Range × 0.5
 * - Jump = Range × 0.25
 * - HP, MP, WDEF, MDEF = Range × 5
 */

import { ItemAttributes, ItemEquipmentStats, RandomEquipmentStats } from '@/types'
import { calculateEquipmentStatRange } from './equipment-stats-utils'

/**
 * 生成隨機 ROLL 值（-1, 0, 1）
 */
function randomRoll(): -1 | 0 | 1 {
  const roll = Math.floor(Math.random() * 3)
  return (roll - 1) as -1 | 0 | 1
}

/**
 * 生成隨機 RNG 值（0.000001 ~ 1.0）
 */
function randomRNG(): number {
  return (Math.floor(Math.random() * 1000000) + 1) / 1000000
}

/**
 * 計算單個屬性的隨機變化
 * @param baseValue 基礎值
 * @param range 浮動範圍
 * @param multiplier 倍率
 * @returns 計算後的屬性值（四捨五入到整數，最小為 0）
 */
function calculateStatVariation(
  baseValue: number,
  range: number,
  multiplier: number
): number {
  const roll = randomRoll()
  const rng = randomRNG()
  const variation = range * multiplier * roll * rng
  const result = baseValue + variation

  // 確保屬性值不會低於 0
  return Math.max(0, Math.round(result))
}

/**
 * 計算裝備的主要屬性數量（有值的 STR/DEX/INT/LUK）
 */
function countMainStats(stats: ItemEquipmentStats): number {
  let count = 0
  if (stats.str !== null && stats.str !== 0) count++
  if (stats.dex !== null && stats.dex !== 0) count++
  if (stats.int !== null && stats.int !== 0) count++
  if (stats.luk !== null && stats.luk !== 0) count++
  return count > 0 ? count : 1 // 至少為 1 避免除以 0
}

/**
 * 判斷物品是否有有效的裝備資料
 */
function hasEquipment(
  item: unknown
): item is { equipment: { category: string; requirements: { req_level?: number | null; reqLevel?: number | null }; stats: ItemEquipmentStats } } {
  const potentialItem = item as { equipment?: unknown }
  if (!potentialItem.equipment || typeof potentialItem.equipment !== 'object') {
    return false
  }

  const equipment = potentialItem.equipment as { category?: unknown; requirements?: unknown; stats?: unknown }
  return (
    typeof equipment.category === 'string' &&
    equipment.requirements !== null && equipment.requirements !== undefined &&
    equipment.stats !== null && equipment.stats !== undefined
  )
}

/**
 * 計算裝備的隨機屬性
 * @param item 物品屬性資料（支援 ItemAttributes 或 GachaItem）
 * @returns 隨機計算後的屬性，如果不是裝備則返回 null
 */
export function calculateRandomStats(item: unknown): RandomEquipmentStats | null {
  // 只處理裝備類物品
  if (!hasEquipment(item)) {
    return null
  }

  const { equipment } = item
  const { requirements, stats, category } = equipment

  // 獲取需求等級（支援兩種命名方式：req_level 或 reqLevel）
  const reqLevel = requirements.req_level ?? requirements.reqLevel ?? 0

  // 計算 Range（使用共用函數，已處理 Overall × 2）
  const range = calculateEquipmentStatRange(reqLevel, category)
  if (range === 0) {
    return null // 沒有等級需求的裝備不計算隨機屬性
  }

  // 計算主要屬性數量（用於 STR/DEX/INT/LUK 的倍率）
  const mainStatCount = countMainStats(stats)

  // 計算隨機屬性結果
  const randomStats: RandomEquipmentStats = {}

  // STR, DEX, INT, LUK - Range 平均分配
  const mainStatMultiplier = 1 / mainStatCount

  if (stats.str !== null && stats.str !== 0) {
    randomStats.str = calculateStatVariation(stats.str, range, mainStatMultiplier)
  }

  if (stats.dex !== null && stats.dex !== 0) {
    randomStats.dex = calculateStatVariation(stats.dex, range, mainStatMultiplier)
  }

  if (stats.int !== null && stats.int !== 0) {
    randomStats.int = calculateStatVariation(stats.int, range, mainStatMultiplier)
  }

  if (stats.luk !== null && stats.luk !== 0) {
    randomStats.luk = calculateStatVariation(stats.luk, range, mainStatMultiplier)
  }

  // WATK, MATK - Range × 0.5
  if (stats.watk !== null && stats.watk !== 0) {
    randomStats.watk = calculateStatVariation(stats.watk, range, 0.5)
  }

  if (stats.matk !== null && stats.matk !== 0) {
    randomStats.matk = calculateStatVariation(stats.matk, range, 0.5)
  }

  // ACC (accuracy), AVOID (avoidability) - Range × 1
  if (stats.accuracy !== null && stats.accuracy !== 0) {
    randomStats.accuracy = calculateStatVariation(stats.accuracy, range, 1)
  }

  if (stats.avoidability !== null && stats.avoidability !== 0) {
    randomStats.avoidability = calculateStatVariation(stats.avoidability, range, 1)
  }

  // Speed - Range × 0.5
  if (stats.speed !== null && stats.speed !== 0) {
    randomStats.speed = calculateStatVariation(stats.speed, range, 0.5)
  }

  // Jump - Range × 0.25
  if (stats.jump !== null && stats.jump !== 0) {
    randomStats.jump = calculateStatVariation(stats.jump, range, 0.25)
  }

  // HP, MP, WDEF, MDEF - Range × 5
  if (stats.hp !== null && stats.hp !== 0) {
    randomStats.hp = calculateStatVariation(stats.hp, range, 5)
  }

  if (stats.mp !== null && stats.mp !== 0) {
    randomStats.mp = calculateStatVariation(stats.mp, range, 5)
  }

  if (stats.wdef !== null && stats.wdef !== 0) {
    randomStats.wdef = calculateStatVariation(stats.wdef, range, 5)
  }

  if (stats.mdef !== null && stats.mdef !== 0) {
    randomStats.mdef = calculateStatVariation(stats.mdef, range, 5)
  }

  // 保留固定屬性（不參與隨機計算）
  if (stats.attack_speed !== null && stats.attack_speed !== 0) {
    randomStats.attack_speed = stats.attack_speed
  }

  if (stats.upgrades !== null && stats.upgrades !== 0) {
    randomStats.upgrades = stats.upgrades
  }

  return randomStats
}

/**
 * 批次計算多個裝備的隨機屬性
 * @param items 物品列表
 * @returns 每個物品對應的隨機屬性（Map: itemId -> RandomEquipmentStats）
 */
export function calculateBatchRandomStats(
  items: ItemAttributes[]
): Map<string, RandomEquipmentStats> {
  const results = new Map<string, RandomEquipmentStats>()

  for (const item of items) {
    const randomStats = calculateRandomStats(item)
    if (randomStats) {
      results.set(item.item_id, randomStats)
    }
  }

  return results
}
