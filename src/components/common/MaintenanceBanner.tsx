/**
 * 維護模式通知橫幅
 *
 * 功能：
 * - 當系統進入維護模式時，在頁面頂部顯示警告橫幅
 * - 顯示管理員設定的自訂維護訊息
 * - 支援深色模式
 * - 固定在頁面頂部，不可關閉
 *
 * 使用位置：
 * - src/app/layout.tsx（Root Layout）
 *
 * 設計規範：
 * - ❌ 不使用漸層（遵循 CLAUDE.md UI 規範）
 * - ❌ 不使用 Emoji（遵循 CLAUDE.md UI 規範）
 * - ✅ 使用 SVG 警告圖示
 * - ✅ 支援深色模式
 */

'use client'

import { useSystemStatus } from '@/hooks/swr/useSystemStatus'
import { useLanguage } from '@/contexts/LanguageContext'

export function MaintenanceBanner() {
  const { maintenanceMode, maintenanceMessage, isLoading } = useSystemStatus()
  const { t } = useLanguage()

  // 載入中或未啟用維護模式時不顯示
  if (isLoading || !maintenanceMode) {
    return null
  }

  // 使用自訂訊息，如果為空則使用預設訊息
  const displayMessage = maintenanceMessage || t('maintenance.defaultMessage')

  return (
    <div
      className="bg-amber-500 dark:bg-amber-600 text-white px-4 py-3 text-center"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto">
        {/* 警告圖示 */}
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>

        {/* 維護訊息 */}
        <span className="font-medium text-sm sm:text-base">
          {t('maintenance.bannerPrefix')} {displayMessage}
        </span>
      </div>
    </div>
  )
}
