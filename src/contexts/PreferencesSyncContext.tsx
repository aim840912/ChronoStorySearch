'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from './AuthContext'
import {
  preferencesService,
  rowToPreferences,
  type UserPreferences,
} from '@/lib/supabase/preferences-service'
import {
  subscribeToPreferences,
  unsubscribeFromPreferences,
} from '@/lib/supabase/realtime-preferences'
import { createTabLeader } from '@/lib/tab-leader'
import {
  getTheme,
  setTheme,
  getLanguage,
  setLanguage,
  getImageFormat,
  setImageFormat,
  getFavoriteMonsters,
  setFavoriteMonsters,
  getFavoriteItems,
  setFavoriteItems,
  clearUserStorage,
  // 怪物/物品屬性顯示設定
  getMonsterStatsViewMode,
  setMonsterStatsViewMode,
  getMonsterStatsOrder,
  setMonsterStatsOrder,
  getMonsterStatsVisible,
  setMonsterStatsVisible,
  getItemStatsViewMode,
  setItemStatsViewMode,
  getItemStatsOrder,
  setItemStatsOrder,
  getItemStatsVisible,
  setItemStatsVisible,
  getItemStatsShowMaxOnly,
  setItemStatsShowMaxOnly,
  // 物品掉落來源顯示設定
  getItemSourcesViewMode,
  setItemSourcesViewMode,
  // 怪物掉落顯示設定
  getMonsterDropsViewMode,
  setMonsterDropsViewMode,
  getMonsterDropsShowMaxOnly,
  setMonsterDropsShowMaxOnly,
} from '@/lib/storage'

interface PreferencesSyncContextType {
  /** 是否已啟用雲端同步（已登入） */
  syncEnabled: boolean
  /** 是否正在同步中 */
  isSyncing: boolean
  /** 同步單一設定到雲端 */
  syncToCloud: <K extends keyof UserPreferences>(
    field: K,
    value: UserPreferences[K]
  ) => Promise<void>
  /** 強制從雲端載入設定 */
  loadFromCloud: () => Promise<void>
  /** 強制上傳本地設定到雲端 */
  uploadToCloud: () => Promise<void>
}

const PreferencesSyncContext = createContext<PreferencesSyncContextType | undefined>(undefined)

/**
 * PreferencesSyncProvider
 * 處理用戶偏好設定的雲端同步
 *
 * 同步策略：
 * 1. 登入時：從雲端載入設定並覆蓋本地設定
 * 2. 設定變更時：同時儲存到本地和雲端
 * 3. 登出時：保留本地設定不變
 */
// 防止循環更新的時間閾值（毫秒）
const REALTIME_DEBOUNCE_MS = 1000
// 設定變更 debounce 時間（毫秒）- 減少頻繁的資料庫寫入
const SYNC_DEBOUNCE_MS = 1000

