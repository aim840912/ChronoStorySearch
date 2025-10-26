import { z } from 'zod'
import type { ItemStats, StatsGrade } from '@/types/item-stats'

/**
 * 物品屬性驗證 Schema
 *
 * 驗證規則：
 * 1. 所有屬性值必須在 0-999 之間
 * 2. 實際值必須 <= 最大值
 * 3. slots 和 scrolled 必須符合邏輯（scrolled <= slots）
 * 4. notes 最大長度 500 字
 */
export const ItemStatsSchema = z
  .object({
    // ==================== 攻擊屬性 ====================
    watk: z.number().int().min(0).max(999).optional(),
    watk_max: z.number().int().min(0).max(999).optional(),
    matk: z.number().int().min(0).max(999).optional(),
    matk_max: z.number().int().min(0).max(999).optional(),

    // ==================== 防禦屬性 ====================
    wdef: z.number().int().min(0).max(999).optional(),
    wdef_max: z.number().int().min(0).max(999).optional(),
    mdef: z.number().int().min(0).max(999).optional(),
    mdef_max: z.number().int().min(0).max(999).optional(),

    // ==================== 基礎屬性 ====================
    str: z.number().int().min(0).max(999).optional(),
    str_max: z.number().int().min(0).max(999).optional(),
    dex: z.number().int().min(0).max(999).optional(),
    dex_max: z.number().int().min(0).max(999).optional(),
    int: z.number().int().min(0).max(999).optional(),
    int_max: z.number().int().min(0).max(999).optional(),
    luk: z.number().int().min(0).max(999).optional(),
    luk_max: z.number().int().min(0).max(999).optional(),

    // ==================== 生命/魔力 ====================
    hp: z.number().int().min(0).max(9999).optional(),
    hp_max: z.number().int().min(0).max(9999).optional(),
    mp: z.number().int().min(0).max(9999).optional(),
    mp_max: z.number().int().min(0).max(9999).optional(),

    // ==================== 命中/迴避 ====================
    acc: z.number().int().min(0).max(999).optional(),
    acc_max: z.number().int().min(0).max(999).optional(),
    avoid: z.number().int().min(0).max(999).optional(),
    avoid_max: z.number().int().min(0).max(999).optional(),

    // ==================== 移動/跳躍 ====================
    speed: z.number().int().min(0).max(999).optional(),
    speed_max: z.number().int().min(0).max(999).optional(),
    jump: z.number().int().min(0).max(999).optional(),
    jump_max: z.number().int().min(0).max(999).optional(),

    // ==================== 升級資訊 ====================
    slots: z.number().int().min(0).max(20).optional(),
    scrolled: z.number().int().min(0).max(20).optional(),

    // ==================== 備註 ====================
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      // 驗證：實際值必須 <= 最大值
      const checks = [
        { actual: data.watk, max: data.watk_max },
        { actual: data.matk, max: data.matk_max },
        { actual: data.wdef, max: data.wdef_max },
        { actual: data.mdef, max: data.mdef_max },
        { actual: data.str, max: data.str_max },
        { actual: data.dex, max: data.dex_max },
        { actual: data.int, max: data.int_max },
        { actual: data.luk, max: data.luk_max },
        { actual: data.hp, max: data.hp_max },
        { actual: data.mp, max: data.mp_max },
        { actual: data.acc, max: data.acc_max },
        { actual: data.avoid, max: data.avoid_max },
        { actual: data.speed, max: data.speed_max },
        { actual: data.jump, max: data.jump_max },
      ]

      return checks.every(({ actual, max }) => {
        // 如果兩者都存在，actual 必須 <= max
        if (actual !== undefined && max !== undefined) {
          return actual <= max
        }
        return true
      })
    },
    {
      message: '實際值不能大於最大值',
    }
  )
  .refine(
    (data) => {
      // 驗證：已使用次數必須 <= 總可升級次數
      if (data.scrolled !== undefined && data.slots !== undefined) {
        return data.scrolled <= data.slots
      }
      return true
    },
    {
      message: '已使用次數不能大於可升級次數',
    }
  )

