/**
 * SWR 版本的認證 Hook
 *
 * 功能：
 * - 使用 SWR 管理用戶資訊快取
 * - 自動去重請求
 * - 自動重新驗證（聚焦、重新連線）
 * - 取代 AuthContext 中的手動快取邏輯
 *
 * 優化效果（相比手動快取）：
 * - 減少重複請求（dedupingInterval: 60 秒）
 * - 更好的使用者體驗（stale-while-revalidate）
 * - 更簡潔的程式碼
 */

import useSWR from 'swr'
import { swrStrategies } from '@/lib/swr/config'
import type { User } from '@/lib/auth/session-validator'

interface AuthResponse {
  success: boolean
  data?: User
  message?: string
}

/**
 * 使用 SWR 獲取當前用戶資訊
 *
 * @returns SWR 返回值 + 便利屬性
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { user, isLoading, error, mutate } = useAuth()
 *
 *   if (isLoading) return <div>載入中...</div>
 *   if (error) return <div>錯誤</div>
 *   if (!user) return <div>未登入</div>
 *
 *   return <div>歡迎，{user.discord_username}</div>
 * }
 * ```
 */
export function useAuth() {
  const { data, error, isLoading, mutate } = useSWR<AuthResponse>(
    '/api/auth/me',
    {
      ...swrStrategies.userInfo,
      // 錯誤時不重試（避免 401 錯誤重複請求）
      shouldRetryOnError: false,
      // 自訂錯誤處理（401 視為正常，不拋出錯誤）
      onError: (err) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((err as any).status === 401) {
          // 401 是正常情況（未登入），不視為錯誤
          return
        }
        // 其他錯誤才記錄
        console.error('獲取用戶資訊失敗', err)
      },
    }
  )

  return {
    user: data?.success ? data.data : null,
    isLoading,
    error,
    mutate,
    // 便利方法：強制重新驗證
    refresh: () => mutate(),
  }
}

/**
 * 使用 SWR 獲取用戶角色資訊
 *
 * @returns SWR 返回值 + 便利屬性
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const { isAdmin, isLoading } = useUserRoles()
 *
 *   if (isLoading) return <div>載入中...</div>
 *   if (!isAdmin) return <div>無權限</div>
 *
 *   return <AdminDashboard />
 * }
 * ```
 */
export function useUserRoles() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    data?: { roles: string[]; isAdmin: boolean }
  }>(
    '/api/auth/me/roles',
    {
      ...swrStrategies.userInfo,
      shouldRetryOnError: false,
    }
  )

  return {
    roles: data?.data?.roles || [],
    isAdmin: data?.data?.isAdmin || false,
    isLoading,
    error,
    mutate,
  }
}
