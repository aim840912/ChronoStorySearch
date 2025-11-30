'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getMonsterImageUrl, getItemImageUrl } from '@/lib/image-utils'
import type { RefObject, KeyboardEvent } from 'react'
import type { SuggestionItem, SearchTypeFilter, FilterMode, AdvancedFilterOptions } from '@/types'

interface SearchBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  searchType: SearchTypeFilter
  onSearchTypeChange: (type: SearchTypeFilter) => void
  suggestions: SuggestionItem[]
  showSuggestions: boolean
  onFocus: () => void
  onSelectSuggestion: (name: string, suggestion?: SuggestionItem) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  focusedIndex: number
  onFocusedIndexChange: (index: number) => void
  searchContainerRef: RefObject<HTMLDivElement | null>
  onShare?: () => void
  placeholder?: string // 自定義 placeholder
  // 收藏按鈕相關
  filterMode?: FilterMode
  onFilterChange?: (mode: FilterMode) => void
  favoriteMonsterCount?: number
  favoriteItemCount?: number
  // 進階篩選相關
  isAdvancedFilterExpanded?: boolean
  onAdvancedFilterToggle?: () => void
  advancedFilterCount?: number
  advancedFilter?: AdvancedFilterOptions
  onResetAdvancedFilter?: () => void
}

/**
 * 搜尋列元件
 * 包含自動完成建議功能
 */
