import { supabase } from './client'
import type { FavoriteMonster, FavoriteItem, Language, Theme } from '@/types'
import type { ImageFormat } from '@/lib/image-utils'
import type { ManualExpRecord } from '@/types/manual-exp-record'
import { UserPreferencesSchema, PreferencesFieldSchemas } from '@/schemas/preferences.schema'

/**
 * 用戶偏好設定的資料結構
 */
export interface UserPreferences {
  theme: Theme
  language: Language
  imageFormat: ImageFormat
  favoriteMonsters: FavoriteMonster[]
  favoriteItems: FavoriteItem[]
  // 怪物/物品屬性顯示設定
  monsterStatsViewMode: 'grid' | 'list'
  monsterStatsOrder: string[]
  monsterStatsVisible: string[]
  itemStatsViewMode: 'grid' | 'list'
  itemStatsOrder: string[]
  itemStatsVisible: string[]
  itemStatsShowMaxOnly: boolean
  // 物品掉落來源顯示設定
  itemSourcesViewMode: 'grid' | 'list'
  // 怪物掉落顯示設定
  monsterDropsViewMode: 'grid' | 'list'
  monsterDropsShowMaxOnly: boolean
  // 手動經驗記錄
  manualExpRecords: ManualExpRecord[]
}

/**
 * Supabase 資料表的原始結構（匯出供 Realtime 使用）
 */
export interface UserPreferencesRow {
  id: string
  user_id: string
  theme: string
  language: string
  image_format: string
  favorite_monsters: FavoriteMonster[]
  favorite_items: FavoriteItem[]
  // 怪物/物品屬性顯示設定（SQL DEFAULT 確保永不為 null）
  monster_stats_view_mode: string
  monster_stats_order: string[]
  monster_stats_visible: string[]
  item_stats_view_mode: string
  item_stats_order: string[]
  item_stats_visible: string[]
  item_stats_show_max_only: boolean
  // 物品掉落來源顯示設定
  item_sources_view_mode: string
  // 怪物掉落顯示設定
  monster_drops_view_mode: string
  monster_drops_show_max_only: boolean
  // 手動經驗記錄
  manual_exp_records: ManualExpRecord[]
  created_at: string
  updated_at: string
}

/**
 * 預設偏好設定
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  language: 'en',
  imageFormat: 'png',
  favoriteMonsters: [],
  favoriteItems: [],
  // 怪物/物品屬性顯示設定（空陣列表示使用元件預設值）
  monsterStatsViewMode: 'grid',
  monsterStatsOrder: [],
  monsterStatsVisible: [],
  itemStatsViewMode: 'grid',
  itemStatsOrder: [],
  itemStatsVisible: [],
  itemStatsShowMaxOnly: false,
  // 物品掉落來源顯示設定
  itemSourcesViewMode: 'grid',
  // 怪物掉落顯示設定
  monsterDropsViewMode: 'grid',
  monsterDropsShowMaxOnly: false,
  // 手動經驗記錄
  manualExpRecords: [],
}

/**
 * 將資料庫 row 轉換為 UserPreferences（匯出供 Realtime 使用）
 */
export function rowToPreferences(row: UserPreferencesRow): UserPreferences {
  return {
    theme: (row.theme as Theme) || DEFAULT_PREFERENCES.theme,
    language: (row.language as Language) || DEFAULT_PREFERENCES.language,
    imageFormat: (row.image_format as ImageFormat) || DEFAULT_PREFERENCES.imageFormat,
    favoriteMonsters: row.favorite_monsters || [],
    favoriteItems: row.favorite_items || [],
    // 怪物/物品屬性顯示設定
    monsterStatsViewMode: (row.monster_stats_view_mode as 'grid' | 'list') || DEFAULT_PREFERENCES.monsterStatsViewMode,
    monsterStatsOrder: row.monster_stats_order || [],
    monsterStatsVisible: row.monster_stats_visible || [],
    itemStatsViewMode: (row.item_stats_view_mode as 'grid' | 'list') || DEFAULT_PREFERENCES.itemStatsViewMode,
    itemStatsOrder: row.item_stats_order || [],
    itemStatsVisible: row.item_stats_visible || [],
    itemStatsShowMaxOnly: row.item_stats_show_max_only ?? DEFAULT_PREFERENCES.itemStatsShowMaxOnly,
    // 物品掉落來源顯示設定
    itemSourcesViewMode: (row.item_sources_view_mode as 'grid' | 'list') || DEFAULT_PREFERENCES.itemSourcesViewMode,
    // 怪物掉落顯示設定
    monsterDropsViewMode: (row.monster_drops_view_mode as 'grid' | 'list') || DEFAULT_PREFERENCES.monsterDropsViewMode,
    monsterDropsShowMaxOnly: row.monster_drops_show_max_only ?? DEFAULT_PREFERENCES.monsterDropsShowMaxOnly,
    // 手動經驗記錄
    manualExpRecords: row.manual_exp_records || [],
  }
}

