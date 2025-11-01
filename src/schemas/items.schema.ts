/**
 * Zod Schema for Item Attributes Data
 * 用於驗證物品屬性資料的完整性
 */

import { z } from 'zod'

/**
 * 物品屬性詳細資料 Schema
 * 對應 data/item-attributes-detailed/{itemId}.json
 */
export const ItemAttributesDetailedSchema = z.object({
  item_type_id: z.number().int().optional(),
  sale_price: z.number().int().nonnegative().optional(),
  untradeable: z.boolean().nullable().optional(),

  // Equipment 相關
  equipment: z.object({
    category: z.string().optional(),
    requirements: z.object({
      reqLevel: z.number().int().nonnegative().optional(),
      reqStr: z.number().int().nonnegative().optional(),
      reqDex: z.number().int().nonnegative().optional(),
      reqInt: z.number().int().nonnegative().optional(),
      reqLuk: z.number().int().nonnegative().optional(),
      reqFam: z.number().int().nonnegative().optional().nullable(),
    }).optional(),
    classes: z.record(z.string(), z.boolean().nullable()).optional(),
    stats: z.record(z.string(), z.union([z.number(), z.string()]).nullable()).optional(),
    statVariation: z.record(
      z.string(),
      z.object({
        min: z.number(),
        max: z.number(),
      })
    ).optional(),
  }).optional(),

  // Scroll 相關
  scroll: z.object({
    category: z.string(),
    success_rate: z.number().min(0).max(100),
    destroy_rate: z.number().min(0).max(100),
    stats: z.record(z.string(), z.number().nullable()).optional(),
  }).optional(),

  // Potion 相關
  potion: z.object({
    duration: z.number().nullable(),
    stats: z.object({
      attack_speed: z.number().nullable(),
      str: z.number().nullable(),
      dex: z.number().nullable(),
      int: z.number().nullable(),
      luk: z.number().nullable(),
      watk: z.number().nullable(),
      matk: z.number().nullable(),
      accuracy: z.number().nullable(),
      avoidability: z.number().nullable(),
      speed: z.number().nullable(),
      jump: z.number().nullable(),
      hp: z.number().nullable(),
      mp: z.number().nullable(),
      wdef: z.number().nullable(),
      mdef: z.number().nullable(),
    }),
  }).optional(),
})

/**
 * 物品屬性 Essential Schema
 * 對應 data/item-attributes-essential.json
 */
export const ItemAttributesEssentialSchema = z.object({
  item_id: z.string(),
  item_name: z.string(),
  type: z.string(),
  sub_type: z.string().nullable().optional(),
  req_level: z.number().int().nonnegative().optional().nullable(),
  req_str: z.number().int().nonnegative().optional().nullable(),
  req_dex: z.number().int().nonnegative().optional().nullable(),
  req_int: z.number().int().nonnegative().optional().nullable(),
  req_luk: z.number().int().nonnegative().optional().nullable(),
  equipment_category: z.string().nullable().optional(),
  equipment_classes: z.record(z.string(), z.boolean()).nullable().optional(),
  scroll_category: z.string().nullable().optional(),
})

/**
 * 型別推導
 */
export type ItemAttributesDetailed = z.infer<typeof ItemAttributesDetailedSchema>
export type ItemAttributesEssential = z.infer<typeof ItemAttributesEssentialSchema>
