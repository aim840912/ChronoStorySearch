/**
 * 系統設定管理 Hook
 *
 * 功能：
 * - 載入系統設定
 * - 更新系統設定
 * - 處理載入和更新狀態
 * - Toast 通知
 *
 * 使用範例：
 * ```tsx
 * const { settings, isLoading, updateSetting } = useSystemSettings()
 * ```
 */

import { useState, useEffect, useCallback } from 'react'
import { useToast } from './useToast'
import { clientLogger } from '@/lib/logger'

// =====================================================
// 類型定義
// =====================================================

export interface SystemSetting {
  key: string
  value: boolean | string
  description: string
  updated_at: string
  updated_by: string | null
}

interface UseSystemSettingsReturn {
  settings: SystemSetting[]
  isLoading: boolean
  isUpdating: boolean
  error: string | null
  updateSetting: (key: string, value: boolean | string) => Promise<void>
  refetch: () => Promise<void>
}

// =====================================================
// Hook 實作
// =====================================================

export function useSystemSettings(): UseSystemSettingsReturn {
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  // 載入系統設定
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/system-settings', {
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('您沒有權限存取系統設定')
        }
        throw new Error('載入系統設定失敗')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || '載入系統設定失敗')
      }

      setSettings(data.data || [])
      clientLogger.debug('系統設定載入成功', { count: data.data?.length })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知錯誤'
      setError(errorMessage)
      clientLogger.error('載入系統設定失敗', { error: err })
      toast.showToast(`載入失敗：${errorMessage}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }, []) // 移除 toast 依賴

  // 更新系統設定
  const updateSetting = useCallback(
    async (key: string, value: boolean | string) => {
      try {
        setIsUpdating(true)

        const response = await fetch('/api/admin/system-settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ key, value })
        })

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('您沒有權限更新系統設定')
          }
          throw new Error('更新系統設定失敗')
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.message || '更新系統設定失敗')
        }

        // 更新本地狀態
        setSettings((prev) =>
          prev.map((setting) =>
            setting.key === key ? { ...setting, ...data.data } : setting
          )
        )

        clientLogger.info('系統設定更新成功', { key, value })
        toast.showToast(`設定已更新`, 'success')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '未知錯誤'
        clientLogger.error('更新系統設定失敗', { error: err, key, value })
        toast.showToast(`更新失敗：${errorMessage}`, 'error')
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    [] // 移除 toast 依賴
  )

  // 初始載入（只執行一次）
  useEffect(() => {
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 只在 mount 時執行一次

  return {
    settings,
    isLoading,
    isUpdating,
    error,
    updateSetting,
    refetch: fetchSettings
  }
}
