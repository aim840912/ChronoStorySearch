'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Theme } from '@/types'

/**
 * 主題切換按鈕元件
 * 支援 light / dark / system 三種模式循環切換
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useLanguage()

  const toggleTheme = () => {
    // 循環切換：light → dark → system → light
    const nextTheme: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(nextTheme)
  }

  // 根據主題返回對應的圖標
  const renderIcon = () => {
    if (theme === 'light') {
      // 太陽圖標
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )
    } else if (theme === 'dark') {
      // 月亮圖標
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )
    } else {
      // 電腦/系統圖標
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      )
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className="px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm hover:shadow-md"
      aria-label={t('theme.toggle')}
    >
      {renderIcon()}
      <span className="text-sm">{t(`theme.${theme}`)}</span>
    </button>
  )
}
