/**
 * localStorage 統一管理層
 * 提供類型安全的 localStorage 操作和錯誤處理
 */

import { storageLogger } from './logger'
import type { FavoriteMonster, FavoriteItem, Language, Theme, AccuracyCalculatorState, ViewHistoryItem, FilterHistoryRecord } from '@/types'
import type { ImageFormat } from '@/lib/image-utils'
import type { ScreenRecorderSettings } from '@/types/screen-recorder'
import type { ExpTrackerState } from '@/types/exp-tracker'
import type { ManualExpRecord } from '@/types/manual-exp-record'

// Storage keys
export const STORAGE_KEYS = {
  FAVORITE_MONSTERS: 'chronostory-favorite-monsters',
  FAVORITE_ITEMS: 'chronostory-favorite-items',
  // Guest 版本的 keys（保存登入前的設定，登出時恢復）
  GUEST_FAVORITE_MONSTERS: 'chronostory-guest-favorite-monsters',
  GUEST_FAVORITE_ITEMS: 'chronostory-guest-favorite-items',
  GUEST_THEME: 'chronostory-guest-theme',
  GUEST_LANGUAGE: 'chronostory-guest-language',
  GUEST_IMAGE_FORMAT: 'chronostory-guest-image-format',
  GUEST_MONSTER_STATS_VIEW_MODE: 'chronostory-guest-monster-stats-view-mode',
  GUEST_MONSTER_STATS_ORDER: 'chronostory-guest-monster-stats-order',
  GUEST_MONSTER_STATS_VISIBLE: 'chronostory-guest-monster-stats-visible',
  GUEST_ITEM_STATS_VIEW_MODE: 'chronostory-guest-item-stats-view-mode',
  GUEST_ITEM_STATS_ORDER: 'chronostory-guest-item-stats-order',
  GUEST_ITEM_STATS_VISIBLE: 'chronostory-guest-item-stats-visible',
  GUEST_ITEM_STATS_SHOW_MAX_ONLY: 'chronostory-guest-item-stats-show-max-only',
  GUEST_ITEM_SOURCES_VIEW_MODE: 'chronostory-guest-item-sources-view-mode',
  GUEST_MONSTER_DROPS_VIEW_MODE: 'chronostory-guest-monster-drops-view-mode',
  GUEST_MONSTER_DROPS_SHOW_MAX_ONLY: 'chronostory-guest-monster-drops-show-max-only',
  GUEST_MANUAL_EXP_RECORDS: 'chronostory-guest-manual-exp-records',
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
  // 物品掉落來源顯示設定（與 ItemModal 共用）
  ITEM_SOURCES_VIEW_MODE: 'item-sources-view',
  // 怪物掉落顯示設定（與 MonsterModal 共用）
  MONSTER_DROPS_VIEW_MODE: 'monster-drops-view',
  MONSTER_DROPS_SHOW_MAX_ONLY: 'monster-drops-show-max-only',
  // 進階篩選歷史紀錄
  FILTER_HISTORY: 'chronostory-filter-history',
  // 手動經驗記錄器
  MANUAL_EXP_RECORDS: 'chronostory-manual-exp-records',
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

// 進階篩選歷史紀錄
export function getFilterHistory(): FilterHistoryRecord[] {
  return getStorageItem<FilterHistoryRecord[]>(STORAGE_KEYS.FILTER_HISTORY, [])
}

export function setFilterHistory(history: FilterHistoryRecord[]): boolean {
  return setStorageItem(STORAGE_KEYS.FILTER_HISTORY, history)
}

// 物品掉落來源顯示設定
export function getItemSourcesViewMode(): 'grid' | 'list' {
  return getStorageItem<'grid' | 'list'>(STORAGE_KEYS.ITEM_SOURCES_VIEW_MODE, 'grid')
}

export function setItemSourcesViewMode(mode: 'grid' | 'list'): boolean {
  return setStorageItem(STORAGE_KEYS.ITEM_SOURCES_VIEW_MODE, mode)
}

// 怪物掉落顯示設定
export function getMonsterDropsViewMode(): 'grid' | 'list' {
  return getStorageItem<'grid' | 'list'>(STORAGE_KEYS.MONSTER_DROPS_VIEW_MODE, 'grid')
}

export function setMonsterDropsViewMode(mode: 'grid' | 'list'): boolean {
  return setStorageItem(STORAGE_KEYS.MONSTER_DROPS_VIEW_MODE, mode)
}

export function getMonsterDropsShowMaxOnly(): boolean {
  return getStorageItem<boolean>(STORAGE_KEYS.MONSTER_DROPS_SHOW_MAX_ONLY, false)
}

export function setMonsterDropsShowMaxOnly(show: boolean): boolean {
  return setStorageItem(STORAGE_KEYS.MONSTER_DROPS_SHOW_MAX_ONLY, show)
}

// ============================================================
// Guest 偏好設定保存與恢復（登入/登出時使用）
// ============================================================

/**
 * 保存當前偏好設定到 Guest keys
 * 用於登入時保存本地設定，以便登出時恢復
 */
export function saveCurrentPreferencesToGuest(): void {
  try {
    if (typeof window === 'undefined') return

    // 保存當前設定到 Guest keys
    setStorageItem(STORAGE_KEYS.GUEST_THEME, getTheme())
    setStorageItem(STORAGE_KEYS.GUEST_LANGUAGE, getLanguage())
    setStorageItem(STORAGE_KEYS.GUEST_IMAGE_FORMAT, getImageFormat())
    setStorageItem(STORAGE_KEYS.GUEST_FAVORITE_MONSTERS, getFavoriteMonsters())
    setStorageItem(STORAGE_KEYS.GUEST_FAVORITE_ITEMS, getFavoriteItems())
    setStorageItem(STORAGE_KEYS.GUEST_MONSTER_STATS_VIEW_MODE, getMonsterStatsViewMode())
    setStorageItem(STORAGE_KEYS.GUEST_MONSTER_STATS_ORDER, getMonsterStatsOrder())
    setStorageItem(STORAGE_KEYS.GUEST_MONSTER_STATS_VISIBLE, getMonsterStatsVisible())
    setStorageItem(STORAGE_KEYS.GUEST_ITEM_STATS_VIEW_MODE, getItemStatsViewMode())
    setStorageItem(STORAGE_KEYS.GUEST_ITEM_STATS_ORDER, getItemStatsOrder())
    setStorageItem(STORAGE_KEYS.GUEST_ITEM_STATS_VISIBLE, getItemStatsVisible())
    setStorageItem(STORAGE_KEYS.GUEST_ITEM_STATS_SHOW_MAX_ONLY, getItemStatsShowMaxOnly())
    setStorageItem(STORAGE_KEYS.GUEST_ITEM_SOURCES_VIEW_MODE, getItemSourcesViewMode())
    setStorageItem(STORAGE_KEYS.GUEST_MONSTER_DROPS_VIEW_MODE, getMonsterDropsViewMode())
    setStorageItem(STORAGE_KEYS.GUEST_MONSTER_DROPS_SHOW_MAX_ONLY, getMonsterDropsShowMaxOnly())
    setStorageItem(STORAGE_KEYS.GUEST_MANUAL_EXP_RECORDS, getManualExpRecords())

    storageLogger.info('已保存當前偏好設定到 Guest')
  } catch (error) {
    storageLogger.error('保存 Guest 偏好設定失敗', error)
  }
}

/**
 * 從 Guest keys 恢復偏好設定
 * 用於登出時恢復登入前的本地設定
 */
export function restorePreferencesFromGuest(): void {
  try {
    if (typeof window === 'undefined') return

    // 從 Guest keys 讀取並恢復設定
    const guestTheme = getStorageItem<Theme>(STORAGE_KEYS.GUEST_THEME, 'light')
    const guestLanguage = getStorageItem<Language>(STORAGE_KEYS.GUEST_LANGUAGE, 'en')
    const guestImageFormat = getStorageItem<ImageFormat>(STORAGE_KEYS.GUEST_IMAGE_FORMAT, 'png')
    const guestFavoriteMonsters = getStorageItem<FavoriteMonster[]>(STORAGE_KEYS.GUEST_FAVORITE_MONSTERS, [])
    const guestFavoriteItems = getStorageItem<FavoriteItem[]>(STORAGE_KEYS.GUEST_FAVORITE_ITEMS, [])
    const guestMonsterStatsViewMode = getStorageItem<'grid' | 'list'>(STORAGE_KEYS.GUEST_MONSTER_STATS_VIEW_MODE, 'grid')
    const guestMonsterStatsOrder = getStorageItem<string[]>(STORAGE_KEYS.GUEST_MONSTER_STATS_ORDER, [])
    const guestMonsterStatsVisible = getStorageItem<string[]>(STORAGE_KEYS.GUEST_MONSTER_STATS_VISIBLE, [])
    const guestItemStatsViewMode = getStorageItem<'grid' | 'list'>(STORAGE_KEYS.GUEST_ITEM_STATS_VIEW_MODE, 'grid')
    const guestItemStatsOrder = getStorageItem<string[]>(STORAGE_KEYS.GUEST_ITEM_STATS_ORDER, [])
    const guestItemStatsVisible = getStorageItem<string[]>(STORAGE_KEYS.GUEST_ITEM_STATS_VISIBLE, [])
    const guestItemStatsShowMaxOnly = getStorageItem<boolean>(STORAGE_KEYS.GUEST_ITEM_STATS_SHOW_MAX_ONLY, false)
    const guestItemSourcesViewMode = getStorageItem<'grid' | 'list'>(STORAGE_KEYS.GUEST_ITEM_SOURCES_VIEW_MODE, 'grid')
    const guestMonsterDropsViewMode = getStorageItem<'grid' | 'list'>(STORAGE_KEYS.GUEST_MONSTER_DROPS_VIEW_MODE, 'grid')
    const guestMonsterDropsShowMaxOnly = getStorageItem<boolean>(STORAGE_KEYS.GUEST_MONSTER_DROPS_SHOW_MAX_ONLY, false)
    const guestManualExpRecords = getStorageItem<ManualExpRecord[]>(STORAGE_KEYS.GUEST_MANUAL_EXP_RECORDS, [])

    // 恢復到主要的 storage keys
    setTheme(guestTheme)
    setLanguage(guestLanguage)
    setImageFormat(guestImageFormat)
    setFavoriteMonsters(guestFavoriteMonsters)
    setFavoriteItems(guestFavoriteItems)
    setMonsterStatsViewMode(guestMonsterStatsViewMode)
    setMonsterStatsOrder(guestMonsterStatsOrder)
    setMonsterStatsVisible(guestMonsterStatsVisible)
    setItemStatsViewMode(guestItemStatsViewMode)
    setItemStatsOrder(guestItemStatsOrder)
    setItemStatsVisible(guestItemStatsVisible)
    setItemStatsShowMaxOnly(guestItemStatsShowMaxOnly)
    setItemSourcesViewMode(guestItemSourcesViewMode)
    setMonsterDropsViewMode(guestMonsterDropsViewMode)
    setMonsterDropsShowMaxOnly(guestMonsterDropsShowMaxOnly)
    setManualExpRecords(guestManualExpRecords)

    storageLogger.info('已從 Guest 恢復偏好設定')
  } catch (error) {
    storageLogger.error('從 Guest 恢復偏好設定失敗', error)
  }
}

// ============================================================
// 手動經驗記錄器
// ============================================================

export function getManualExpRecords(): ManualExpRecord[] {
  return getStorageItem<ManualExpRecord[]>(STORAGE_KEYS.MANUAL_EXP_RECORDS, [])
}

export function setManualExpRecords(records: ManualExpRecord[]): boolean {
  return setStorageItem(STORAGE_KEYS.MANUAL_EXP_RECORDS, records)
}

/**
 * 設定手動經驗記錄並觸發雲端同步
 * 登入狀態下會同步到 Supabase
 */
export function setManualExpRecordsWithSync(records: ManualExpRecord[]): boolean {
  const success = setManualExpRecords(records)
  if (success && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'manualExpRecords', value: records }
    }))
  }
  return success
}
