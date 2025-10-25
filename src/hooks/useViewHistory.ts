import { useState, useCallback, useEffect } from 'react'
import type { ViewHistoryItem } from '@/types'
import { getViewHistory, setViewHistory } from '@/lib/storage'
import { storageLogger } from '@/lib/logger'

const MAX_HISTORY_ITEMS = 15 // 最多儲存 15 筆歷史記錄（與首頁顯示數量一致）

/**
 * 瀏覽歷史管理 Hook
 *
 * 功能：
 * - 追蹤使用者最近瀏覽的怪物和物品
 * - 自動去重（相同項目只保留最新的瀏覽時間）
 * - 限制最多 15 筆記錄
 * - 使用 localStorage 持久化儲存
 */
export function useViewHistory() {
  const [history, setHistory] = useState<ViewHistoryItem[]>([])

  // 初始化：從 localStorage 載入歷史記錄
  useEffect(() => {
    const savedHistory = getViewHistory()

    // 如果超過上限，自動截斷並遷移舊資料
    if (savedHistory.length > MAX_HISTORY_ITEMS) {
      const migratedHistory = savedHistory
        .sort((a, b) => b.viewedAt - a.viewedAt)  // 按時間排序（最新的在前）
        .slice(0, MAX_HISTORY_ITEMS)  // 只保留最新的 15 筆

      setViewHistory(migratedHistory)  // 重新儲存到 localStorage
      setHistory(migratedHistory)
      storageLogger.info('遷移瀏覽歷史資料', {
        from: savedHistory.length,
        to: migratedHistory.length
      })
    } else {
      setHistory(savedHistory)
      storageLogger.debug('載入瀏覽歷史', { count: savedHistory.length })
    }
  }, [])

  /**
   * 記錄新的瀏覽項目
   *
   * @param type - 類型（怪物或物品）
   * @param id - ID
   * @param name - 名稱
   */
  const recordView = useCallback((type: 'monster' | 'item', id: number, name: string) => {
    setHistory(currentHistory => {
      // 建立新的歷史項目
      const newItem: ViewHistoryItem = {
        type,
        id,
        name,
        viewedAt: Date.now(),
      }

      // 使用 Map 去重：相同 type + id 的項目只保留最新的
      const historyMap = new Map<string, ViewHistoryItem>()

      // 先加入新項目
      const key = `${type}-${id}`
      historyMap.set(key, newItem)

      // 再加入舊的歷史（如果 key 重複，會被新項目覆蓋）
      currentHistory.forEach(item => {
        const itemKey = `${item.type}-${item.id}`
        if (!historyMap.has(itemKey)) {
          historyMap.set(itemKey, item)
        }
      })

      // 轉換回陣列，並按時間排序（最新的在前面）
      const updatedHistory = Array.from(historyMap.values())
        .sort((a, b) => b.viewedAt - a.viewedAt)
        .slice(0, MAX_HISTORY_ITEMS) // 限制最多 15 筆

      // 儲存到 localStorage
      setViewHistory(updatedHistory)
      storageLogger.debug('記錄瀏覽歷史', { type, id, name, total: updatedHistory.length })

      return updatedHistory
    })
  }, [])

  /**
   * 清除所有瀏覽歷史
   */
  const clearHistory = useCallback(() => {
    setHistory([])
    setViewHistory([])
    storageLogger.info('清除所有瀏覽歷史')
  }, [])

  return {
    history,
    recordView,
    clearHistory,
    historyCount: history.length,
  }
}
