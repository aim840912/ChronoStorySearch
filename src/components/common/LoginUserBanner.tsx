/**
 * 登入使用者公告橫幅
 *
 * 功能：
 * - 向登入使用者顯示全域公告訊息
 * - 支援管理員在後台設定公告內容
 * - 只有登入使用者才會看到此橫幅
 * - 支援深色模式
 * - 固定在頁面頂部，不可關閉
 *
 * 使用位置：
 * - src/app/layout.tsx（Root Layout，在 MaintenanceBanner 下方）
 *
 * 設計規範：
 * - ❌ 不使用漸層（遵循 CLAUDE.md UI 規範）
 * - ❌ 不使用 Emoji（遵循 CLAUDE.md UI 規範）
 * - ✅ 使用 SVG 資訊圖示
 * - ✅ 支援深色模式
 * - ✅ 使用藍色（資訊色），與維護模式的琥珀色區分
 */

'use client'

import { useSystemStatus } from '@/hooks/useSystemStatus'
import { useAuth } from '@/contexts/AuthContext'

export function LoginUserBanner() {
  const { loginBannerEnabled, loginBannerMessage, isLoading } = useSystemStatus()
  const { user, loading: isAuthLoading } = useAuth()

  // 載入中、未登入、或未啟用時不顯示
  if (isLoading || isAuthLoading || !user || !loginBannerEnabled) {
    return null
  }

  return (
    <div
      className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-3 text-center"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto">
        {/* 資訊圖示 */}
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>

        {/* 公告訊息 */}
        <span className="font-medium text-sm sm:text-base">
          {loginBannerMessage}
        </span>
      </div>
    </div>
  )
}
