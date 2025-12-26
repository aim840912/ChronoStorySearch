'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { clearUserStorage } from '@/lib/storage'

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
        // 只調用一次 getUser() 驗證 token 是否有效
        // 這節省了一次 Supabase API 調用（減少 Edge Requests）
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          // Token 無效或不存在，清除狀態
          setSession(null)
          setUser(null)
          return
        }

        // Token 有效，設置 user
        // session 會由 onAuthStateChange 自動提供
        setUser(user)
      } catch (error) {
        console.error('Auth initialization error:', error)
        setSession(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // 監聽 auth 狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [authEnabled])

  // Discord OAuth 登入
  const signInWithDiscord = useCallback(async () => {
    // 如果認證功能關閉，拋出錯誤
    if (!authEnabled) {
      throw new Error('認證功能已關閉')
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
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
      console.log('[Auth] 已清除用戶儲存（保留 guest 資料）')
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
