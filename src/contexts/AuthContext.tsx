'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackLogin, trackLogout } from '@/lib/analytics/ga4'

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

// 快取配置（成本優化：2025-11-03，改進：2025-11-04）
// 使用 memory cache 而非 localStorage，避免無痕模式下的快取同步問題
const CACHE_DURATION = 5 * 60 * 1000 // 5 分鐘

interface UserCache {
  data: User
  timestamp: number
}

// Module-level memory cache（每次頁面載入時重置）
let userCache: UserCache | null = null

/**
 * Auth Provider
 * 提供全域認證狀態管理
 *
 * 功能：
 * - 自動載入當前用戶資訊（mount 時呼叫 /api/auth/me）
 * - 提供 login 方法（導向 Discord OAuth）
 * - 提供 logout 方法（呼叫 logout API）
 * - 提供 refreshUser 方法（重新載入用戶資訊，支援快取）
 * - 提供 forceRefreshUser 方法（強制刷新，忽略快取）
 *
 * 成本優化（2025-11-03，改進：2025-11-04）：
 * - 使用 memory cache 快取用戶資訊（5 分鐘 TTL）
 * - 減少 60-70% /api/auth/me 調用次數
 * - 關鍵操作後（建立刊登、表達興趣）使用 forceRefreshUser 立即更新配額
 * - 修復：改用 memory cache 避免無痕模式下 localStorage 與 cookie 不同步的問題
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  /**
   * 重新載入用戶資訊（使用 Supabase Auth）
   *
   * 流程：
   * 1. 檢查 memory cache
   * 2. 如果快取有效（5 分鐘內），使用快取資料
   * 3. 如果快取過期或不存在，從 Supabase Auth 取得用戶
   * 4. 呼叫 /api/auth/me 取得完整用戶資料
   * 5. 更新快取
   */
  const refreshUser = useCallback(async () => {
    try {
      // 檢查 memory cache
      if (userCache) {
        const cacheAge = Date.now() - userCache.timestamp
        const cacheValid = cacheAge < CACHE_DURATION

        if (cacheValid) {
          // 快取有效，直接使用
          setUser(userCache.data)
          setLoading(false)
          return
        }
      }

      // 快取過期或不存在，從 Supabase Auth 取得用戶
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authUser) {
        // 未登入
        setUser(null)
        userCache = null
        setLoading(false)
        return
      }

      // 呼叫 /api/auth/me 取得完整用戶資料
      let response = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      // 如果返回 401，表示用戶未同步到資料庫，先調用同步 API
      if (response.status === 401) {
        // 調用同步 API
        const syncResponse = await fetch('/api/auth/sync', {
          method: 'POST',
          credentials: 'include',
        })

        if (syncResponse.ok) {
          // 同步成功，重新取得用戶資料
          response = await fetch('/api/auth/me', {
            credentials: 'include',
          })
        }
      }

      if (response.ok) {
        const data = await response.json()

        if (data.success && data.data) {
          const wasLoggedOut = !user
          setUser(data.data)
          // 存入 memory cache
          userCache = {
            data: data.data,
            timestamp: Date.now()
          }

          // 除錯日誌：確認頭貼資料
          console.log('[AuthContext] User loaded:', {
            discord_id: data.data.discord_id,
            discord_avatar: data.data.discord_avatar,
            discord_username: data.data.discord_username
          })

          // GA4 事件追蹤：登入成功（僅在從未登入狀態切換到已登入時觸發）
          if (wasLoggedOut) {
            trackLogin('discord')
          }
        } else {
          setUser(null)
          userCache = null
        }
      } else {
        // API 錯誤
        setUser(null)
        userCache = null
      }
    } catch (error) {
      console.error('[AuthContext] Error refreshing user:', error)
      setUser(null)
      userCache = null
    } finally {
      setLoading(false)
    }
  }, [supabase])

  /**
   * 強制刷新用戶資訊（忽略快取）
   *
   * 使用場景：
   * - 建立刊登後（配額可能改變）
   * - 表達購買興趣後（配額可能改變）
   * - 登出後（清除快取）
   */
  const forceRefreshUser = useCallback(async () => {
    userCache = null
    await refreshUser()
  }, [refreshUser])

  /**
   * 初始化：載入當前用戶並監聽認證狀態變化
   *
   * 注意：不再手動處理 OAuth code exchange
   * Supabase Auth 會自動處理 PKCE 流程並觸發 onAuthStateChange
   */
  useEffect(() => {
    // 初始載入當前用戶
    refreshUser()

    // 監聽 Supabase Auth 狀態變化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state changed:', event, session ? 'session exists' : 'no session')

      if (!session) {
        // 登出時清除用戶狀態
        setUser(null)
        userCache = null
      } else {
        // 登入時重新載入用戶資料
        // 這會在 OAuth 成功後自動觸發
        refreshUser()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [refreshUser, supabase])

  /**
   * 登入：使用 Supabase Auth 的 Discord OAuth
   */
  const login = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin,
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
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('[Logout] Supabase signOut failed:', error)
        alert(`登出失敗: ${error.message}`)
        return
      }

      // GA4 事件追蹤：登出
      trackLogout()

      // 清除本地狀態和快取
      setUser(null)
      userCache = null

      console.log('[Logout] ✓ 登出成功')

      // 重導向至首頁
      window.location.href = '/'
    } catch (error) {
      console.error('[Logout] 錯誤:', error)
      alert('登出時發生錯誤，請重新整理頁面後再試')
    }
  }, [supabase])

  const value: AuthContextType = {
    user,
    loading,
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
