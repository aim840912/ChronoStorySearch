'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import {
  preferencesService,
  type UserPreferences,
} from '@/lib/supabase/preferences-service'
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
export function PreferencesSyncProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [isSyncing, setIsSyncing] = useState(false)
  const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false)

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
   * 同步單一設定到雲端
   */
  const syncToCloud = useCallback(async <K extends keyof UserPreferences>(
    field: K,
    value: UserPreferences[K]
  ) => {
    if (!user) return

    try {
      await preferencesService.updateField(field, value)
      console.log(`[PreferencesSync] 已同步 ${field} 到雲端`)
    } catch (error) {
      console.error(`[PreferencesSync] 同步 ${field} 失敗:`, error)
    }
  }, [user])

  // 登入後自動載入雲端設定
  useEffect(() => {
    if (!isAuthLoading && user && !hasLoadedFromCloud) {
      setHasLoadedFromCloud(true)
      loadFromCloud()
    }

    // 登出時重置狀態
    if (!user) {
      setHasLoadedFromCloud(false)
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
