'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import type { User } from '@/lib/auth/session-validator'
import { trackLogin, trackLogout } from '@/lib/analytics/ga4'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: () => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  forceRefreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 快取配置（成本優化：2025-11-03）
const CACHE_KEY = 'maplestory:user:cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 分鐘

interface UserCache {
  data: User
  timestamp: number
}

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
 * 成本優化（2025-11-03）：
 * - 使用 localStorage 快取用戶資訊（5 分鐘 TTL）
 * - 減少 60-70% /api/auth/me 調用次數
 * - 關鍵操作後（建立刊登、表達興趣）使用 forceRefreshUser 立即更新配額
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * 重新載入用戶資訊（支援快取）
   *
   * 流程：
   * 1. 檢查 localStorage 快取
   * 2. 如果快取有效（5 分鐘內），使用快取資料
   * 3. 如果快取過期或不存在，呼叫 /api/auth/me
   * 4. 更新快取
   */
  const refreshUser = useCallback(async () => {
    try {
      // 檢查 localStorage 快取
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached) as UserCache
        if (Date.now() - timestamp < CACHE_DURATION) {
          // 快取有效，直接使用
          setUser(data)
          setLoading(false)
          return
        }
      }

      // 快取過期或不存在，呼叫 API
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // 包含 cookie
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const wasLoggedOut = !user
          setUser(data.data)
          // 存入快取
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: data.data,
            timestamp: Date.now()
          } as UserCache))

          // GA4 事件追蹤：登入成功（僅在從未登入狀態切換到已登入時觸發）
          if (wasLoggedOut) {
            trackLogin('discord')
          }
        } else {
          setUser(null)
          localStorage.removeItem(CACHE_KEY)
        }
      } else {
        // 401 或其他錯誤表示未登入
        setUser(null)
        localStorage.removeItem(CACHE_KEY)
      }
    } catch {
      // 錯誤由 API 處理，前端不需額外記錄
      setUser(null)
      localStorage.removeItem(CACHE_KEY)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 強制刷新用戶資訊（忽略快取）
   *
   * 使用場景：
   * - 建立刊登後（配額可能改變）
   * - 表達購買興趣後（配額可能改變）
   * - 登出後（清除快取）
   */
  const forceRefreshUser = useCallback(async () => {
    localStorage.removeItem(CACHE_KEY)
    await refreshUser()
  }, [refreshUser])

  /**
   * 初始化：載入當前用戶
   */
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  /**
   * 登入：觸發 LoginModal 顯示
   * LoginModal 會處理實際的 Discord OAuth 導向
   */
  const login = useCallback(() => {
    window.dispatchEvent(new CustomEvent('show-login-modal'))
  }, [])

  /**
   * 登出：呼叫 logout API 並清除用戶狀態和快取
   */
  const logout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        // GA4 事件追蹤：登出
        trackLogout()

        setUser(null)
        localStorage.removeItem(CACHE_KEY) // 清除快取
        window.location.href = '/'
      }
      // 登出失敗時不記錄（用戶可重試或刷新頁面）
    } catch {
      // 網路錯誤由瀏覽器處理，不需額外記錄
    }
  }, [])

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