export function PreferencesSyncProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [isSyncing, setIsSyncing] = useState(false)
  const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false)

  // Realtime 訂閱相關
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastLocalUpdateRef = useRef<number>(0)
  const tabLeaderRef = useRef<ReturnType<typeof createTabLeader> | null>(null)
  // 追蹤前一個用戶 ID，用於偵測用戶切換
  const previousUserIdRef = useRef<string | null>(null)
  // Debounce: 待同步的變更佇列
  const pendingChangesRef = useRef<Partial<UserPreferences>>({})
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const syncEnabled = !!user

  /**
   * 從雲端載入設定並套用到本地
   */
  const loadFromCloud = useCallback(async () => {
    if (!user) return

    setIsSyncing(true)
    try {
      const cloudPrefs = await preferencesService.get()

      if (cloudPrefs) {
        // 有雲端設定，套用到本地
        setTheme(cloudPrefs.theme)
        setLanguage(cloudPrefs.language)
        setImageFormat(cloudPrefs.imageFormat)
        setFavoriteMonsters(cloudPrefs.favoriteMonsters)
        setFavoriteItems(cloudPrefs.favoriteItems)
        // 怪物/物品屬性顯示設定
        setMonsterStatsViewMode(cloudPrefs.monsterStatsViewMode)
        setMonsterStatsOrder(cloudPrefs.monsterStatsOrder)
        setMonsterStatsVisible(cloudPrefs.monsterStatsVisible)
        setItemStatsViewMode(cloudPrefs.itemStatsViewMode)
        setItemStatsOrder(cloudPrefs.itemStatsOrder)
        setItemStatsVisible(cloudPrefs.itemStatsVisible)
        setItemStatsShowMaxOnly(cloudPrefs.itemStatsShowMaxOnly)
        // 物品掉落來源顯示設定
        setItemSourcesViewMode(cloudPrefs.itemSourcesViewMode)
        // 怪物掉落顯示設定
        setMonsterDropsViewMode(cloudPrefs.monsterDropsViewMode)
        setMonsterDropsShowMaxOnly(cloudPrefs.monsterDropsShowMaxOnly)

        console.log('[PreferencesSync] 已從雲端載入設定')

        // 觸發頁面重新載入以套用設定
        // 使用 dispatchEvent 通知各 Context 重新讀取 localStorage
        window.dispatchEvent(new CustomEvent('preferences-synced'))
      } else {
        // 沒有雲端設定，上傳本地設定到雲端
        console.log('[PreferencesSync] 雲端無設定，上傳本地設定')
        await uploadToCloud()
      }
    } catch (error) {
      console.error('[PreferencesSync] 載入雲端設定失敗:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [user])

  /**
   * 上傳本地設定到雲端
   */
  const uploadToCloud = useCallback(async () => {
    if (!user) return

    setIsSyncing(true)
    try {
      const localPrefs: UserPreferences = {
        theme: getTheme(),
        language: getLanguage(),
        imageFormat: getImageFormat(),
        favoriteMonsters: getFavoriteMonsters(),
        favoriteItems: getFavoriteItems(),
        // 怪物/物品屬性顯示設定
        monsterStatsViewMode: getMonsterStatsViewMode(),
        monsterStatsOrder: getMonsterStatsOrder(),
        monsterStatsVisible: getMonsterStatsVisible(),
        itemStatsViewMode: getItemStatsViewMode(),
        itemStatsOrder: getItemStatsOrder(),
        itemStatsVisible: getItemStatsVisible(),
        itemStatsShowMaxOnly: getItemStatsShowMaxOnly(),
        // 物品掉落來源顯示設定
        itemSourcesViewMode: getItemSourcesViewMode(),
        // 怪物掉落顯示設定
        monsterDropsViewMode: getMonsterDropsViewMode(),
        monsterDropsShowMaxOnly: getMonsterDropsShowMaxOnly(),
      }

      await preferencesService.upsert(localPrefs)
      console.log('[PreferencesSync] 已上傳本地設定到雲端')
    } catch (error) {
      console.error('[PreferencesSync] 上傳設定失敗:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [user])

  /**
   * 執行批次同步（內部使用）
   */
  const flushPendingChanges = useCallback(async () => {
    if (!user) return

    const changes = pendingChangesRef.current
    if (Object.keys(changes).length === 0) return

    // 先讀取當前所有 localStorage 值（避免 race condition）
    const currentPrefs: UserPreferences = {
        theme: getTheme(),
        language: getLanguage(),
        imageFormat: getImageFormat(),
        favoriteMonsters: getFavoriteMonsters(),
        favoriteItems: getFavoriteItems(),
        monsterStatsViewMode: getMonsterStatsViewMode(),
        monsterStatsOrder: getMonsterStatsOrder(),
        monsterStatsVisible: getMonsterStatsVisible(),
        itemStatsViewMode: getItemStatsViewMode(),
        itemStatsOrder: getItemStatsOrder(),
        itemStatsVisible: getItemStatsVisible(),
        itemStatsShowMaxOnly: getItemStatsShowMaxOnly(),
        // 物品掉落來源顯示設定
        itemSourcesViewMode: getItemSourcesViewMode(),
        // 怪物掉落顯示設定
        monsterDropsViewMode: getMonsterDropsViewMode(),
        monsterDropsShowMaxOnly: getMonsterDropsShowMaxOnly(),
      }

    // 記錄本地變更時間，防止 Realtime 循環更新
    lastLocalUpdateRef.current = Date.now()

    // 清空佇列（在讀取值之後，確保新變更不會遺失）
    pendingChangesRef.current = {}

    try {
      // 合併待處理的變更
      const mergedPrefs = { ...currentPrefs, ...changes }
      await preferencesService.upsert(mergedPrefs)

      console.log(`[PreferencesSync] 已批次同步 ${Object.keys(changes).join(', ')} 到雲端`)
    } catch (error) {
      console.error('[PreferencesSync] 批次同步失敗:', error)
    }
  }, [user])

  /**
   * 同步單一設定到雲端（使用 debounce 減少寫入次數）
   * 多個設定變更會在 1 秒內合併為一次批次寫入
   */
  const syncToCloud = useCallback(async <K extends keyof UserPreferences>(
    field: K,
    value: UserPreferences[K]
  ): Promise<void> => {
    if (!user) return

    // 加入待處理佇列
    pendingChangesRef.current[field] = value

    // 清除之前的 timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    // 設定新的 debounce timeout
    syncTimeoutRef.current = setTimeout(() => {
      flushPendingChanges()
      syncTimeoutRef.current = null
    }, SYNC_DEBOUNCE_MS)
  }, [user, flushPendingChanges])

  // 登入後自動載入雲端設定，並處理用戶切換
  useEffect(() => {
    const currentUserId = user?.id ?? null
    const previousUserId = previousUserIdRef.current

    // 偵測用戶切換（不同用戶登入）
    if (previousUserId && currentUserId && previousUserId !== currentUserId) {
      console.log('[PreferencesSync] 偵測到用戶切換，清除舊用戶資料')
      clearUserStorage()
      setHasLoadedFromCloud(false)
    }

    // 更新追蹤的用戶 ID
    previousUserIdRef.current = currentUserId

    if (!isAuthLoading && user && !hasLoadedFromCloud) {
      setHasLoadedFromCloud(true)
      loadFromCloud()
    }

    // 登出時重置狀態（localStorage 已在 AuthContext.signOut 中清除）
    if (!user) {
      setHasLoadedFromCloud(false)
      // 清理 debounce timeout 和待處理的變更
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
        syncTimeoutRef.current = null
      }
      pendingChangesRef.current = {}
    }
  }, [user, isAuthLoading, hasLoadedFromCloud, loadFromCloud])

  // 監聽設定變更事件，同步到雲端
  useEffect(() => {
    if (!user) return

    const handlePreferenceChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ field: keyof UserPreferences; value: unknown }>
      const { field, value } = customEvent.detail
      syncToCloud(field, value as UserPreferences[typeof field])
    }

    window.addEventListener('preference-changed', handlePreferenceChanged)
    return () => window.removeEventListener('preference-changed', handlePreferenceChanged)
  }, [user, syncToCloud])

  /**
   * 套用偏好設定到 localStorage 並通知 UI
   */
  const applyPreferences = useCallback((prefs: UserPreferences) => {
    setTheme(prefs.theme)
    setLanguage(prefs.language)
    setImageFormat(prefs.imageFormat)
    setFavoriteMonsters(prefs.favoriteMonsters)
    setFavoriteItems(prefs.favoriteItems)
    // 怪物/物品屬性顯示設定
    setMonsterStatsViewMode(prefs.monsterStatsViewMode)
    setMonsterStatsOrder(prefs.monsterStatsOrder)
    setMonsterStatsVisible(prefs.monsterStatsVisible)
    setItemStatsViewMode(prefs.itemStatsViewMode)
    setItemStatsOrder(prefs.itemStatsOrder)
    setItemStatsVisible(prefs.itemStatsVisible)
    setItemStatsShowMaxOnly(prefs.itemStatsShowMaxOnly)
    // 物品掉落來源顯示設定
    setItemSourcesViewMode(prefs.itemSourcesViewMode)
    // 怪物掉落顯示設定
    setMonsterDropsViewMode(prefs.monsterDropsViewMode)
    setMonsterDropsShowMaxOnly(prefs.monsterDropsShowMaxOnly)
    window.dispatchEvent(new CustomEvent('preferences-synced'))
  }, [])

  // Realtime 訂閱：使用 Tab Leader 機制減少連線數
  useEffect(() => {
    // 登出時清理
    if (!user) {
      if (channelRef.current) {
        unsubscribeFromPreferences(channelRef.current)
        channelRef.current = null
      }
      if (tabLeaderRef.current) {
        tabLeaderRef.current.cleanup()
        tabLeaderRef.current = null
      }
      return
    }

    // 創建 Tab Leader 控制器
    const tabLeader = createTabLeader(
      // onBecomeLeader: 成為 Leader，建立 Realtime 連線
      () => {
        console.log('[PreferencesSync] 成為 Leader，建立 Realtime 連線')
        const channel = subscribeToPreferences(user.id, (payload) => {
          // 防止循環：忽略自己 1 秒內的變更
          const now = Date.now()
          if (now - lastLocalUpdateRef.current < REALTIME_DEBOUNCE_MS) {
            console.log('[Realtime] 忽略自己的變更')
            return
          }

          console.log('[Realtime] 收到其他裝置的變更')

          // 更新本地設定
          const newPrefs = rowToPreferences(payload.new)
          applyPreferences(newPrefs)

          // 廣播給其他分頁（包含 userId 供驗證）
          tabLeaderRef.current?.broadcastUpdate({
            userId: user.id,
            preferences: newPrefs,
          })
        })
        channelRef.current = channel
      },
      // onBecomeFollower: 成為 Follower，關閉 Realtime 連線
      () => {
        console.log('[PreferencesSync] 成為 Follower，關閉 Realtime 連線')
        if (channelRef.current) {
          unsubscribeFromPreferences(channelRef.current)
          channelRef.current = null
        }
      },
      // onRealtimeUpdate: 收到 Leader 廣播的更新
      (payload) => {
        // 安全驗證：確保廣播來自同一用戶
        // 防止多用戶分頁相互干擾
        const typedPayload = payload as { userId?: string; preferences?: UserPreferences }

        if (typedPayload.userId && typedPayload.userId !== user.id) {
          console.warn(
            '[PreferencesSync] Tab Leader 廣播用戶不匹配，忽略',
            { expected: user.id, received: typedPayload.userId }
          )
          return
        }

        console.log('[PreferencesSync] 收到 Leader 廣播的更新')

        // 支援新舊格式：新格式有 preferences 欄位，舊格式直接是 UserPreferences
        const preferences = typedPayload.preferences ?? (payload as UserPreferences)
        applyPreferences(preferences)
      }
    )

    tabLeaderRef.current = tabLeader

    return () => {
      if (channelRef.current) {
        unsubscribeFromPreferences(channelRef.current)
        channelRef.current = null
      }
      tabLeader.cleanup()
      tabLeaderRef.current = null
    }
  }, [user, applyPreferences])

  return (
    <PreferencesSyncContext.Provider
      value={{
        syncEnabled,
        isSyncing,
        syncToCloud,
        loadFromCloud,
        uploadToCloud,
      }}
    >
      {children}
    </PreferencesSyncContext.Provider>
  )
}

/**
 * usePreferencesSync Hook
 * 用於在元件中存取偏好設定同步功能
 */
export function usePreferencesSync() {
  const context = useContext(PreferencesSyncContext)
  if (context === undefined) {
    throw new Error('usePreferencesSync must be used within a PreferencesSyncProvider')
  }
  return context
}