export function SearchBar({
  searchTerm,
  onSearchChange,
  searchType,
  onSearchTypeChange,
  suggestions,
  showSuggestions,
  onFocus,
  onSelectSuggestion,
  onKeyDown,
  focusedIndex,
  onFocusedIndexChange,
  searchContainerRef,
  onShare,
  placeholder,
  filterMode,
  onFilterChange,
  favoriteMonsterCount = 0,
  favoriteItemCount = 0,
  isAdvancedFilterExpanded,
  onAdvancedFilterToggle,
  advancedFilterCount = 0,
  advancedFilter,
  onResetAdvancedFilter,
}: SearchBarProps) {
  const { t } = useLanguage()

  // 追蹤圖片載入失敗的 ID（使用 Set 記錄失敗的 ID）
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set())

  // 處理圖片載入錯誤
  const handleImageError = (type: 'monster' | 'item', id: number) => {
    setFailedImageIds(prev => {
      const newSet = new Set(prev)
      newSet.add(`${type}-${id}`)
      return newSet
    })
  }

  // 檢查圖片是否載入失敗
  const hasImageFailed = (type: 'monster' | 'item', id: number) => {
    return failedImageIds.has(`${type}-${id}`)
  }

  // 生成篩選條件摘要
  const getFilterSummary = (): string => {
    if (!advancedFilter) return ''

    const labels: string[] = []

    // 物品類別
    advancedFilter.itemCategories.forEach(cat => {
      labels.push(t(`filter.itemCategory.${cat}`))
    })

    // 職業
    advancedFilter.jobClasses.forEach(job => {
      labels.push(t(`filter.jobClass.${job}`))
    })

    // 等級範圍
    if (advancedFilter.levelRange.min !== null || advancedFilter.levelRange.max !== null) {
      const min = advancedFilter.levelRange.min ?? 0
      const max = advancedFilter.levelRange.max ?? 200
      labels.push(`Lv ${min}-${max}`)
    }

    // 限制顯示數量（最多3個），其餘用「...」表示
    if (labels.length === 0) {
      return ''
    } else if (labels.length <= 3) {
      return labels.join('、')
    } else {
      return labels.slice(0, 3).join('、') + '...'
    }
  }

  return (
    <div className="max-w-7xl mx-auto mb-6">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* 搜尋類型選擇器 */}
        <div className="flex flex-wrap rounded-lg bg-gray-100 dark:bg-gray-700 p-1 flex-shrink-0 order-2 md:order-2">
          <button
            onClick={() => {
              onSearchTypeChange('all')
              onFilterChange?.('all')
            }}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              searchType === 'all' && filterMode === 'all'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t('search.type.all')}
          </button>
          <button
            onClick={() => {
              onSearchTypeChange('monster')
              onFilterChange?.('all')
            }}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              searchType === 'monster' && filterMode === 'all'
                ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t('search.type.monster')}
          </button>
          <button
            onClick={() => {
              onSearchTypeChange('item')
              onFilterChange?.('all')
            }}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              searchType === 'item' && filterMode === 'all'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t('search.type.item')}
          </button>
          <button
            onClick={() => {
              onSearchTypeChange('gacha')
              onFilterChange?.('all')
            }}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              searchType === 'gacha' && filterMode === 'all'
                ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t('search.type.gacha')}
          </button>

          {/* 收藏按鈕 */}
          {onFilterChange && (
            <>
              <button
                onClick={() => onFilterChange('favorite-monsters')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1 ${
                  filterMode === 'favorite-monsters'
                    ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm'
                    : favoriteMonsterCount > 0
                    ? 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {t('filter.favoriteMonsters')}
              </button>
              <button
                onClick={() => onFilterChange('favorite-items')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1 ${
                  filterMode === 'favorite-items'
                    ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-sm'
                    : favoriteItemCount > 0
                    ? 'text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {t('filter.favoriteItems')}
              </button>
            </>
          )}
        </div>

        {/* 搜尋輸入框容器 */}
        <div className="relative flex-1 order-1 md:order-3" ref={searchContainerRef}>
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

        {/* 搜尋輸入框 */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder={placeholder || t('search.placeholder')}
          className="w-full pl-12 pr-12 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 transition-all"
        />

        {/* 清除按鈕 */}
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

        {/* 建議列表 */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.type}-${suggestion.name}`}
                onClick={() => onSelectSuggestion(suggestion.name, suggestion)}
                onMouseEnter={() => onFocusedIndexChange(index)}
                className={`flex items-center justify-between px-4 py-2 cursor-pointer transition-colors ${
                  focusedIndex === index
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                } ${index === 0 ? 'rounded-t-lg' : ''} ${
                  index === suggestions.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* 怪物圖示 - 使用 R2 CDN 圖片 */}
                  {suggestion.type === 'monster' ? (
                    suggestion.id !== undefined && !hasImageFailed('monster', suggestion.id) ? (
                      <img
                        src={getMonsterImageUrl(suggestion.id)}
                        alt={suggestion.name}
                        className="w-8 h-8 object-contain flex-shrink-0"
                        onError={() => handleImageError('monster', suggestion.id!)}
                      />
                    ) : (
                      <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                      </svg>
                    )
                  ) : suggestion.type === 'item' ? (
                    /* 物品圖示 - 使用 R2 CDN 圖片 */
                    suggestion.id !== undefined && !hasImageFailed('item', suggestion.id) ? (
                      <img
                        src={getItemImageUrl(suggestion.id)}
                        alt={suggestion.name}
                        className="w-8 h-8 object-contain flex-shrink-0"
                        onError={() => handleImageError('item', suggestion.id!)}
                      />
                    ) : (
                      <svg className="w-6 h-6 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                      </svg>
                    )
                  ) : (
                    /* 轉蛋機圖示 - 保持 SVG */
                    <svg className="w-6 h-6 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
                    </svg>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {suggestion.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {suggestion.type === 'monster'
                        ? `${t('suggestion.monster')} · ${suggestion.count} ${t('suggestion.records')}`
                        : suggestion.type === 'item'
                        ? `${t('suggestion.item')} · ${suggestion.count} ${t('suggestion.records')}`
                        : `${t('suggestion.gacha')} · ${suggestion.machineName || t('suggestion.machine')}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
        {/* 結束搜尋輸入框容器 */}

        {/* 進階篩選按鈕 */}
        {onAdvancedFilterToggle && (
          <button
            onClick={onAdvancedFilterToggle}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 bg-indigo-500 hover:bg-indigo-600 text-white shadow-md hover:shadow-lg whitespace-nowrap order-3 md:order-1 flex-shrink-0"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${isAdvancedFilterExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <span>
              {t('filter.advanced')}
              {advancedFilterCount > 0 && `: ${getFilterSummary()}`}
            </span>
          </button>
        )}

        {/* 清除篩選按鈕 */}
        {onResetAdvancedFilter && advancedFilterCount > 0 && (
          <button
            onClick={onResetAdvancedFilter}
            className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 border-2 border-red-500 hover:border-red-600 text-red-500 hover:text-red-600 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg whitespace-nowrap order-4 md:order-1 flex-shrink-0"
            title="清除所有進階篩選條件"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            清除篩選
          </button>
        )}
      </div>
      {/* 結束 flex 容器 */}
    </div>
  )
}
