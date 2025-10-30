/**
 * 刊登數量限制設定卡片
 *
 * 功能：
 * - 顯示每個用戶可建立的最大刊登數量
 * - 編輯數量限制（範圍 1-10）
 * - 顯示最後更新時間
 *
 * 使用範例：
 * ```tsx
 * <MaxListingsCard
 *   maxListings={5}
 *   updatedAt={settings.updated_at}
 *   onUpdate={handleUpdate}
 *   isUpdating={isUpdating}
 * />
 * ```
 */

'use client'

import { useState } from 'react'

interface MaxListingsCardProps {
  /** 每用戶最大刊登數量 */
  maxListings: number
  /** 最後更新時間 */
  updatedAt: string
  /** 更新回調 */
  onUpdate: (value: number) => Promise<void>
  /** 是否更新中 */
  isUpdating: boolean
}

export function MaxListingsCard({
  maxListings,
  updatedAt,
  onUpdate,
  isUpdating
}: MaxListingsCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedValue, setEditedValue] = useState(maxListings)
  const [error, setError] = useState<string | null>(null)

  const handleEdit = () => {
    setEditedValue(maxListings)
    setError(null)
    setIsEditing(true)
  }

  const handleSave = async () => {
    // 驗證範圍
    if (editedValue < 1 || editedValue > 10) {
      setError('數量必須在 1-10 之間')
      return
    }

    if (editedValue !== maxListings) {
      await onUpdate(editedValue)
    }
    setIsEditing(false)
    setError(null)
  }

  const handleCancel = () => {
    setEditedValue(maxListings)
    setError(null)
    setIsEditing(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value)) {
      setEditedValue(value)
      setError(null)
    }
  }

  // 格式化時間
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      {/* 標題區域 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {/* 圖示 */}
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>

            {/* 標題和說明 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                刊登數量限制
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                設定每個用戶可以建立的最大活躍刊登數量
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 當前數量顯示 */}
      {!isEditing ? (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {maxListings}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                個刊登 / 每用戶
              </span>
            </div>
            <button
              onClick={handleEdit}
              disabled={isUpdating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
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
              編輯
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              最大刊登數量（1-10）
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={editedValue}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                error
                  ? 'border-red-500 dark:border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isUpdating || !!error}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
            >
              儲存變更
            </button>
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 最後更新時間 */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        最後更新：{formatTime(updatedAt)}
      </div>

      {/* 提示訊息 */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <svg
            className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-blue-800 dark:text-blue-300">
            此設定控制每個用戶同時可以擁有的活躍刊登數量上限。建議範圍：3-10 個。更新後約 10 秒內生效。
          </p>
        </div>
      </div>
    </div>
  )
}
