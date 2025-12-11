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

import { ItemEquipmentStats, RandomEquipmentStats } from '@/types'
import { calculateEquipmentStatRange } from './equipment-stats-utils'

/**
 * 主屬性列表（用於計算 mainStatMultiplier）
 */
const MAIN_STATS = ['str', 'dex', 'int', 'luk'] as const

/**
 * 屬性配置：定義每個屬性的倍率計算方式
 * - mainStat: 使用 mainStatMultiplier（1 / 有值的主屬性數量）
 * - fixed: 使用固定倍率
 */
type StatConfig =
  | { key: keyof ItemEquipmentStats; type: 'mainStat' }
  | { key: keyof ItemEquipmentStats; type: 'fixed'; multiplier: number }

const STAT_CONFIGS: StatConfig[] = [
  // 主屬性 - Range / 主屬性數量
  { key: 'str', type: 'mainStat' },
  { key: 'dex', type: 'mainStat' },
  { key: 'int', type: 'mainStat' },
  { key: 'luk', type: 'mainStat' },
  // 攻擊力 - Range × 0.5
  { key: 'watk', type: 'fixed', multiplier: 0.5 },
  { key: 'matk', type: 'fixed', multiplier: 0.5 },
  // 命中/迴避 - Range × 1
  { key: 'accuracy', type: 'fixed', multiplier: 1 },
  { key: 'avoidability', type: 'fixed', multiplier: 1 },
  // 速度 - Range × 0.5
  { key: 'speed', type: 'fixed', multiplier: 0.5 },
  // 跳躍 - Range × 0.25
  { key: 'jump', type: 'fixed', multiplier: 0.25 },
  // HP/MP/防禦 - Range × 5
  { key: 'hp', type: 'fixed', multiplier: 5 },
  { key: 'mp', type: 'fixed', multiplier: 5 },
  { key: 'wdef', type: 'fixed', multiplier: 5 },
  { key: 'mdef', type: 'fixed', multiplier: 5 },
]

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
 */
function calculateStatVariation(baseValue: number, range: number, multiplier: number): number {
  const variation = range * multiplier * randomRoll() * randomRNG()
  return Math.max(0, Math.round(baseValue + variation))
}

/**
 * 計算裝備的主要屬性數量（有值的 STR/DEX/INT/LUK）
 */
function countMainStats(stats: ItemEquipmentStats): number {
  const count = MAIN_STATS.filter(key => stats[key] !== null && stats[key] !== 0).length
  return Math.max(count, 1) // 至少為 1 避免除以 0
}

/**
 * 檢查屬性值是否有效（非 null 且非 0）
 */
function isValidStat(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && value !== 0
}

/**
 * 判斷物品是否有有效的裝備資料
 */
function hasEquipment(
  item: unknown
): item is { equipment: { category: string; requirements: { req_level?: number | null; reqLevel?: number | null }; stats: ItemEquipmentStats } } {
  const eq = (item as { equipment?: { category?: unknown; requirements?: unknown; stats?: unknown } })?.equipment
  return !!(eq && typeof eq.category === 'string' && eq.requirements && eq.stats)
}

/**
 * 計算裝備的隨機屬性
 * @param item 物品屬性資料（支援 ItemAttributes 或 GachaItem）
 * @returns 隨機計算後的屬性，如果不是裝備則返回 null
 */
export function calculateRandomStats(item: unknown): RandomEquipmentStats | null {
  if (!hasEquipment(item)) return null

  const { equipment } = item
  const { requirements, stats, category } = equipment

  // 獲取需求等級（支援兩種命名方式）
  const reqLevel = requirements.req_level ?? requirements.reqLevel ?? 0
  const range = calculateEquipmentStatRange(reqLevel, category)
  if (range === 0) return null

  // 計算主屬性倍率
  const mainStatMultiplier = 1 / countMainStats(stats)
  const randomStats: RandomEquipmentStats = {}

  // 使用配置陣列計算所有屬性
  for (const config of STAT_CONFIGS) {
    const value = stats[config.key]
    if (isValidStat(value)) {
      const multiplier = config.type === 'mainStat' ? mainStatMultiplier : config.multiplier
      randomStats[config.key] = calculateStatVariation(value, range, multiplier)
    }
  }

  // 保留固定屬性（不參與隨機計算）
  if (isValidStat(stats.attack_speed)) randomStats.attack_speed = stats.attack_speed
  if (isValidStat(stats.upgrades)) randomStats.upgrades = stats.upgrades

  return randomStats
}

/**
 * 合併隨機屬性與原始裝備屬性
 * @param originalStats 原始裝備屬性
 * @param randomStats 隨機計算後的屬性（可選）
 * @returns 合併後的屬性（randomStats 的值會覆蓋 originalStats）
 */
export function mergeRandomStats(
  originalStats: ItemEquipmentStats,
  randomStats?: RandomEquipmentStats | null
): ItemEquipmentStats {
  if (!randomStats) return originalStats
  return { ...originalStats, ...randomStats }
}