/**
 * 計算物品素質等級
 *
 * 演算法：
 * 1. 收集所有有效的「實際值/最大值」比例
 * 2. 計算平均比例（0-1）
 * 3. 轉換為百分比分數（0-100）
 * 4. 根據分數區間判定等級（S/A/B/C/D/F）
 *
 * @param stats 物品屬性
 * @returns 素質等級與分數
 */
export function calculateStatsGrade(stats: ItemStats): {
  grade: StatsGrade
  score: number
} {
  // 收集所有有效的屬性比例
  const ratios: number[] = []

  const statPairs = [
    { actual: stats.watk, max: stats.watk_max },
    { actual: stats.matk, max: stats.matk_max },
    { actual: stats.wdef, max: stats.wdef_max },
    { actual: stats.mdef, max: stats.mdef_max },
    { actual: stats.str, max: stats.str_max },
    { actual: stats.dex, max: stats.dex_max },
    { actual: stats.int, max: stats.int_max },
    { actual: stats.luk, max: stats.luk_max },
    { actual: stats.hp, max: stats.hp_max },
    { actual: stats.mp, max: stats.mp_max },
    { actual: stats.acc, max: stats.acc_max },
    { actual: stats.avoid, max: stats.avoid_max },
    { actual: stats.speed, max: stats.speed_max },
    { actual: stats.jump, max: stats.jump_max },
  ]

  for (const { actual, max } of statPairs) {
    // 只計算同時有實際值和最大值的屬性
    if (actual !== undefined && max !== undefined && max > 0) {
      ratios.push(actual / max)
    }
  }

  // 如果沒有任何有效屬性，返回 F 等級
  if (ratios.length === 0) {
    return { grade: 'F', score: 0 }
  }

  // 計算平均比例
  const averageRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length

  // 轉換為百分比分數（四捨五入到整數）
  const score = Math.round(averageRatio * 100)

  // 根據分數判定等級
  let grade: StatsGrade
  if (score >= 95) {
    grade = 'S'
  } else if (score >= 85) {
    grade = 'A'
  } else if (score >= 70) {
    grade = 'B'
  } else if (score >= 50) {
    grade = 'C'
  } else if (score >= 30) {
    grade = 'D'
  } else {
    grade = 'F'
  }

  return { grade, score }
}

/**
 * 驗證並計算物品屬性
 *
 * 這個函數會：
 * 1. 驗證屬性是否符合 Schema
 * 2. 自動計算素質等級和分數
 *
 * @param stats 物品屬性
 * @returns 驗證結果和計算後的等級/分數
 */
export function validateAndCalculateStats(stats: ItemStats): {
  success: boolean
  data?: {
    stats: ItemStats
    grade: StatsGrade
    score: number
  }
  error?: string
} {
  // 驗證 Schema
  const result = ItemStatsSchema.safeParse(stats)

  if (!result.success) {
    return {
      success: false,
      error: result.error.errors.map((e) => e.message).join(', '),
    }
  }

  // 計算等級和分數
  const { grade, score } = calculateStatsGrade(result.data)

  return {
    success: true,
    data: {
      stats: result.data,
      grade,
      score,
    },
  }
}

/**
 * 刊登請求 Schema（擴充現有的 CreateListingSchema）
 *
 * 使用方式：
 * const CreateListingWithStatsSchema = CreateListingSchema.extend({
 *   item_stats: ItemStatsSchema.optional()
 * })
 */
export const CreateListingStatsExtension = {
  item_stats: ItemStatsSchema.optional(),
}

/**
 * 更新刊登請求 Schema（擴充現有的 UpdateListingSchema）
 */
export const UpdateListingStatsExtension = {
  item_stats: ItemStatsSchema.optional(),
}