/**
 * PreferencesService
 * 處理用戶偏好設定的雲端 CRUD 操作
 */
export const preferencesService = {
  /**
   * 取得用戶偏好設定
   * @returns UserPreferences 或 null（如果不存在）
   */
  async get(): Promise<UserPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // PGRST116: Row not found - 用戶尚未有偏好設定記錄
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('取得偏好設定失敗:', error)
      return null
    }

    return rowToPreferences(data as UserPreferencesRow)
  },

  /**
   * 建立或更新用戶偏好設定（Upsert）
   * @param preferences 完整的偏好設定
   */
  async upsert(preferences: UserPreferences): Promise<boolean> {
    // 安全驗證：在傳送到資料庫前驗證資料結構
    const parseResult = UserPreferencesSchema.safeParse(preferences)
    if (!parseResult.success) {
      console.error('偏好設定驗證失敗:', parseResult.error.issues)
      return false
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        theme: preferences.theme,
        language: preferences.language,
        image_format: preferences.imageFormat,
        favorite_monsters: preferences.favoriteMonsters,
        favorite_items: preferences.favoriteItems,
        monster_stats_view_mode: preferences.monsterStatsViewMode,
        monster_stats_order: preferences.monsterStatsOrder,
        monster_stats_visible: preferences.monsterStatsVisible,
        item_stats_view_mode: preferences.itemStatsViewMode,
        item_stats_order: preferences.itemStatsOrder,
        item_stats_visible: preferences.itemStatsVisible,
        item_stats_show_max_only: preferences.itemStatsShowMaxOnly,
        item_sources_view_mode: preferences.itemSourcesViewMode,
        monster_drops_view_mode: preferences.monsterDropsViewMode,
        monster_drops_show_max_only: preferences.monsterDropsShowMaxOnly,
        manual_exp_records: preferences.manualExpRecords,
      }, {
        onConflict: 'user_id',
      })

    if (error) {
      console.error('儲存偏好設定失敗:', error)
      return false
    }

    return true
  },

  /**
   * 更新單一欄位
   * 使用 upsert 直接處理「不存在就建立，存在就更新」，省去額外的 SELECT 請求
   *
   * @param field 欄位名稱
   * @param value 欄位值
   */
  async updateField<K extends keyof UserPreferences>(
    field: K,
    value: UserPreferences[K]
  ): Promise<boolean> {
    // 安全驗證：驗證單一欄位的值
    const schema = PreferencesFieldSchemas[field]
    const parseResult = schema.safeParse(value)
    if (!parseResult.success) {
      console.error(`欄位 ${field} 驗證失敗:`, parseResult.error.issues)
      return false
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // 將 camelCase 轉換為 snake_case
    const fieldMap: Record<keyof UserPreferences, string> = {
      theme: 'theme',
      language: 'language',
      imageFormat: 'image_format',
      favoriteMonsters: 'favorite_monsters',
      favoriteItems: 'favorite_items',
      monsterStatsViewMode: 'monster_stats_view_mode',
      monsterStatsOrder: 'monster_stats_order',
      monsterStatsVisible: 'monster_stats_visible',
      itemStatsViewMode: 'item_stats_view_mode',
      itemStatsOrder: 'item_stats_order',
      itemStatsVisible: 'item_stats_visible',
      itemStatsShowMaxOnly: 'item_stats_show_max_only',
      itemSourcesViewMode: 'item_sources_view_mode',
      monsterDropsViewMode: 'monster_drops_view_mode',
      monsterDropsShowMaxOnly: 'monster_drops_show_max_only',
      manualExpRecords: 'manual_exp_records',
    }

    const dbField = fieldMap[field]

    // 直接使用 upsert，不需要先查詢是否存在
    // - 記錄不存在時：INSERT，其他欄位使用資料庫 DEFAULT 值
    // - 記錄存在時：UPDATE 只更新該欄位
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: user.id, [dbField]: value },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error(`更新 ${field} 失敗:`, error)
      return false
    }

    return true
  },

  /**
   * 刪除用戶偏好設定
   */
  async delete(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('刪除偏好設定失敗:', error)
      return false
    }

    return true
  },
}
