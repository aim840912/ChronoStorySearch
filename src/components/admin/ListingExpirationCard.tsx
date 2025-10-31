/**
 * 刊登過期天數設定卡片
 *
 * 功能：
 * - 顯示刊登過期天數設定
 * - 編輯過期天數（範圍 7-90 天）
 * - 顯示最後更新時間
 *
 * 使用範例：
 * ```tsx
 * <ListingExpirationCard
 *   expirationDays={30}
 *   updatedAt={settings.updated_at}
 *   onUpdate={handleUpdate}
 *   isUpdating={isUpdating}
 * />
 * ```
 */

'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface ListingExpirationCardProps{
  /** 刊登過期天數 */
  expirationDays: number
  /** 最後更新時間 */
  updatedAt: string
  /** 更新回調 */
  onUpdate: (value: number) => Promise<void>
  /** 是否更新中 */
  isUpdating: boolean
}

export function ListingExpirationCard({
  expirationDays,
  updatedAt,
  onUpdate,
  isUpdating
}: ListingExpirationCardProps) {
  const { t } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [editedValue, setEditedValue] = useState(expirationDays)
  const [error, setError] = useState<string | null>(null)

  const handleEdit = () => {
    setEditedValue(expirationDays)
    setError(null)
    setIsEditing(true)
  }

  const handleSave = async () => {
    // 驗證範圍
    if (editedValue < 7 || editedValue > 90) {
      setError(t('admin.listingExpiration.error'))
      return
    }

    if (editedValue !== expirationDays) {
      await onUpdate(editedValue)
    }
    setIsEditing(false)
    setError(null)
  }

  const handleCancel = () => {
    setEditedValue(expirationDays)
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
                className="w-6 h-6 text-orange-600 dark:text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            {/* 標題和說明 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.listingExpiration.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('admin.listingExpiration.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 當前天數顯示 */}
      {!isEditing ? (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {expirationDays}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('admin.listingExpiration.daysAfter')}
              </span>
            </div>
            <button
              onClick={handleEdit}
              disabled={isUpdating}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
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
              {t('admin.listingExpiration.edit')}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('admin.listingExpiration.label')}
            </label>
            <input
              type="number"
              min="7"
              max="90"
              value={editedValue}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
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
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
            >
              {t('admin.listingExpiration.save')}
            </button>
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors"
            >
              {t('admin.listingExpiration.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* 最後更新時間 */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        {t('admin.listingExpiration.lastUpdated')}{formatTime(updatedAt)}
      </div>

      {/* 提示訊息 */}
      <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800">
        <div className="flex items-start gap-2">
          <svg
            className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0"
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
          <div className="text-xs text-orange-800 dark:text-orange-300 space-y-1">
            <p>{t('admin.listingExpiration.hintTitle')}</p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li><strong>{t('admin.listingExpiration.hint7Days')}</strong>：{t('admin.listingExpiration.hint7DaysDesc')}</li>
              <li><strong>{t('admin.listingExpiration.hint30Days')}</strong>：{t('admin.listingExpiration.hint30DaysDesc')}</li>
              <li><strong>{t('admin.listingExpiration.hint60Days')}</strong>：{t('admin.listingExpiration.hint60DaysDesc')}</li>
            </ul>
            <p className="mt-1">{t('admin.listingExpiration.hintFooter')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
