'use client'

import { memo } from 'react'
import type { SavedRecordsProps } from '@/types/exp-tracker'
import { formatExp } from '@/lib/exp-calculator'

/**
 * 已儲存的經驗記錄列表
 * 顯示怪物名稱、分鐘數、每分鐘經驗、總經驗
 */
export const SavedRecords = memo(function SavedRecords({
  records,
  onEdit,
  onDelete,
  t,
}: SavedRecordsProps) {
  if (records.length === 0) {
    return null
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('savedRecords')} ({records.length})
      </h4>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {records.map((record) => (
          <div
            key={record.id}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* 怪物名稱 */}
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {record.monsterName}
                </p>

                {/* 詳細資訊 */}
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {record.minutes} {t('minuteUnit')}
                  </span>
                  <span>
                    {formatExp(record.expPerMinute)}/{t('minuteUnit')}
                  </span>
                </div>

                {/* 總經驗和時間 */}
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-green-600 dark:text-green-400 font-mono">
                    {formatExp(record.totalExp)}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(record.savedAt)}
                  </span>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex items-center gap-1">
                {/* 編輯按鈕 */}
                <button
                  onClick={() => onEdit(record)}
                  className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  aria-label={t('edit')}
                >
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>

                {/* 刪除按鈕 */}
                <button
                  onClick={() => onDelete(record.id)}
                  className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  aria-label={t('delete')}
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
