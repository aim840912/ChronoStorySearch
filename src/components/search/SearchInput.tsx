'use client'

import { useState, useRef, useEffect } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SearchTypeFilter } from '@/types'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onFocus: () => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  containerRef?: RefObject<HTMLDivElement | null>
  placeholder?: string
  /** 搜尋類型篩選 */
  searchType?: SearchTypeFilter
  /** 搜尋類型變更回調 */
  onSearchTypeChange?: (type: SearchTypeFilter) => void
}

/** 類型選項配置 */
const TYPE_OPTIONS: { value: SearchTypeFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'search.type.all' },
  { value: 'monster', labelKey: 'search.type.monster' },
  { value: 'item', labelKey: 'search.type.item' },
]

/**
 * 搜尋輸入框元件
 * 包含類型下拉選單、搜尋圖示和清除按鈕
 */
export function SearchInput({
  value,
  onChange,
  onFocus,
  onKeyDown,
  containerRef,
  placeholder,
  searchType = 'all',
  onSearchTypeChange,
}: SearchInputProps) {
  const { t } = useLanguage()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTypeSelect = (type: SearchTypeFilter) => {
    onSearchTypeChange?.(type)
    setIsDropdownOpen(false)
  }

  const currentLabel = TYPE_OPTIONS.find(opt => opt.value === searchType)?.labelKey || 'search.type.all'

  return (
    <div className="relative flex-1" ref={containerRef}>
      {/* 類型下拉選單 */}
      {onSearchTypeChange && (
        <div className="absolute inset-y-0 left-0 flex items-center z-10" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 h-full pl-3 pr-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <span>{t(currentLabel)}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 分隔線 */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* 下拉選單 */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-28 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTypeSelect(option.value)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                    searchType === option.value
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 搜尋圖示 */}
      <div className={`absolute inset-y-0 flex items-center pointer-events-none ${onSearchTypeChange ? 'left-[88px]' : 'left-0 pl-4'}`}>
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
        className={`w-full pr-12 py-3.5 text-gray-900 dark:text-white bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 focus:shadow-lg focus:shadow-blue-500/10 placeholder-gray-400 dark:placeholder-gray-500 transition-all ${onSearchTypeChange ? 'pl-[116px]' : 'pl-12'}`}
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
