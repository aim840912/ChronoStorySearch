/**
 * User Preferences Zod Schemas
 * 用於驗證偏好設定資料的結構和類型
 *
 * 安全性目的：
 * - 防止惡意資料結構注入到 Supabase
 * - 在客戶端驗證，作為 RLS 的額外防護層
 */

import { z } from 'zod'

// ============================================
// 基礎類型 Schemas
// ============================================

export const ThemeSchema = z.enum(['light', 'dark'])
export const LanguageSchema = z.enum(['en', 'zh-TW'])
export const ImageFormatSchema = z.enum(['png', 'stand', 'hit', 'die'])
export const ViewModeSchema = z.enum(['grid', 'list'])

// ============================================
// 收藏項目 Schemas
// ============================================

export const FavoriteMonsterSchema = z.object({
  mobId: z.number().int().positive(),
  mobName: z.string(),
  addedAt: z.number().int().positive(),
})

export const FavoriteItemSchema = z.object({
  itemId: z.number().int().positive(),
  itemName: z.string(),
  addedAt: z.number().int().positive(),
})

// ============================================
// 手動經驗記錄 Schema
// ============================================

export const ManualExpRecordSchema = z.object({
  id: z.string(),
  monsterName: z.string(),
  mobId: z.number().int().positive().optional(),
  expPerHour: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

// ============================================
// 完整偏好設定 Schema
// ============================================

export const UserPreferencesSchema = z.object({
  theme: ThemeSchema,
  language: LanguageSchema,
  imageFormat: ImageFormatSchema,
  favoriteMonsters: z.array(FavoriteMonsterSchema),
  favoriteItems: z.array(FavoriteItemSchema),
  // 怪物屬性顯示設定
  monsterStatsViewMode: ViewModeSchema,
  monsterStatsOrder: z.array(z.string()),
  monsterStatsVisible: z.array(z.string()),
  // 物品屬性顯示設定
  itemStatsViewMode: ViewModeSchema,
  itemStatsOrder: z.array(z.string()),
  itemStatsVisible: z.array(z.string()),
  itemStatsShowMaxOnly: z.boolean(),
  // 掉落顯示設定
  itemSourcesViewMode: ViewModeSchema,
  monsterDropsViewMode: ViewModeSchema,
  monsterDropsShowMaxOnly: z.boolean(),
  // 手動經驗記錄
  manualExpRecords: z.array(ManualExpRecordSchema),
})

// ============================================
// 單欄位驗證 Schemas Map
// 用於 updateField() 方法的個別欄位驗證
// ============================================

export const PreferencesFieldSchemas = {
  theme: ThemeSchema,
  language: LanguageSchema,
  imageFormat: ImageFormatSchema,
  favoriteMonsters: z.array(FavoriteMonsterSchema),
  favoriteItems: z.array(FavoriteItemSchema),
  monsterStatsViewMode: ViewModeSchema,
  monsterStatsOrder: z.array(z.string()),
  monsterStatsVisible: z.array(z.string()),
  itemStatsViewMode: ViewModeSchema,
  itemStatsOrder: z.array(z.string()),
  itemStatsVisible: z.array(z.string()),
  itemStatsShowMaxOnly: z.boolean(),
  itemSourcesViewMode: ViewModeSchema,
  monsterDropsViewMode: ViewModeSchema,
  monsterDropsShowMaxOnly: z.boolean(),
  manualExpRecords: z.array(ManualExpRecordSchema),
} as const

// 型別推導
export type UserPreferencesInput = z.infer<typeof UserPreferencesSchema>
