/**
 * 交易系統設定卡片
 *
 * 功能：
 * - 顯示交易系統開關狀態
 * - Toggle 切換啟用/停用
 * - 顯示最後更新時間
 *
 * 使用範例：
 * ```tsx
 * <TradingSystemCard
 *   enabled={settings.trading_system_enabled}
 *   updatedAt={settings.updated_at}
 *   onToggle={handleToggle}
 *   isUpdating={isUpdating}
 * />
 * ```
 */

'use client'

import { Toggle } from '@/components/common/Toggle'
import { useLanguage } from '@/contexts/LanguageContext'

interface TradingSystemCardProps {
  /** 是否啟用交易系統 */
  enabled: boolean
  /** 最後更新時間 */
  updatedAt: string
  /** 切換回調 */
  onToggle: (enabled: boolean) => Promise<void>
  /** 是否更新中 */
  isUpdating: boolean
}

export function TradingSystemCard({
  enabled,
  updatedAt,
  onToggle,
  isUpdating
}: TradingSystemCardProps) {
  const { t } = useLanguage()

  const handleToggle = async (newValue: boolean) => {
    await onToggle(newValue)
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
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>

            {/* 標題和說明 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.tradingSystem.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('admin.tradingSystem.description')}
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
            ariaLabel={t('admin.tradingSystem.toggle')}
          />
        </div>
      </div>

      {/* 狀態指示器 */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-2 h-2 rounded-full ${
            enabled
              ? 'bg-green-500 dark:bg-green-400'
              : 'bg-red-500 dark:bg-red-400'
          }`}
        />
        <span
          className={`text-sm font-medium ${
            enabled
              ? 'text-green-700 dark:text-green-400'
              : 'text-red-700 dark:text-red-400'
          }`}
        >
          {enabled
            ? t('admin.status.enabled')
            : t('admin.status.disabled')}
        </span>
      </div>

      {/* 最後更新時間 */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {t('admin.lastUpdated')}：{formatTime(updatedAt)}
      </div>

      {/* 說明文字 */}
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
            {enabled
              ? t('admin.tradingSystem.statusOnInfo')
              : t('admin.tradingSystem.statusOffInfo')}
          </p>
        </div>
      </div>
    </div>
  )
}
