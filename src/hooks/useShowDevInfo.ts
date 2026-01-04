'use client'

import { useAuth } from '@/contexts/AuthContext'

/**
 * 判斷是否顯示開發資訊（如怪物/物品 ID）
 *
 * 顯示條件：
 * - 開發環境 (NODE_ENV === 'development')
 * - 或已登入的 Admin 用戶
 *
 * 使用範例：
 * ```tsx
 * const showDevInfo = useShowDevInfo()
 * {showDevInfo && <p>ID: {itemId}</p>}
 * ```
 */
export function useShowDevInfo(): boolean {
  const { isAdmin } = useAuth()
  const isDev = process.env.NODE_ENV === 'development'

  return isDev || isAdmin
}
