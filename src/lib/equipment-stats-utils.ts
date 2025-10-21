import type { ItemAttributes, ItemEquipment } from '@/types'

/**
 * 主屬性列表（STR, DEX, INT, LUK）
 */
const PRIMARY_STATS = ['str', 'dex', 'int', 'luk'] as const
type PrimaryStat = typeof PRIMARY_STATS[number]

/**
 * 屬性組合介面
 */
export interface StatCombination {
  /** 達到最大值的屬性 */
  maxedStat: PrimaryStat
  /** 該屬性的最大加成值 */
  maxedValue: number
  /** 其他屬性的可用預算 */
  remainingBudget: number
  /** 其他屬性列表及其可能的最大值 */
  otherStats: Array<{
    stat: PrimaryStat
    maxPossible: number
    singleLimit: number
  }>
}

/**
 * 計算裝備的總屬性預算
 *
 * 根據 Random Equipment Stats.md:
 * - 基礎公式: Req Lv / 10
 * - Overall (連體服) 需要 × 2（因為取代了上衣+下裝）
 *
 * @param equipment - 裝備數據
 * @returns 總屬性預算（用於主屬性分配）
 */
export function calculateStatBudget(equipment: ItemEquipment): number {
  const reqLevel = equipment.requirements.req_level
  if (!reqLevel) return 0

  const baseRange = reqLevel / 10

  // Overall 類型的預算要 × 2
  const isOverall = equipment.category === 'Overall'
  return isOverall ? baseRange * 2 : baseRange
}

/**
 * 計算單個屬性的上限加成
 *
 * @param statVariation - 屬性變化範圍
 * @param baseStat - 基礎屬性值
 * @returns 該屬性可以增加的最大值（max - base）
 */
function calculateStatLimit(
  statVariation: { min: number | null; max: number | null } | undefined,
  baseStat: number | null
): number {
  if (!statVariation || statVariation.max === null || baseStat === null) {
    return 0
  }
  return Math.max(0, statVariation.max - baseStat)
}

/**
 * 計算裝備主屬性的最大值組合
 *
 * 當一個主屬性達到其單項上限時，計算其他屬性最多能分配多少。
 * 限制規則：
 * 1. 總預算限制：所有主屬性加成的總和 ≤ totalBudget
 * 2. 單項限制：每個屬性的加成 ≤ 該屬性的單項上限
 *
 * @param attributes - 物品完整屬性數據
 * @returns 所有可能的最大值組合，若不適用則返回 null
 */
export function calculateMaxStatCombinations(
  attributes: ItemAttributes | null
): StatCombination[] | null {
  // 檢查是否為裝備類型
  if (!attributes || !attributes.equipment) {
    return null
  }

  const { equipment } = attributes
  const { stats, stat_variation } = equipment

  // 檢查是否有 stat_variation
  if (!stat_variation) {
    return null
  }

  // 計算總預算
  const totalBudget = calculateStatBudget(equipment)
  if (totalBudget <= 0) {
    return null
  }

  // 識別有效的主屬性（有基礎值且有變化範圍）
  const validPrimaryStats = PRIMARY_STATS.filter((stat) => {
    const baseStat = stats[stat]
    const variation = stat_variation[stat]
    return (
      baseStat !== null &&
      baseStat !== undefined &&
      variation &&
      variation.max !== null &&
      variation.max > baseStat
    )
  })

  // 至少需要 2 個主屬性才有意義顯示組合
  if (validPrimaryStats.length < 2) {
    return null
  }

  // 為每個主屬性計算其上限
  const statLimits: Record<PrimaryStat, number> = {} as Record<PrimaryStat, number>
  validPrimaryStats.forEach((stat) => {
    statLimits[stat] = calculateStatLimit(stat_variation[stat], stats[stat])
  })

  // 計算所有組合
  const combinations: StatCombination[] = []

  validPrimaryStats.forEach((maxedStat) => {
    const maxedValue = statLimits[maxedStat]
    const remainingBudget = totalBudget - maxedValue

    // 如果該屬性達到上限後沒有剩餘預算，跳過
    if (remainingBudget <= 0) {
      return
    }

    // 計算其他屬性的可能最大值
    const otherStats = validPrimaryStats
      .filter((stat) => stat !== maxedStat)
      .map((stat) => ({
        stat,
        singleLimit: statLimits[stat],
        // 該屬性的最大值 = min(單項上限, 剩餘預算)，並無條件進位
        maxPossible: Math.ceil(Math.min(statLimits[stat], remainingBudget)),
      }))

    combinations.push({
      maxedStat,
      maxedValue,
      remainingBudget,
      otherStats,
    })
  })

  return combinations.length > 0 ? combinations : null
}

/**
 * 格式化屬性名稱（用於顯示）
 *
 * @param stat - 屬性鍵名
 * @returns 大寫格式的屬性名稱
 */
export function formatStatName(stat: PrimaryStat): string {
  return stat.toUpperCase()
}
