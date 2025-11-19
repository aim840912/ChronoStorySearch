/**
 * 刊登統計管理 Hook
 *
 * 功能：
 * - 載入刊登統計資料
 * - 自動刷新（60秒間隔）
 * - 手動刷新功能
 * - 處理載入和錯誤狀態
 * - Page Visibility API 優化（頁面隱藏時停止刷新）
 *
 * 使用範例：
 * ```tsx
 * const { statistics, isLoading, error, refetch } = useListingsStatistics()
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from './useToast'
import { clientLogger } from '@/lib/logger'

// =====================================================
// 類型定義
// =====================================================

export interface ListingsStatistics {
  /** 總活躍刊登數 */
  totalActive: number

  /** 按狀態分類統計 */
  byStatus: {
    active: number
    completed: number
    expired: number
    cancelled: number
  }

  /** 按交易類型分類統計（僅統計活躍刊登） */
  byTradeType: {
    buy: number
    sell: number
    exchange: number
  }

  /** 最近 24 小時新增數量 */
  last24Hours: number

  /** 統計時間 */
  timestamp: string
}

interface UseListingsStatisticsReturn {
  statistics: ListingsStatistics | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// =====================================================
// Hook 實作
// =====================================================

const AUTO_REFRESH_INTERVAL = 60000 // 60 秒自動刷新（優化流量消耗）

export function useListingsStatistics(): UseListingsStatisticsReturn {
  const [statistics, setStatistics] = useState<ListingsStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 載入統計資料
  const fetchStatistics = useCallback(async (showToastMessage = false) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/statistics/listings', {
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('您沒有權限存取統計資料')
        }
        throw new Error('載入統計資料失敗')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || '載入統計資料失敗')
      }

      setStatistics(data.data)
      clientLogger.debug('刊登統計載入成功', { data: data.data })

      if (showToastMessage) {
        showToast('統計資料已更新', 'success')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知錯誤'
      setError(errorMessage)
      clientLogger.error('載入刊登統計失敗', { error: err })

      if (showToastMessage) {
        showToast(`載入失敗：${errorMessage}`, 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  // 手動刷新（顯示 toast）
  const refetch = useCallback(async () => {
    await fetchStatistics(true)
  }, [fetchStatistics])

  // 啟動自動刷新
  const startAutoRefresh = useCallback(() => {
    // 清除現有的計時器
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // 設定新的自動刷新計時器
    intervalRef.current = setInterval(() => {
      fetchStatistics(false)
    }, AUTO_REFRESH_INTERVAL)

    clientLogger.debug('自動刷新已啟動', { interval: AUTO_REFRESH_INTERVAL })
  }, [fetchStatistics])

  // 停止自動刷新
  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      clientLogger.debug('自動刷新已停止')
    }
  }, [])

  // 初始載入 + 設定自動刷新
  useEffect(() => {
    // 初始載入
    fetchStatistics(false)

    // 啟動自動刷新
    startAutoRefresh()

    // 清理函數
    return () => {
      stopAutoRefresh()
    }
  }, [fetchStatistics, startAutoRefresh, stopAutoRefresh])

  // Page Visibility API - 頁面隱藏時停止刷新，節省資源
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 頁面隱藏（切換到其他分頁或最小化），停止自動刷新
        stopAutoRefresh()
        clientLogger.debug('頁面隱藏，自動刷新已暫停')
      } else {
        // 頁面可見（回到前台），立即刷新並恢復自動刷新
        clientLogger.debug('頁面可見，恢復自動刷新')
        fetchStatistics(false) // 立即刷新一次
        startAutoRefresh() // 恢復自動刷新
      }
    }

    // 監聽頁面可見性變化
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 清理函數
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchStatistics, startAutoRefresh, stopAutoRefresh])

  return {
    statistics,
    isLoading,
    error,
    refetch
  }
}
