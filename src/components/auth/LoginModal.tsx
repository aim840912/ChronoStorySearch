'use client'

import { useState, useEffect } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * LoginModal 元件
 *
 * 顯示 Discord OAuth 登入介面的 Modal
 *
 * 功能：
 * - 顯示「使用 Discord 登入」按鈕
 * - 顯示載入狀態（spinner + 「跳轉中...」）
 * - 顯示錯誤訊息（在 Modal 內）
 * - 透過 CustomEvent 'show-login-modal' 觸發
 * - 支援從任何地方觸發（API 401 錯誤、手動觸發等）
 *
 * 觸發方式：
 * ```typescript
 * // 方式 1: 從 JavaScript 觸發
 * window.dispatchEvent(new CustomEvent('show-login-modal'))
 *
 * // 方式 2: 帶錯誤訊息觸發
 * window.dispatchEvent(new CustomEvent('show-login-modal', {
 *   detail: { error: '需要登入才能使用此功能' }
 * }))
 * ```
 *
 * 參考文件：
 * - docs/architecture/交易系統/09-設計決策記錄.md (DDR-003)
 */
export function LoginModal() {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 處理登入按鈕點擊
   * 設置載入狀態並導向 Discord OAuth
   */
  const handleLogin = () => {
    setIsLoading(true)
    setError(null)

    // 延遲導向以顯示載入狀態
    setTimeout(() => {
      window.location.href = '/api/auth/discord'
    }, 300)
  }

  /**
   * 關閉 Modal
   * 重置所有狀態
   */
  const handleClose = () => {
    setIsOpen(false)
    setError(null)
    setIsLoading(false)
  }

  /**
   * 監聽 CustomEvent 'show-login-modal'
   * 從任何地方都可以觸發此 Modal
   */
  useEffect(() => {
    const handleShowLoginModal = (event: Event) => {
      const customEvent = event as CustomEvent<{ error?: string }>

      // 如果帶有錯誤訊息，顯示錯誤
      if (customEvent.detail?.error) {
        setError(customEvent.detail.error)
      }

      setIsOpen(true)
      setIsLoading(false)
    }

    window.addEventListener('show-login-modal', handleShowLoginModal)

    return () => {
      window.removeEventListener('show-login-modal', handleShowLoginModal)
    }
  }, [])

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-md"
      zIndex="z-[70]" // 高於其他 Modal（市場 Modal 是 z-50，刊登詳情是 z-[60]）
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
        {/* Modal 標題 */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('auth.loginRequired')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('auth.loginDescription')}
          </p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">
              {error}
            </p>
          </div>
        )}

        {/* Discord 登入按鈕 */}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full px-6 py-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-3 bg-[#5865F2] text-white hover:bg-[#4752C4] disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          aria-label={t('auth.loginWithDiscord')}
        >
          {isLoading ? (
            <>
              {/* Loading Spinner */}
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>{t('auth.redirecting')}</span>
            </>
          ) : (
            <>
              {/* Discord 圖標 */}
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span className="text-base">{t('auth.loginWithDiscord')}</span>
            </>
          )}
        </button>

        {/* 說明文字 */}
        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          {t('auth.loginNote')}
        </p>
      </div>
    </BaseModal>
  )
}
