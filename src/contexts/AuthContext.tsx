'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import type { User } from '@/lib/auth/session-validator'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: () => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Auth Provider
 * 提供全域認證狀態管理
 *
 * 功能：
 * - 自動載入當前用戶資訊（mount 時呼叫 /api/auth/me）
 * - 提供 login 方法（導向 Discord OAuth）
 * - 提供 logout 方法（呼叫 logout API）
 * - 提供 refreshUser 方法（重新載入用戶資訊）
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * 重新載入用戶資訊
   * 呼叫 /api/auth/me 獲取當前登入用戶
   */
  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // 包含 cookie
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setUser(data.data)
        } else {
          setUser(null)
        }
      } else {
        // 401 或其他錯誤表示未登入
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

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
   * 登出：呼叫 logout API 並清除用戶狀態
   */
  const logout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        setUser(null)
        window.location.href = '/'
      } else {
        console.error('Logout failed:', await response.text())
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
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
