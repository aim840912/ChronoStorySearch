/**
 * 登入使用者公告設定卡片
 *
 * 功能：
 * - 顯示登入使用者公告開關狀態
 * - Toggle 切換啟用/停用
 * - 編輯公告訊息
 * - 顯示最後更新時間
 *
 * 使用範例：
 * ```tsx
 * <LoginBannerCard
 *   enabled={settings.login_banner_enabled}
 *   message={settings.login_banner_message}
 *   updatedAt={settings.updated_at}
 *   onToggle={handleToggle}
 *   onUpdateMessage={handleUpdateMessage}
 *   isUpdating={isUpdating}
 * />
 * ```
 */

'use client'

import { useState } from 'react'
import { Toggle } from '@/components/common/Toggle'
import { useLanguage } from '@/contexts/LanguageContext'

interface LoginBannerCardProps {
  /** 是否啟用登入使用者公告 */
  enabled: boolean
  /** 公告訊息 */
  message: string
  /** 最後更新時間 */
  updatedAt: string
  /** 切換回調 */
  onToggle: (enabled: boolean) => Promise<void>
  /** 更新訊息回調 */
  onUpdateMessage: (message: string) => Promise<void>
  /** 是否更新中 */
  isUpdating: boolean
}

export function LoginBannerCard({
  enabled,
  message,
  updatedAt,
  onToggle,
  onUpdateMessage,
  isUpdating
}: LoginBannerCardProps) {
  const { t } = useLanguage()
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [editedMessage, setEditedMessage] = useState(message)

  const handleToggle = async (newValue: boolean) => {
    await onToggle(newValue)
  }

  const handleSaveMessage = async () => {
    if (editedMessage.trim() !== message) {
      await onUpdateMessage(editedMessage.trim())
    }
    setIsEditingMessage(false)
  }

  const handleCancelEdit = () => {
    setEditedMessage(message)
    setIsEditingMessage(false)
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
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
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
            </div>

            {/* 標題和說明 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.loginBanner.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('admin.loginBanner.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Toggle 開關 */}
        <div className="flex-shrink-0 ml-4">
          <Toggle
            enabled={enabled}
            onChange={handleToggle}
            disabled={isUpdating}
            ariaLabel={t('admin.loginBanner.toggle')}
          />
        </div>
      </div>

      {/* 狀態指示器 */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-2 h-2 rounded-full ${
            enabled
              ? 'bg-blue-500 dark:bg-blue-400'
              : 'bg-gray-400 dark:bg-gray-500'
          }`}
        />
        <span
          className={`text-sm font-medium ${
            enabled
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {enabled
            ? t('admin.loginBanner.enabled')
            : t('admin.loginBanner.disabled')}
        </span>
      </div>

      {/* 公告訊息編輯 */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('admin.loginBanner.message')}
        </label>

        {isEditingMessage ? (
          <div className="space-y-2">
            <textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={t('admin.loginBanner.messagePlaceholder')}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveMessage}
                disabled={isUpdating || !editedMessage.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
              >
                {t('common.save')}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isUpdating}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-md flex-1">
              {message || t('admin.loginBanner.noMessage')}
            </p>
            <button
              onClick={() => setIsEditingMessage(true)}
              disabled={isUpdating}
              className="flex-shrink-0 p-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              aria-label={t('admin.loginBanner.editMessage')}
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
          </div>
        )}
      </div>

      {/* 最後更新時間 */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        {t('admin.lastUpdated')}：{formatTime(updatedAt)}
      </div>

      {/* 說明文字 */}
      {enabled && (
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
              {t('admin.loginBanner.activeInfo')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
