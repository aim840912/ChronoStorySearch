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

  /**
   * 重新載入用戶資訊（支援快取）
   *
   * 流程：
   * 1. 檢查 memory cache
   * 2. 如果快取有效（5 分鐘內），使用快取資料
   * 3. 如果快取過期或不存在，呼叫 /api/auth/me
   * 4. 更新快取
   */
  const refreshUser = useCallback(async () => {
    try {
      // 檢查 memory cache
      if (userCache) {
        const cacheAge = Date.now() - userCache.timestamp
        const cacheValid = cacheAge < CACHE_DURATION

        // 🔍 診斷日誌：Cache 狀態（2025-11-04）
        console.log('[DIAGNOSTIC] Memory cache check', {
          cache_exists: true,
          cache_age_ms: cacheAge,
          cache_age_minutes: (cacheAge / 1000 / 60).toFixed(2),
          cache_valid: cacheValid,
          cache_duration_minutes: (CACHE_DURATION / 1000 / 60).toFixed(2),
          cached_user_id: userCache.data.id,
          cached_username: userCache.data.discord_username,
        })

        if (cacheValid) {
          // 快取有效，直接使用
          console.log('[DIAGNOSTIC] Using memory cache - skipping API call')
          setUser(userCache.data)
          setLoading(false)
          return
        } else {
          console.log('[DIAGNOSTIC] Cache expired - calling API')
        }
      } else {
        console.log('[DIAGNOSTIC] No cache exists - calling API')
      }

      // 快取過期或不存在，呼叫 API
      console.log('[DIAGNOSTIC] Calling /api/auth/me', {
        credentials: 'include',
        note: 'Will send httpOnly cookie if it exists'
      })
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // 包含 cookie
      })

      // 🔍 診斷日誌：API 響應（2025-11-04）
      console.log('[DIAGNOSTIC] /api/auth/me response', {
        status: response.status,
        ok: response.ok,
        status_text: response.statusText,
      })

      if (response.ok) {
        const data = await response.json()
        console.log('[DIAGNOSTIC] API response data', {
          success: data.success,
          has_data: !!data.data,
          user_id: data.data?.id,
          username: data.data?.discord_username,
        })

        if (data.success && data.data) {
          const wasLoggedOut = !user
          setUser(data.data)
          // 存入 memory cache
          userCache = {
            data: data.data,
            timestamp: Date.now()
          }
          console.log('[DIAGNOSTIC] User data stored in memory cache')

          // 清除登出流程標記（如果存在）
          sessionStorage.removeItem('maplestory:logout-in-progress')

          // GA4 事件追蹤：登入成功（僅在從未登入狀態切換到已登入時觸發）
          if (wasLoggedOut) {
            trackLogin('discord')
          }
        } else {
          console.log('[DIAGNOSTIC] Invalid response data - clearing user state')
          setUser(null)
          userCache = null
        }
      } else {
        // 檢查是否為登出流程中的預期 401（改進：2025-11-04）
        const isLogoutFlow = sessionStorage.getItem('maplestory:logout-in-progress') === 'true'

        if (response.status === 401) {
          if (isLogoutFlow) {
            console.debug('[AuthContext] ✓ 預期行為：登出後的認證檢查返回 401')
            sessionStorage.removeItem('maplestory:logout-in-progress')
          } else {
            console.warn('[AuthContext] ⚠️ 非預期的 401：用戶可能已被登出或 session 過期')
          }
        }

        // 401 或其他錯誤表示未登入
        setUser(null)
        userCache = null
      }
    } catch (error) {
      // 網路錯誤或其他異常（改進：2025-11-04）
      console.error('[AuthContext] ❌ 網路錯誤或 API 異常：', error)
      setUser(null)
      userCache = null
      sessionStorage.removeItem('maplestory:logout-in-progress')
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
    userCache = null
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
   * 客戶端強制清除 Cookie（保險措施）
   *
   * 嘗試多種 domain 和 path 組合清除 cookie
   * 用於後端清除失敗時的備用方案
   */
  const forceDeleteCookie = useCallback((cookieName: string) => {
    console.log(`[Logout] 強制清除 Cookie: ${cookieName}`)

    // 嘗試多種 domain 和 path 組合
    const hostname = window.location.hostname
    const domains = [hostname, `.${hostname}`, '']
    const paths = ['/', '']

    domains.forEach(domain => {
      paths.forEach(path => {
        const cookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domain ? `; domain=${domain}` : ''}`
        document.cookie = cookieString
        console.log(`[Logout] 嘗試清除: ${cookieString}`)
      })
    })
  }, [])

  /**
   * 登出：呼叫 logout API 並清除用戶狀態和快取
   *
   * 改進（2025-11-04）：
   * - 增強錯誤處理和診斷日誌
   * - 驗證 cookie 清除結果
   * - 客戶端強制清除機制（多重保險）
   * - 提供用戶友好的錯誤提示
   */
  const logout = useCallback(async () => {
    try {
      console.log('[Logout] 開始登出流程')
      console.log('[Logout] Cookies before logout:', document.cookie)

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      console.log('[Logout] API Status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[Logout] API Response:', data)

        // GA4 事件追蹤：登出
        trackLogout()

        // 設置標記以識別登出流程中的預期 401（改進：2025-11-04）
        sessionStorage.setItem('maplestory:logout-in-progress', 'true')

        setUser(null)
        userCache = null // 清除快取

        // 驗證 cookie 是否被清除
        console.log('[Logout] Cookies after logout:', document.cookie)

        // 客戶端強制清除（保險措施）
        forceDeleteCookie('maplestory_session')

        // 最終驗證
        const remainingCookies = document.cookie
        if (remainingCookies.includes('maplestory_session')) {
          console.warn('[Logout] 警告：Cookie 仍然存在', remainingCookies)
        } else {
          console.log('[Logout] ✓ Cookie 已成功清除')
        }

        // 強制跳轉到首頁
        window.location.href = '/'
      } else {
        // 登出失敗處理
        const errorData = await response.json().catch(() => ({
          message: '未知錯誤'
        }))

        console.error('[Logout] 登出失敗:', {
          status: response.status,
          error: errorData
        })

        alert(`登出失敗: ${errorData.message || '請重新整理頁面後再試'}`)
      }
    } catch (error) {
      console.error('[Logout] 網路錯誤:', error)
      alert('登出時發生網路錯誤，請重新整理頁面後再試')
    }
  }, [forceDeleteCookie])

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
