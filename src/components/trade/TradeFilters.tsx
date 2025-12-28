'use client'

import { memo, useRef } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TradeType } from '@/types/trade'

interface TradeFiltersProps {
  selectedType: TradeType | 'all'
  onTypeChange: (type: TradeType | 'all') => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

/**
 * 交易篩選器
 * 包含交易類型篩選和物品搜尋
 */
export const TradeFilters = memo(function TradeFilters({
  selectedType,
  onTypeChange,
  searchQuery,
  onSearchChange,
}: TradeFiltersProps) {
  const { t } = useLanguage()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const typeOptions: Array<{ value: TradeType | 'all'; label: string }> = [
    { value: 'all', label: t('trade.allTypes') },
    { value: 'sell', label: t('trade.sell') },
    { value: 'buy', label: t('trade.buy') },
  ]

  return (
    <div className="space-y-3">
      {/* 交易類型篩選 */}
      <div className="flex gap-2">
        {typeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onTypeChange(option.value)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedType === option.value
                ? option.value === 'sell'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  : option.value === 'buy'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 物品搜尋 */}
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('trade.searchPlaceholder')}
          className="w-full px-4 py-2.5 pl-10 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-3 w-4 h-4 text-gray-400"
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
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-2.5 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
})
