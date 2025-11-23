'use client'

import { createContext, useContext, useEffect, ReactNode, useCallback } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { trackLogin, trackLogout } from '@/lib/analytics/ga4'
import { getBaseUrl } from '@/lib/env/url-config'
import { swrStrategies } from '@/lib/swr/config'

/**
 * 前端使用的 User 介面
 * 從 /api/auth/me 取得完整用戶資料
 * 注意：與後端 User 介面不同，不包含 session_id 和 access_token
 */
export interface User {
  id: string
  discord_id: string
  discord_username: string
  discord_discriminator: string
  discord_avatar: string | null
  email: string | null
  banned: boolean
  last_login_at: string
  created_at: string
  // profile 和 quotas 是可選的（取決於 API 參數）
  profile?: {
    account_created_at: string
    reputation_score: number
    server_roles: string[]
    profile_privacy: string
  }
  quotas?: {
    active_listings_count: number
    max_listings: number
    interests_today: number
    max_interests_per_day: number
  }
  account_status?: {
    banned: boolean
    last_login_at: string
    created_at: string
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: () => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  forceRefreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * 自訂 fetcher：處理 /api/auth/me 的特殊邏輯
 * - 處理 401 時自動調用同步 API
 * - 處理錯誤回應
 */
async function authMeFetcher(url: string): Promise<User | null> {
  let response = await fetch(url, {
    credentials: 'include',
  })

  // 如果返回 401，表示用戶未同步到資料庫，先調用同步 API
  if (response.status === 401) {
    const syncResponse = await fetch('/api/auth/sync', {
      method: 'POST',
      credentials: 'include',
    })

    if (syncResponse.ok) {
      // 同步成功，重新取得用戶資料
      response = await fetch(url, {
        credentials: 'include',
      })
    }
  }

  if (response.ok) {
    const data = await response.json()
    if (data.success && data.data) {
      return data.data
    }
  }

  return null
}

/**
 * Auth Provider
 * 提供全域認證狀態管理
 *
 * 功能：
 * - 自動載入當前用戶資訊（使用 SWR 快取）
 * - 提供 login 方法（導向 Discord OAuth）
 * - 提供 logout 方法（呼叫 logout API）
 * - 提供 refreshUser 方法（重新驗證 SWR 快取）
 * - 提供 forceRefreshUser 方法（強制刷新，忽略快取）
 *
 * 成本優化（2025-11-04，遷移到 SWR）：
 * - 使用 SWR 快取用戶資訊（60 秒 deduping）
 * - 減少 60-70% /api/auth/me 調用次數
 * - 跨元件共享快取（所有使用 useAuth 的元件共享同一份資料）
 * - 關鍵操作後（建立刊登、表達興趣）使用 forceRefreshUser 立即更新配額
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()

  // 使用 SWR 管理用戶狀態
  // 暫時停用認證檢查（傳入 null 會停用 SWR 請求）
  const {
    data: user,
    error,
    mutate,
    isLoading,
    isValidating,
  } = useSWR<User | null>(null, authMeFetcher, {
    ...swrStrategies.userInfo,
    // 在 mount 時自動載入
    revalidateOnMount: true,
    // 發生錯誤時不自動重試（避免 API 成本）
    shouldRetryOnError: false,
  })

  /**
   * 重新載入用戶資訊（重新驗證 SWR 快取）
   *
   * 使用 SWR 的 mutate(undefined, { revalidate: true })
   * 會觸發重新 fetch，但保留 deduping 機制
   */
  const refreshUser = useCallback(async () => {
    await mutate(undefined, { revalidate: true })
  }, [mutate])

  /**
   * 強制刷新用戶資訊（忽略快取）
   *
   * 使用場景：
   * - 建立刊登後（配額可能改變）
   * - 表達購買興趣後（配額可能改變）
   * - 登出後（清除快取）
   *
   * 使用 SWR 的 mutate() 強制重新 fetch
   */
  const forceRefreshUser = useCallback(async () => {
    await mutate()
  }, [mutate])

  /**
   * GA4 登入追蹤：當用戶從 null 變為有值時觸發
   */
  useEffect(() => {
    if (user && !error) {
      // 除錯日誌：確認頭貼資料
      console.log('[AuthContext] User loaded:', {
        discord_id: user.discord_id,
        discord_avatar: user.discord_avatar,
        discord_username: user.discord_username
      })

      // GA4 事件追蹤：登入成功
      // 注意：這會在每次 SWR 重新載入時觸發，需要額外邏輯判斷是否為新登入
      // 簡化版：只在 mount 時且有用戶時觸發
      trackLogin('discord')
    }
  }, [user, error])

  /**
   * 監聽 Supabase Auth 狀態變化
   *
   * 當登入/登出時，使用 mutate 刷新 SWR 快取
   */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state changed:', event, session ? 'session exists' : 'no session')

      if (!session) {
        // 登出時清除 SWR 快取
        mutate(null, { revalidate: false })
      } else {
        // 登入時重新載入用戶資料
        mutate()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, mutate])

  /**
   * 登入：使用 Supabase Auth 的 Discord OAuth
   */
  const login = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: getBaseUrl(),
        scopes: 'identify guilds'
      }
    })

    if (error) {
      console.error('[Login] Failed:', error)
      alert(`登入失敗: ${error.message}`)
    }
  }, [supabase])

  /**
   * 登出：使用 Supabase Auth signOut
   */
  const logout = useCallback(async () => {
    try {
      console.log('[Logout] 開始登出流程')

      // 使用 Supabase Auth 登出
      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        console.error('[Logout] Supabase signOut failed:', signOutError)
        alert(`登出失敗: ${signOutError.message}`)
        return
      }

      // GA4 事件追蹤：登出
      trackLogout()

      // 清除 SWR 快取
      await mutate(null, { revalidate: false })

      console.log('[Logout] ✓ 登出成功')

      // 重導向至首頁
      window.location.href = '/'
    } catch (error) {
      console.error('[Logout] 錯誤:', error)
      alert('登出時發生錯誤，請重新整理頁面後再試')
    }
  }, [supabase, mutate])

  const value: AuthContextType = {
    user: user ?? null,
    // loading: 初始載入中 或 重新驗證中
    loading: isLoading || isValidating,
    login,
    logout,
    refreshUser,
    forceRefreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth Hook
 * 獲取認證 Context
 *
 * @throws 如果在 AuthProvider 外使用
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
