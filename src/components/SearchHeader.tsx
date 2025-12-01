'use client'

import { memo } from 'react'
import type { AdvancedFilterOptions, SuggestionItem, SearchTypeFilter, FilterMode } from '@/types'
import { SearchBar } from '@/components/SearchBar'
import { AdvancedFilterPanel } from '@/components/AdvancedFilterPanel'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ImageFormatToggle } from '@/components/ImageFormatToggle'
import { useLanguage } from '@/contexts/LanguageContext'

interface SearchHeaderProps {
  // 搜尋相關
  searchTerm: string
  onSearchChange: (term: string) => void
  searchType: SearchTypeFilter
  onSearchTypeChange: (type: SearchTypeFilter) => void
  suggestions: SuggestionItem[]
  showSuggestions: boolean
  onFocus: () => void
  onSelectSuggestion: (name: string, suggestion?: SuggestionItem) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  focusedIndex: number
  onFocusedIndexChange: (index: number) => void
  searchContainerRef: React.RefObject<HTMLDivElement | null>

  // 篩選相關
  filterMode: FilterMode
  onFilterChange: (mode: FilterMode) => void
  favoriteMonsterCount: number
  favoriteItemCount: number

  // 進階篩選相關
  isAdvancedFilterExpanded: boolean
  onAdvancedFilterToggle: () => void
  advancedFilterCount: number
  onResetAdvancedFilter: () => void
  advancedFilter: AdvancedFilterOptions
  onAdvancedFilterChange: (filter: AdvancedFilterOptions) => void

}

/**
 * 搜尋頁面的 Header 元件
 * 包含：標題、主題切換、搜尋列、篩選按鈕和進階篩選面板
 *
 * 使用 React.memo 優化以避免不必要的重新渲染
 */
export const SearchHeader = memo(function SearchHeader({
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
  filterMode,
  onFilterChange,
  favoriteMonsterCount,
  favoriteItemCount,
  isAdvancedFilterExpanded,
  onAdvancedFilterToggle,
  advancedFilterCount,
  onResetAdvancedFilter,
  advancedFilter,
  onAdvancedFilterChange,
}: SearchHeaderProps) {
  const { t } = useLanguage()

  return (
    <div className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-gray-200/20 dark:shadow-gray-900/30 pt-2 sm:pt-3 pb-2 sm:pb-3">
      {/* 標題區域 - 緊湊設計 */}
      <div className="flex items-center justify-between mb-2 px-2 sm:px-4 max-w-7xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <img
            src="/images/chrono.png"
            alt="ChronoStory Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0"
          />
          <span className="truncate">{t('app.title')}</span>
        </h1>
        {/* 主題、語言、圖片格式切換 */}
        <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
          <ImageFormatToggle />
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>

      {/* 搜尋列 - 視覺焦點 */}
      <div>
        <SearchBar
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            searchType={searchType}
            onSearchTypeChange={onSearchTypeChange}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            onFocus={onFocus}
            onSelectSuggestion={onSelectSuggestion}
            onKeyDown={onKeyDown}
            focusedIndex={focusedIndex}
            onFocusedIndexChange={onFocusedIndexChange}
            searchContainerRef={searchContainerRef}
            filterMode={filterMode}
            onFilterChange={onFilterChange}
            favoriteMonsterCount={favoriteMonsterCount}
            favoriteItemCount={favoriteItemCount}
            isAdvancedFilterExpanded={isAdvancedFilterExpanded}
            onAdvancedFilterToggle={onAdvancedFilterToggle}
            advancedFilterCount={advancedFilterCount}
            advancedFilter={advancedFilter}
            onResetAdvancedFilter={onResetAdvancedFilter}
          />
      </div>

      {/* 進階篩選面板 */}
      <AdvancedFilterPanel
        filter={advancedFilter}
        onFilterChange={onAdvancedFilterChange}
        isExpanded={isAdvancedFilterExpanded}
      />
    </div>
  )
})
