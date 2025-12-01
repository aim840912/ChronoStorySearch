'use client'

import type { KeyboardEvent, RefObject } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onFocus: () => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  containerRef?: RefObject<HTMLDivElement | null>
  placeholder?: string
}

/**
 * 搜尋輸入框元件
 * 包含搜尋圖示和清除按鈕
 */
export function SearchInput({
  value,
  onChange,
  onFocus,
  onKeyDown,
  containerRef,
  placeholder,
}: SearchInputProps) {
  const { t } = useLanguage()

  return (
    <div className="relative flex-1" ref={containerRef}>
      {/* 搜尋圖示 */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* 搜尋輸入框 - 視覺焦點 */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder || t('search.placeholder')}
        className="w-full pl-12 pr-12 py-3.5 text-gray-900 dark:text-white bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 focus:shadow-lg focus:shadow-blue-500/10 placeholder-gray-400 dark:placeholder-gray-500 transition-all"
      />

      {/* 清除按鈕 */}
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label={t('search.clear')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
