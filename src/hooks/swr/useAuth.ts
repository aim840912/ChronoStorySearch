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
  // 暫時停用認證 API 請求（傳入 null 會停用 SWR 請求）
  // 之後如需恢復，將 null 改回 '/api/auth/me'
  const { mutate } = useSWR<AuthResponse>(
    null, // 停用 API 請求
    {
      ...swrStrategies.userInfo,
      shouldRetryOnError: false,
    }
  )

  return {
    user: null, // 暫時停用，始終返回 null
    isLoading: false,
    error: null,
    mutate,
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
  // 暫時停用角色 API 請求（傳入 null 會停用 SWR 請求）
  // 之後如需恢復，將 null 改回 '/api/auth/me/roles'
  const { mutate } = useSWR<{
    success: boolean
    data?: { roles: string[]; isAdmin: boolean }
  }>(
    null, // 停用 API 請求
    {
      ...swrStrategies.userInfo,
      shouldRetryOnError: false,
    }
  )

  return {
    roles: [], // 暫時停用，始終返回空陣列
    isAdmin: false,
    isLoading: false,
    error: null,
    mutate,
  }
}
