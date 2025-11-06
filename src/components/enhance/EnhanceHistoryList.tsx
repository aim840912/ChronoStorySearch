'use client'

import type { EnhanceHistory } from '@/types/enhance'
import { useLanguage } from '@/contexts/LanguageContext'

interface EnhanceHistoryListProps {
  history: EnhanceHistory[]
}

export function EnhanceHistoryList({ history }: EnhanceHistoryListProps) {
  const { language } = useLanguage()

  if (history.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg">
        尚無強化記錄
      </div>
    )
  }

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'destroyed':
        return (
          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      default:
        return null
    }
  }

  const getResultText = (result: string) => {
    switch (result) {
      case 'success':
        return <span className="text-green-600 dark:text-green-400 font-semibold">成功</span>
      case 'failed':
        return <span className="text-yellow-600 dark:text-yellow-400 font-semibold">失敗</span>
      case 'destroyed':
        return <span className="text-red-600 dark:text-red-400 font-semibold">毀滅</span>
      default:
        return null
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return '剛剛'
    if (diffMins < 60) return `${diffMins} 分鐘前`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} 小時前`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays} 天前`

    return date.toLocaleDateString('zh-TW')
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* 結果圖示 */}
              <div className="flex-shrink-0">
                {getResultIcon(entry.result)}
              </div>

              {/* 內容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-900 dark:text-gray-100 truncate">
                    {language === 'zh-TW' ? entry.equipmentChineseName : entry.equipmentName}
                  </span>
                  <span className="text-gray-500">使用</span>
                  <span className="text-blue-600 dark:text-blue-400 truncate">
                    {language === 'zh-TW' ? entry.scrollChineseName : entry.scrollName}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatTime(entry.timestamp)}</span>
                  <span>·</span>
                  {getResultText(entry.result)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
