'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { clearUserStorage, restorePreferencesFromGuest } from '@/lib/storage'

// Auth Token 快取 key
const AUTH_CACHE_KEY = 'chronostory-auth-cache'
// 快取有效期（毫秒）- 設為 55 分鐘（Supabase access token 預設 1 小時過期）
const AUTH_CACHE_TTL = 55 * 60 * 1000

interface AuthCache {
  userId: string
  expiresAt: number
}

/**
 * 從 localStorage 讀取 Auth 快取
 */
function getAuthCache(): AuthCache | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY)
    if (!cached) return null

    const data: AuthCache = JSON.parse(cached)
    // 檢查是否過期
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(AUTH_CACHE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

/**
 * 設置 Auth 快取
 */
function setAuthCache(userId: string): void {
  if (typeof window === 'undefined') return

  const cache: AuthCache = {
    userId,
    expiresAt: Date.now() + AUTH_CACHE_TTL,
  }
  localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache))
}

/**
 * 清除 Auth 快取
 */
function clearAuthCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_CACHE_KEY)
}

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  authEnabled: boolean
  signInWithDiscord: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Auth Provider
 * 提供 Discord OAuth 登入功能，使用 Supabase Auth
 *
 * 可透過環境變數 NEXT_PUBLIC_AUTH_ENABLED=false 關閉認證功能
 * 關閉時會強制登出所有用戶並隱藏登入按鈕
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 檢查認證功能是否啟用
  const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'false'

  // 初始化：驗證現有 session
  // 使用 getUser() 驗證 token 有效性
  // session 由 onAuthStateChange 提供，避免重複 API 調用
  useEffect(() => {
    // 如果認證關閉，強制登出並跳過初始化
    if (!authEnabled) {
      const forceLogout = async () => {
        try {
          // 嘗試登出（清除 Supabase session cookie）
          await supabase.auth.signOut()
          clearUserStorage()
          console.log('[Auth] 認證已關閉，強制登出用戶')
        } catch (error) {
          // 即使登出失敗也清除本地狀態
          console.error('[Auth] 強制登出時發生錯誤:', error)
        }
        setSession(null)
        setUser(null)
        setIsLoading(false)
      }
      forceLogout()
      return
    }

    const initAuth = async () => {
      try {
        // 優化：先檢查本地快取，減少 Supabase API 調用
        const cache = getAuthCache()

        if (cache) {
          // 快取有效，延遲驗證（讓 onAuthStateChange 處理）
          // 這樣可以減少初始化時的 API 調用
          console.log('[Auth] 使用快取的認證狀態，跳過 getUser() 調用')
          setIsLoading(false)
          // onAuthStateChange 會自動更新 user 和 session
          return
        }

        // 沒有快取或快取過期，需要驗證 token
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          // Token 無效或不存在，清除狀態和快取
          setSession(null)
          setUser(null)
          clearAuthCache()
          return
        }

        // Token 有效，設置 user 並更新快取
        setUser(user)
        setAuthCache(user.id)
      } catch (error) {
        console.error('Auth initialization error:', error)
        setSession(null)
        setUser(null)
        clearAuthCache()
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // 監聽 auth 狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)

        // 更新快取
        if (session?.user) {
          setAuthCache(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          clearAuthCache()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [authEnabled])

  // Discord OAuth 登入（使用 popup 模式避免桌面應用程式攔截）
  const signInWithDiscord = useCallback(async () => {
    // 如果認證功能關閉，拋出錯誤
    if (!authEnabled) {
      throw new Error('認證功能已關閉')
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?popup=true`,
          skipBrowserRedirect: true, // 不自動重導向，獲取 URL
        },
      })
      if (error) throw error

      if (data.url) {
        // 在新視窗中打開，避免 Discord 桌面應用程式攔截
        const width = 500
        const height = 700
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2

        window.open(
          data.url,
          'discord-oauth',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
        )
      }
    } catch (error) {
      console.error('Discord sign in error:', error)
      throw error
    }
  }, [authEnabled])

  // 登出
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // 清除登入用戶的 localStorage（保留 guest 資料）
      clearUserStorage()
      // 清除 auth 快取
      clearAuthCache()

      // 從 Guest 恢復登入前的偏好設定
      restorePreferencesFromGuest()

      // 通知所有 Context 重新讀取設定
      window.dispatchEvent(new CustomEvent('preferences-synced'))

      console.log('[Auth] 已清除用戶儲存、恢復登入前設定並通知 Context')
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        authEnabled,
        signInWithDiscord,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth Hook
 * 用於在元件中存取認證相關功能
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
