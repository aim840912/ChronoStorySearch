/**
 * localStorage 統一管理層
 * 提供類型安全的 localStorage 操作和錯誤處理
 */

import { storageLogger } from './logger'
import type { FavoriteMonster, FavoriteItem, Language, Theme, AccuracyCalculatorState, ViewHistoryItem } from '@/types'
import type { ImageFormat } from '@/lib/image-utils'
import type { ScreenRecorderSettings } from '@/types/screen-recorder'
import type { ExpTrackerState } from '@/types/exp-tracker'

// Storage keys
export const STORAGE_KEYS = {
  FAVORITE_MONSTERS: 'chronostory-favorite-monsters',
  FAVORITE_ITEMS: 'chronostory-favorite-items',
  // Guest 版本的收藏 keys（非登入用戶使用）
  GUEST_FAVORITE_MONSTERS: 'chronostory-guest-favorite-monsters',
  GUEST_FAVORITE_ITEMS: 'chronostory-guest-favorite-items',
  LANGUAGE: 'chronostory-language',
  THEME: 'chronostory-theme',
  ACCURACY_CALCULATOR: 'chronostory-accuracy-calculator',
  VIEW_HISTORY: 'chronostory-view-history',
  IMAGE_FORMAT: 'chronostory-image-format',
  SCREEN_RECORDER: 'chronostory-screen-recorder',
  EXP_TRACKER: 'chronostory-exp-tracker',
  EXP_TRACKER_FLOATING: 'chronostory-exp-tracker-floating',
  TIPS_SHOWN: 'chronostory-tips-shown',
  // 怪物/物品屬性顯示設定（與 GlobalSettingsModal 共用）
  MONSTER_STATS_VIEW_MODE: 'monster-stats-view-mode',
  MONSTER_STATS_ORDER: 'monster-stats-order',
  MONSTER_STATS_VISIBLE: 'monster-stats-visible',
  ITEM_STATS_VIEW_MODE: 'item-stats-view-mode',
  ITEM_STATS_ORDER: 'item-stats-order',
  ITEM_STATS_VISIBLE: 'item-stats-visible',
  ITEM_STATS_SHOW_MAX_ONLY: 'item-stats-show-max-only',
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
 * 清空所有專案相關的 localStorage（包含 guest 資料）
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

/**
 * 清空登入用戶的 localStorage（保留 guest 資料）
 * 用於登出時清除用戶資料
 */
export function clearUserStorage(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false
    }

    // 只清除非 guest 的 storage keys
    const userKeys = Object.entries(STORAGE_KEYS)
      .filter(([name]) => !name.startsWith('GUEST_'))
      .map(([, value]) => value)

    userKeys.forEach((key) => {
      localStorage.removeItem(key)
    })

    storageLogger.info('成功清空用戶儲存（保留 guest 資料）')
    return true
  } catch (error) {
    storageLogger.error('清空用戶儲存失敗', error)
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

// Guest 版本的收藏函數（非登入用戶使用）
export function getGuestFavoriteMonsters(): FavoriteMonster[] {
  return getStorageItem<FavoriteMonster[]>(STORAGE_KEYS.GUEST_FAVORITE_MONSTERS, [])
}

export function setGuestFavoriteMonsters(monsters: FavoriteMonster[]): boolean {
  return setStorageItem(STORAGE_KEYS.GUEST_FAVORITE_MONSTERS, monsters)
}

export function getGuestFavoriteItems(): FavoriteItem[] {
  return getStorageItem<FavoriteItem[]>(STORAGE_KEYS.GUEST_FAVORITE_ITEMS, [])
}

export function setGuestFavoriteItems(items: FavoriteItem[]): boolean {
  return setStorageItem(STORAGE_KEYS.GUEST_FAVORITE_ITEMS, items)
}

export function getLanguage(): Language {
  return getStorageItem<Language>(STORAGE_KEYS.LANGUAGE, 'en')
}

export function setLanguage(language: Language): boolean {
  return setStorageItem(STORAGE_KEYS.LANGUAGE, language)
}

export function getTheme(): Theme {
  return getStorageItem<Theme>(STORAGE_KEYS.THEME, 'light')
}

export function setTheme(theme: Theme): boolean {
  return setStorageItem(STORAGE_KEYS.THEME, theme)
}

export function getAccuracyCalculatorState(): AccuracyCalculatorState | null {
  return getStorageItem<AccuracyCalculatorState | null>(
    STORAGE_KEYS.ACCURACY_CALCULATOR,
    null
  )
}

export function setAccuracyCalculatorState(state: AccuracyCalculatorState): boolean {
  return setStorageItem(STORAGE_KEYS.ACCURACY_CALCULATOR, state)
}

export function getViewHistory(): ViewHistoryItem[] {
  return getStorageItem<ViewHistoryItem[]>(STORAGE_KEYS.VIEW_HISTORY, [])
}

export function setViewHistory(history: ViewHistoryItem[]): boolean {
  return setStorageItem(STORAGE_KEYS.VIEW_HISTORY, history)
}

export function getImageFormat(): ImageFormat {
  return getStorageItem<ImageFormat>(STORAGE_KEYS.IMAGE_FORMAT, 'png')
}

export function setImageFormat(format: ImageFormat): boolean {
  return setStorageItem(STORAGE_KEYS.IMAGE_FORMAT, format)
}

// Screen Recorder 設定
const DEFAULT_SCREEN_RECORDER_SETTINGS: ScreenRecorderSettings = {
  duration: 2,
  includeAudio: false,
  videoFormat: 'mp4',
  recordingMode: 'fixed',
  loopDuration: 120,
}

export function getScreenRecorderSettings(): ScreenRecorderSettings {
  return getStorageItem<ScreenRecorderSettings>(
    STORAGE_KEYS.SCREEN_RECORDER,
    DEFAULT_SCREEN_RECORDER_SETTINGS
  )
}

export function setScreenRecorderSettings(settings: ScreenRecorderSettings): boolean {
  return setStorageItem(STORAGE_KEYS.SCREEN_RECORDER, settings)
}

// EXP Tracker 狀態
const DEFAULT_EXP_TRACKER_STATE: ExpTrackerState = {
  region: null,
  captureInterval: 60,
  history: [],
  savedRecords: [],
}

/**
 * 檢查區域是否為舊格式（像素座標）
 * 新格式使用 0-1 的正規化座標，舊格式使用像素座標
 */
function isLegacyRegionFormat(region: { x: number; y: number; width: number; height: number }): boolean {
  // 如果任何值大於 1，則是舊的像素座標格式
  return region.x > 1 || region.y > 1 || region.width > 1 || region.height > 1
}

export function getExpTrackerState(): ExpTrackerState {
  const state = getStorageItem<ExpTrackerState>(
    STORAGE_KEYS.EXP_TRACKER,
    DEFAULT_EXP_TRACKER_STATE
  )

  // 向下相容：如果是舊的像素座標格式，清除區域讓使用者重新選擇
  if (state.region && isLegacyRegionFormat(state.region)) {
    storageLogger.info('偵測到舊版像素座標格式，清除區域設定')
    return {
      ...state,
      region: null,
    }
  }

  return state
}

export function setExpTrackerState(state: ExpTrackerState): boolean {
  // 僅保存最近 100 筆歷史記錄
  const limitedState: ExpTrackerState = {
    ...state,
    history: state.history.slice(-100),
  }
  return setStorageItem(STORAGE_KEYS.EXP_TRACKER, limitedState)
}

// EXP Tracker 懸浮視窗狀態
export interface ExpTrackerFloatingState {
  /** 視窗位置 */
  position: { x: number; y: number }
  /** 是否最小化 */
  isMinimized: boolean
  /** 是否釘選（保持在 Modal 上層） */
  isPinned: boolean
  /** 影像預覽是否展開 */
  isVideoExpanded: boolean
  /** 視窗尺寸（展開狀態） */
  size: { width: number; height: number }
  /** 最小化時的寬度 */
  minimizedWidth: number
}

const DEFAULT_EXP_TRACKER_FLOATING_STATE: ExpTrackerFloatingState = {
  position: { x: -1, y: -1 }, // -1 表示使用預設位置（右上角）
  isMinimized: false,
  isPinned: false,
  isVideoExpanded: false,
  size: { width: 320, height: 400 },
  minimizedWidth: 180,
}

export function getExpTrackerFloatingState(): ExpTrackerFloatingState {
  return getStorageItem<ExpTrackerFloatingState>(
    STORAGE_KEYS.EXP_TRACKER_FLOATING,
    DEFAULT_EXP_TRACKER_FLOATING_STATE
  )
}

export function setExpTrackerFloatingState(state: ExpTrackerFloatingState): boolean {
  return setStorageItem(STORAGE_KEYS.EXP_TRACKER_FLOATING, state)
}

// 首次使用提示追蹤
export function getTipsShown(): string[] {
  return getStorageItem<string[]>(STORAGE_KEYS.TIPS_SHOWN, [])
}

export function hasTipBeenShown(tipId: string): boolean {
  const tipsShown = getTipsShown()
  return tipsShown.includes(tipId)
}

export function markTipAsShown(tipId: string): boolean {
  const tipsShown = getTipsShown()
  if (!tipsShown.includes(tipId)) {
    tipsShown.push(tipId)
    return setStorageItem(STORAGE_KEYS.TIPS_SHOWN, tipsShown)
  }
  return true
}

// 怪物屬性顯示設定
export function getMonsterStatsViewMode(): 'grid' | 'list' {
  return getStorageItem<'grid' | 'list'>(STORAGE_KEYS.MONSTER_STATS_VIEW_MODE, 'grid')
}

export function setMonsterStatsViewMode(mode: 'grid' | 'list'): boolean {
  return setStorageItem(STORAGE_KEYS.MONSTER_STATS_VIEW_MODE, mode)
}

export function getMonsterStatsOrder(): string[] {
  return getStorageItem<string[]>(STORAGE_KEYS.MONSTER_STATS_ORDER, [])
}

export function setMonsterStatsOrder(order: string[]): boolean {
  return setStorageItem(STORAGE_KEYS.MONSTER_STATS_ORDER, order)
}

export function getMonsterStatsVisible(): string[] {
  return getStorageItem<string[]>(STORAGE_KEYS.MONSTER_STATS_VISIBLE, [])
}

export function setMonsterStatsVisible(visible: string[]): boolean {
  return setStorageItem(STORAGE_KEYS.MONSTER_STATS_VISIBLE, visible)
}

// 物品屬性顯示設定
export function getItemStatsViewMode(): 'grid' | 'list' {
  return getStorageItem<'grid' | 'list'>(STORAGE_KEYS.ITEM_STATS_VIEW_MODE, 'grid')
}

export function setItemStatsViewMode(mode: 'grid' | 'list'): boolean {
  return setStorageItem(STORAGE_KEYS.ITEM_STATS_VIEW_MODE, mode)
}

export function getItemStatsOrder(): string[] {
  return getStorageItem<string[]>(STORAGE_KEYS.ITEM_STATS_ORDER, [])
}

export function setItemStatsOrder(order: string[]): boolean {
  return setStorageItem(STORAGE_KEYS.ITEM_STATS_ORDER, order)
}

export function getItemStatsVisible(): string[] {
  return getStorageItem<string[]>(STORAGE_KEYS.ITEM_STATS_VISIBLE, [])
}

export function setItemStatsVisible(visible: string[]): boolean {
  return setStorageItem(STORAGE_KEYS.ITEM_STATS_VISIBLE, visible)
}

export function getItemStatsShowMaxOnly(): boolean {
  return getStorageItem<boolean>(STORAGE_KEYS.ITEM_STATS_SHOW_MAX_ONLY, false)
}

export function setItemStatsShowMaxOnly(showMaxOnly: boolean): boolean {
  return setStorageItem(STORAGE_KEYS.ITEM_STATS_SHOW_MAX_ONLY, showMaxOnly)
}
