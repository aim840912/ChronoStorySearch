'use client'

import { memo } from 'react'
import type { ExpHistoryProps } from '@/types/exp-tracker'
import { formatExp } from '@/lib/exp-calculator'

/**
 * 經驗歷史記錄元件
 * 顯示最近的經驗記錄，支援匯出 CSV
 */
export const ExpHistory = memo(function ExpHistory({
  history,
  onExport,
  onClear,
  t,
}: ExpHistoryProps) {
  // 取得最近 10 筆記錄（反向顯示，最新的在上面）
  const recentHistory = [...history].slice(-10).reverse()

  // 下載圖示
  const DownloadIcon = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )

  // 清除圖示
  const TrashIcon = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )

  // 格式化時間
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // 計算每分鐘經驗（與前一筆記錄比較）
  // recentHistory 是反向排序（最新在前），所以 index+1 是時間上的前一筆
  const calculateExpPerMin = (currentIndex: number): number | null => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= recentHistory.length) return null

    const current = recentHistory[currentIndex]
    const previous = recentHistory[nextIndex]
    const timeDiffMs = current.timestamp - previous.timestamp
    const expDiff = current.exp - previous.exp

    if (timeDiffMs <= 0) return null

    const timeDiffMin = timeDiffMs / 60000
    return Math.round(expDiff / timeDiffMin)
  }

  return (
    <div className="space-y-3">
      {/* 標題和操作按鈕 */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('history')} ({history.length})
        </h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onExport}
            disabled={history.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                       bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300
                       rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            <DownloadIcon />
            {t('exportCsv')}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={history.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                       bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300
                       rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            <TrashIcon />
            {t('clearHistory')}
          </button>
        </div>
      </div>

      {/* 歷史記錄列表 */}
      {history.length === 0 ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          {t('noData')}
        </div>
      ) : (
        <div className="max-h-40 overflow-y-auto space-y-1">
          {recentHistory.map((record, index) => {
            const expPerMin = calculateExpPerMin(index)
            return (
              <div
                key={record.timestamp}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
              >
                <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">
                  {formatTime(record.timestamp)}
                </span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {formatExp(record.exp)}
                </span>
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    expPerMin === null
                      ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      : expPerMin >= 0
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}
                >
                  {expPerMin === null ? '-' : `${expPerMin >= 0 ? '+' : ''}${formatExp(expPerMin)}/min`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
