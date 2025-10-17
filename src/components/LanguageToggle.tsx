'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { Language } from '@/types'

/**
 * 語言切換按鈕元件
 * 顯示當前語言並提供切換功能
 */
export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()

  const toggleLanguage = () => {
    const newLanguage: Language = language === 'zh-TW' ? 'en' : 'zh-TW'
    setLanguage(newLanguage)
  }

  return (
    <button
      onClick={toggleLanguage}
      className="px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm hover:shadow-md"
      aria-label="切換語言 / Switch Language"
    >
      {/* 地球圖標 */}
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {/* 語言文字 */}
      <span className="text-sm">{t(`language.${language === 'zh-TW' ? 'zhTW' : 'en'}`)}</span>
    </button>
  )
}
