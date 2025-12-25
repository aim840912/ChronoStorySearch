import { supabase } from './client'
import type { FavoriteMonster, FavoriteItem, Language, Theme } from '@/types'
import type { ImageFormat } from '@/lib/image-utils'

/**
 * 用戶偏好設定的資料結構
 */
export interface UserPreferences {
  theme: Theme
  language: Language
  imageFormat: ImageFormat
  favoriteMonsters: FavoriteMonster[]
  favoriteItems: FavoriteItem[]
}

/**
 * Supabase 資料表的原始結構
 */
interface UserPreferencesRow {
  id: string
  user_id: string
  theme: string
  language: string
  image_format: string
  favorite_monsters: FavoriteMonster[]
  favorite_items: FavoriteItem[]
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
}

/**
 * 將資料庫 row 轉換為 UserPreferences
 */
function rowToPreferences(row: UserPreferencesRow): UserPreferences {
  return {
    theme: (row.theme as Theme) || DEFAULT_PREFERENCES.theme,
    language: (row.language as Language) || DEFAULT_PREFERENCES.language,
    imageFormat: (row.image_format as ImageFormat) || DEFAULT_PREFERENCES.imageFormat,
    favoriteMonsters: row.favorite_monsters || [],
    favoriteItems: row.favorite_items || [],
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
   * @param field 欄位名稱
   * @param value 欄位值
   */
  async updateField<K extends keyof UserPreferences>(
    field: K,
    value: UserPreferences[K]
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // 將 camelCase 轉換為 snake_case
    const fieldMap: Record<keyof UserPreferences, string> = {
      theme: 'theme',
      language: 'language',
      imageFormat: 'image_format',
      favoriteMonsters: 'favorite_monsters',
      favoriteItems: 'favorite_items',
    }

    const dbField = fieldMap[field]

    // 先檢查是否存在記錄，如果不存在則建立
    const existing = await this.get()
    if (existing === null) {
      // 建立新記錄
      const newPreferences = { ...DEFAULT_PREFERENCES, [field]: value }
      return this.upsert(newPreferences)
    }

    // 更新現有記錄
    const { error } = await supabase
      .from('user_preferences')
      .update({ [dbField]: value })
      .eq('user_id', user.id)

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
