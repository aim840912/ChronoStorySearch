/**
 * localStorage 統一管理層
 * 提供類型安全的 localStorage 操作和錯誤處理
 */

import { storageLogger } from './logger'
import type { FavoriteMonster, FavoriteItem, Language, Theme } from '@/types'

// Storage keys
export const STORAGE_KEYS = {
  FAVORITE_MONSTERS: 'chronostory-favorite-monsters',
  FAVORITE_ITEMS: 'chronostory-favorite-items',
  LANGUAGE: 'chronostory-language',
  THEME: 'chronostory-theme',
} as const

/**
 * 從 localStorage 讀取資料
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === 'undefined') {
      return defaultValue
    }

    const stored = localStorage.getItem(key)
    if (!stored) {
      return defaultValue
    }

    const parsed = JSON.parse(stored) as T
    storageLogger.debug(`成功讀取 ${key}`, parsed)
    return parsed
  } catch (error) {
    storageLogger.error(`讀取 ${key} 失敗`, error)
    return defaultValue
  }
}

/**
 * 儲存資料到 localStorage
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  try {
    if (typeof window === 'undefined') {
      return false
    }

    localStorage.setItem(key, JSON.stringify(value))
    storageLogger.debug(`成功儲存 ${key}`, value)
    return true
  } catch (error) {
    storageLogger.error(`儲存 ${key} 失敗`, error)
    return false
  }
}

/**
 * 移除 localStorage 項目
 */
export function removeStorageItem(key: string): boolean {
  try {
    if (typeof window === 'undefined') {
      return false
    }

    localStorage.removeItem(key)
    storageLogger.debug(`成功移除 ${key}`)
    return true
  } catch (error) {
    storageLogger.error(`移除 ${key} 失敗`, error)
    return false
  }
}

/**
 * 清空所有專案相關的 localStorage
 */
export function clearAllStorage(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false
    }

    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })

    storageLogger.info('成功清空所有儲存')
    return true
  } catch (error) {
    storageLogger.error('清空儲存失敗', error)
    return false
  }
}

// 特定類型的 Storage 輔助函數

export function getFavoriteMonsters(): FavoriteMonster[] {
  return getStorageItem<FavoriteMonster[]>(STORAGE_KEYS.FAVORITE_MONSTERS, [])
}

export function setFavoriteMonsters(monsters: FavoriteMonster[]): boolean {
  return setStorageItem(STORAGE_KEYS.FAVORITE_MONSTERS, monsters)
}

export function getFavoriteItems(): FavoriteItem[] {
  return getStorageItem<FavoriteItem[]>(STORAGE_KEYS.FAVORITE_ITEMS, [])
}

export function setFavoriteItems(items: FavoriteItem[]): boolean {
  return setStorageItem(STORAGE_KEYS.FAVORITE_ITEMS, items)
}

export function getLanguage(): Language {
  return getStorageItem<Language>(STORAGE_KEYS.LANGUAGE, 'en')
}

export function setLanguage(language: Language): boolean {
  return setStorageItem(STORAGE_KEYS.LANGUAGE, language)
}

export function getTheme(): Theme {
  return getStorageItem<Theme>(STORAGE_KEYS.THEME, 'system')
}

export function setTheme(theme: Theme): boolean {
  return setStorageItem(STORAGE_KEYS.THEME, theme)
}
