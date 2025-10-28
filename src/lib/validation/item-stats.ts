import { z } from 'zod'
import type { ItemStats } from '@/types/item-stats'

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
 * 驗證物品屬性
 *
 * 這個函數會驗證屬性是否符合 Schema
 *
 * @param stats 物品屬性
 * @returns 驗證結果
 */
export function validateItemStats(stats: ItemStats): {
  success: boolean
  data?: ItemStats
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

  return {
    success: true,
    data: result.data,
  }
}

/**
 * 向後相容：保留舊的函數名稱
 * @deprecated 請改用 validateItemStats
 */
export function validateAndCalculateStats(stats: ItemStats): {
  success: boolean
  data?: {
    stats: ItemStats
  }
  error?: string
} {
  const result = validateItemStats(stats)

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    }
  }

  return {
    success: true,
    data: {
      stats: result.data!,
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
