'use client'

import { memo } from 'react'
import type { AdvancedFilterOptions, SuggestionItem, SearchTypeFilter, FilterMode, MarketFilterOptions } from '@/types'
import { SearchBar } from '@/components/SearchBar'
import { AdvancedFilterPanel } from '@/components/AdvancedFilterPanel'
import { MarketFilterPanel } from '@/components/trade/MarketFilterPanel'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ImageFormatToggle } from '@/components/ImageFormatToggle'
import { UserMenu } from '@/components/auth/UserMenu'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'

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
  onShare: () => Promise<void>

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

  // 交易系統相關（暫時保留 props 但不使用）
  onOpenCreateListing?: () => void
  onOpenMyListings?: () => void
  onOpenInterests?: () => void
  marketFilter: MarketFilterOptions
  onMarketFilterChange: (filter: MarketFilterOptions) => void
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
  onShare,
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
  marketFilter,
  onMarketFilterChange,
}: SearchHeaderProps) {
  const { t } = useLanguage()
  const { user, loading } = useAuth()

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 backdrop-blur-sm pt-4 sm:pt-6 pb-3 sm:pb-4 shadow-md">
      {/* 標題區域 */}
      <div className="relative text-center mb-4 sm:mb-6 pt-2 pr-20 sm:pr-0">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
          <img
            src="/images/chrono.png"
            alt="ChronoStory Logo"
            className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
          />
          {t('app.title')}
        </h1>
        {/* 主題、語言、圖片格式切換與登入按鈕 - 右上角 */}
        <div className="absolute top-0 right-2 sm:right-4 flex gap-1.5 sm:gap-2">
          <ImageFormatToggle />
          <ThemeToggle />
          <LanguageToggle />
          {/* 認證 UI：已登入顯示用戶選單（登入功能僅在 /admin/login 頁面提供） */}
          {!loading && user && <UserMenu />}
        </div>
      </div>

      {/* 搜尋列與篩選按鈕容器 */}
      <div className="flex flex-col">
        {/* 搜尋列 */}
        <div className="order-2 md:order-1">
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
            onShare={onShare}
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

      </div>

      {/* 進階篩選面板（非市場模式） */}
      {filterMode !== 'market-listings' && (
        <AdvancedFilterPanel
          filter={advancedFilter}
          onFilterChange={onAdvancedFilterChange}
          isExpanded={isAdvancedFilterExpanded}
        />
      )}

      {/* 市場篩選面板（市場模式） */}
      {filterMode === 'market-listings' && (
        <MarketFilterPanel
          filter={marketFilter}
          onFilterChange={onMarketFilterChange}
          isExpanded={isAdvancedFilterExpanded}
        />
      )}
    </div>
  )
})
