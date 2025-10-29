/**
 * 系統狀態檢查 Hook
 *
 * 功能：
 * - 從 /api/system/status 獲取系統狀態
 * - 檢查交易系統和維護模式是否啟用
 * - 使用快取機制（60秒 TTL）避免過多請求
 *
 * 使用範例：
 * ```tsx
 * const { tradingEnabled, maintenanceMode, isLoading } = useSystemStatus()
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { clientLogger } from '@/lib/logger'

// =====================================================
// 類型定義
// =====================================================

interface SystemStatus {
  trading: {
    enabled: boolean
  }
  maintenance: {
    enabled: boolean
    message: string
  }
}

interface UseSystemStatusReturn {
  tradingEnabled: boolean
  maintenanceMode: boolean
  maintenanceMessage: string
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// =====================================================
// 快取管理
// =====================================================

interface CachedStatus {
  data: SystemStatus
  timestamp: number
}

// 全域快取（跨元件共享）
let globalCache: CachedStatus | null = null
const CACHE_TTL = 60 * 1000 // 60 秒

// =====================================================
// Hook 實作
// =====================================================

export function useSystemStatus(): UseSystemStatusReturn {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  // 獲取系統狀態
  const fetchStatus = useCallback(async (forceRefresh = false) => {
    try {
      // 檢查快取
      if (!forceRefresh && globalCache) {
        const now = Date.now()
        const age = now - globalCache.timestamp

        if (age < CACHE_TTL) {
          // 快取有效，直接使用
          if (isMountedRef.current) {
            setStatus(globalCache.data)
            setIsLoading(false)
          }
          clientLogger.debug('系統狀態：使用快取', { age })
          return
        }
      }

      // 快取失效或強制刷新，重新請求
      if (isMountedRef.current) {
        setIsLoading(true)
        setError(null)
      }

      const response = await fetch('/api/system/status')

      if (!response.ok) {
        throw new Error('獲取系統狀態失敗')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || '獲取系統狀態失敗')
      }

      // 更新全域快取
      globalCache = {
        data: data.data,
        timestamp: Date.now()
      }

      if (isMountedRef.current) {
        setStatus(data.data)
        setIsLoading(false)
      }

      clientLogger.debug('系統狀態已更新', { data: data.data })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知錯誤'
      if (isMountedRef.current) {
        setError(errorMessage)
        setIsLoading(false)
      }
      clientLogger.error('獲取系統狀態失敗', { error: err })
    }
  }, [])

  // 初始載入
  useEffect(() => {
    isMountedRef.current = true
    fetchStatus()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchStatus])

  return {
    tradingEnabled: status?.trading?.enabled ?? true, // 預設啟用（容錯）
    maintenanceMode: status?.maintenance?.enabled ?? false,
    maintenanceMessage: status?.maintenance?.message ?? '',
    isLoading,
    error,
    refetch: () => fetchStatus(true)
  }
}
