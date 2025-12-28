'use client'

import { memo } from 'react'
import type { RecordListProps } from '@/types/manual-exp-record'
import { getMonsterImageUrl } from '@/lib/image-utils'

/**
 * 經驗記錄列表
 * 顯示怪物名稱、每小時經驗、記錄日期
 */
export const RecordList = memo(function RecordList({
  records,
  onEdit,
  onDelete,
  t,
}: RecordListProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg
          className="w-12 h-12 mx-auto mb-3 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm">{t('noRecords')}</p>
      </div>
    )
  }

  const formatExp = (value: number): string => {
    return value.toLocaleString()
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
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

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {records.map((record) => (
          <div
            key={record.id}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* 怪物名稱（含圖片） */}
                <div className="flex items-center gap-2">
                  {record.mobId && (
                    <img
                      src={getMonsterImageUrl(record.mobId)}
                      alt=""
                      className="w-8 h-8 object-contain shrink-0"
                    />
                  )}
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {record.monsterName}
                  </p>
                </div>

                {/* 經驗資訊 */}
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-green-600 dark:text-green-400 font-mono">
                    {formatExp(record.expPerHour)}/hr
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(record.updatedAt || record.createdAt)}
                  </span>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex items-center gap-1">
                {/* 編輯按鈕 */}
                <button
                  onClick={() => onEdit(record)}
                  className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  aria-label={t('edit')}
                  title={t('edit')}
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
                  className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  aria-label={t('delete')}
                  title={t('delete')}
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
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
