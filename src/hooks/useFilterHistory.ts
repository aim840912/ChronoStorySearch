import { useState, useCallback, useEffect } from 'react'
import type { FilterHistoryRecord, AdvancedFilterOptions } from '@/types'
import { getFilterHistory, setFilterHistory } from '@/lib/storage'
import { storageLogger } from '@/lib/logger'

const MAX_HISTORY_ITEMS = 10 // 最多儲存 10 筆篩選紀錄

/**
 * 篩選歷史紀錄管理 Hook
 *
 * 功能：
 * - 儲存使用者的進階篩選條件
 * - 支援載入、刪除、清除操作
 * - 自動 FIFO（超過上限時刪除最舊的）
 * - 使用 localStorage 持久化儲存
 */
export function useFilterHistory() {
  const [history, setHistory] = useState<FilterHistoryRecord[]>([])

  // 初始化：從 localStorage 載入歷史紀錄
  useEffect(() => {
    const savedHistory = getFilterHistory()

    // 如果超過上限，自動截斷
    if (savedHistory.length > MAX_HISTORY_ITEMS) {
      const trimmedHistory = savedHistory
        .sort((a, b) => b.createdAt - a.createdAt) // 按時間排序（最新的在前）
        .slice(0, MAX_HISTORY_ITEMS)

      setFilterHistory(trimmedHistory)
      setHistory(trimmedHistory)
      storageLogger.info('遷移篩選歷史資料', {
        from: savedHistory.length,
        to: trimmedHistory.length,
      })
    } else {
      setHistory(savedHistory)
      storageLogger.debug('載入篩選歷史', { count: savedHistory.length })
    }
  }, [])

  /**
   * 儲存當前篩選條件
   */
  const saveFilter = useCallback((filter: AdvancedFilterOptions) => {
    setHistory((currentHistory) => {
      // 建立新紀錄
      const newRecord: FilterHistoryRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        filter: { ...filter }, // 深拷貝篩選條件
        createdAt: Date.now(),
      }

      // 新紀錄放在最前面，超過上限時刪除最舊的
      const updatedHistory = [newRecord, ...currentHistory].slice(
        0,
        MAX_HISTORY_ITEMS
      )

      // 儲存到 localStorage
      setFilterHistory(updatedHistory)
      storageLogger.debug('儲存篩選紀錄', { id: newRecord.id })

      return updatedHistory
    })
  }, [])

  /**
   * 載入指定的篩選紀錄
   * @returns 篩選條件，若找不到則返回 null
   */
  const loadFilter = useCallback(
    (id: string): AdvancedFilterOptions | null => {
      const record = history.find((r) => r.id === id)
      if (!record) {
        storageLogger.warn('找不到篩選紀錄', { id })
        return null
      }
      storageLogger.debug('載入篩選紀錄', { id })
      return record.filter
    },
    [history]
  )

  /**
   * 刪除指定的篩選紀錄
   */
  const deleteRecord = useCallback((id: string) => {
    setHistory((currentHistory) => {
      const updatedHistory = currentHistory.filter((r) => r.id !== id)
      setFilterHistory(updatedHistory)
      storageLogger.debug('刪除篩選紀錄', { id })
      return updatedHistory
    })
  }, [])

  /**
   * 清除所有篩選紀錄
   */
  const clearHistory = useCallback(() => {
    setHistory([])
    setFilterHistory([])
    storageLogger.info('清除所有篩選紀錄')
  }, [])

  return {
    history,
    saveFilter,
    loadFilter,
    deleteRecord,
    clearHistory,
    historyCount: history.length,
  }
}
