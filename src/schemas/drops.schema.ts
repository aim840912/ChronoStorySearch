/**
 * Zod Schema for Drops Data
 * 用於驗證掉落資料的完整性
 */

import { z } from 'zod'

/**
 * 掉落項目 Schema（Essential 版本）
 */
export const DropItemEssentialSchema = z.object({
  mobId: z.number().int().nonnegative(),
  mobName: z.string().min(1),
  chineseMobName: z.string().nullable().optional(),
  itemId: z.number().int().nonnegative(),
  itemName: z.string().min(1),
  chineseItemName: z.string().nullable().optional(),
  chance: z.number().min(0).max(1),
  minQty: z.number().int().positive(),
  maxQty: z.number().int().positive(),
})

/**
 * 掉落項目陣列 Schema
 */
export const DropItemsEssentialSchema = z.array(DropItemEssentialSchema)

/**
 * 型別推導
 */
export type DropItemEssential = z.infer<typeof DropItemEssentialSchema>
export type DropItemsEssential = z.infer<typeof DropItemsEssentialSchema>
