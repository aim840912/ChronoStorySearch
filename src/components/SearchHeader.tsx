'use client'

import { memo } from 'react'
import type { AdvancedFilterOptions, SuggestionItem, SearchTypeFilter, FilterMode, MarketFilterOptions } from '@/types'
import { SearchBar } from '@/components/SearchBar'
import { FilterButtons } from '@/components/FilterButtons'
import { AdvancedFilterPanel } from '@/components/AdvancedFilterPanel'
import { MarketFilterPanel } from '@/components/trade/MarketFilterPanel'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageToggle } from '@/components/LanguageToggle'
import { LoginButton } from '@/components/auth/LoginButton'
import { UserMenu } from '@/components/auth/UserMenu'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useSystemStatus } from '@/hooks/useSystemStatus'

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
  onClearClick: (type: 'monsters' | 'items' | null) => void

  // 進階篩選相關
  isAdvancedFilterExpanded: boolean
  onAdvancedFilterToggle: () => void
  advancedFilterCount: number
  onResetAdvancedFilter: () => void
  advancedFilter: AdvancedFilterOptions
  onAdvancedFilterChange: (filter: AdvancedFilterOptions) => void

  // 交易系統 Modal 開啟函數
  onOpenCreateListing: () => void
  onOpenMyListings: () => void
  onOpenInterests: () => void

  // 市場篩選相關
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
  onClearClick,
  isAdvancedFilterExpanded,
  onAdvancedFilterToggle,
  advancedFilterCount,
  onResetAdvancedFilter,
  advancedFilter,
  onAdvancedFilterChange,
  onOpenCreateListing,
  onOpenMyListings,
  onOpenInterests,
  marketFilter,
  onMarketFilterChange,
}: SearchHeaderProps) {
  const { t } = useLanguage()
  const { user, loading } = useAuth()
  const { tradingEnabled } = useSystemStatus()

  // 根據 filterMode 決定搜尋列的 placeholder
  const searchPlaceholder = filterMode === 'market-listings'
    ? t('search.placeholder.market') || '搜尋市場物品...'
    : t('search.placeholder')

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 backdrop-blur-sm pt-4 sm:pt-6 pb-3 sm:pb-4 shadow-md">
      {/* 標題區域 */}
      <div className="relative text-center mb-4 sm:mb-6 pt-2 pr-20 sm:pr-0">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
          {t('app.title')}
        </h1>
        {/* 主題、語言切換與登入按鈕 - 右上角 */}
        <div className="absolute top-0 right-2 sm:right-4 flex gap-1.5 sm:gap-2">
          <ThemeToggle />
          <LanguageToggle />
          {/* 認證 UI：未登入顯示登入按鈕，已登入顯示用戶選單 */}
          {!loading && (user ? <UserMenu /> : <LoginButton />)}
        </div>
      </div>

      {/* 搜尋列 */}
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
        placeholder={searchPlaceholder}
      />

      {/* 篩選按鈕 */}
      <FilterButtons
        filterMode={filterMode}
        onFilterChange={onFilterChange}
        favoriteMonsterCount={favoriteMonsterCount}
        favoriteItemCount={favoriteItemCount}
        onClearClick={onClearClick}
        isAdvancedFilterExpanded={isAdvancedFilterExpanded}
        onAdvancedFilterToggle={onAdvancedFilterToggle}
        advancedFilterCount={advancedFilterCount}
        onResetAdvancedFilter={onResetAdvancedFilter}
        advancedFilter={advancedFilter}
        user={user}
        onOpenCreateListing={onOpenCreateListing}
        onOpenMyListings={onOpenMyListings}
        onOpenInterests={onOpenInterests}
      />

      {/* 進階篩選面板（非市場模式） */}
      {filterMode !== 'market-listings' && (
        <AdvancedFilterPanel
          filter={advancedFilter}
          onFilterChange={onAdvancedFilterChange}
          isExpanded={isAdvancedFilterExpanded}
        />
      )}

      {/* 市場篩選面板（市場模式） */}
      {filterMode === 'market-listings' && tradingEnabled && (
        <MarketFilterPanel
          filter={marketFilter}
          onFilterChange={onMarketFilterChange}
          isExpanded={isAdvancedFilterExpanded}
        />
      )}
    </div>
  )
})
