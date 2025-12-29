'use client'

import { memo } from 'react'
import type { AdvancedFilterOptions, SuggestionItem, SearchTypeFilter, FilterMode } from '@/types'
import type { TradeType } from '@/types/trade'
import { SearchBar } from '@/components/SearchBar'
import { AdvancedFilterPanel } from '@/components/AdvancedFilterPanel'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ToolbarDropdown, type ToolbarMenuGroup } from '@/components/toolbar'
import { TipBubble } from '@/components/TipBubble'
import { LoginButton } from '@/components/auth/LoginButton'
import { useLanguage } from '@/contexts/LanguageContext'
import { useImageFormat } from '@/contexts/ImageFormatContext'
import { useAuth } from '@/contexts/AuthContext'
import type { ImageFormat } from '@/lib/image-utils'

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

  // 轉蛋相關
  isGachaMode?: boolean
  selectedGachaMachineId?: number | null
  onGachaSelect?: (machineId: number | null) => void
  onGachaClose?: () => void

  // 商人商店相關
  isMerchantMode?: boolean
  selectedMerchantMapId?: string | null
  onMerchantSelect?: (mapId: string | null) => void
  onMerchantClose?: () => void

  // 交易市場模式相關
  isTradeMode?: boolean
  onTradeModeToggle?: () => void

  // 交易篩選器狀態（交易模式時使用）
  tradeTypeFilter?: TradeType | 'all'
  onTradeTypeFilterChange?: (type: TradeType | 'all') => void
  tradeSearchQuery?: string
  onTradeSearchQueryChange?: (query: string) => void

  // 工具列相關
  onExpTrackerClick?: () => void
  onScreenRecorderClick?: () => void
  onManualExpRecorderClick?: () => void
  onAccuracyCalculatorClick?: () => void
  onGameCommandsClick?: () => void
  onPrivacySettingsClick?: () => void
  onBugReportClick?: () => void
  onAboutClick?: () => void
  onApiTesterClick?: () => void
  onGlobalSettingsClick?: () => void
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
  isGachaMode = false,
  selectedGachaMachineId = null,
  onGachaSelect,
  onGachaClose,
  isMerchantMode = false,
  selectedMerchantMapId = null,
  onMerchantSelect,
  onMerchantClose,
  // 交易市場模式相關
  isTradeMode = false,
  onTradeModeToggle,
  // 交易篩選器狀態
  tradeTypeFilter = 'all',
  onTradeTypeFilterChange,
  tradeSearchQuery = '',
  onTradeSearchQueryChange,
  // 工具列相關
  onExpTrackerClick,
  onScreenRecorderClick,
  onManualExpRecorderClick,
  onAccuracyCalculatorClick,
  onGameCommandsClick,
  onPrivacySettingsClick,
  onBugReportClick,
  onAboutClick,
  onApiTesterClick,
  onGlobalSettingsClick,
}: SearchHeaderProps) {
  const { t } = useLanguage()
  const { format, toggleFormat } = useImageFormat()
  const { user } = useAuth()

  // 圖片格式標籤對應
  const formatLabels: Record<ImageFormat, string> = {
    png: t('imageFormat.png'),
    stand: t('imageFormat.stand'),
    hit: t('imageFormat.hit'),
    die: t('imageFormat.die')
  }

  // 工具列選單群組
  const toolbarGroups: ToolbarMenuGroup[] = [
    {
      id: 'tools',
      label: t('toolbar.tools'),
      items: [
        {
          id: 'exp-tracker',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
          label: t('toolbar.expTracker'),
          onClick: () => onExpTrackerClick?.(),
        },
        {
          id: 'screen-recorder',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ),
          label: t('toolbar.screenRecorder'),
          onClick: () => onScreenRecorderClick?.(),
        },
        {
          id: 'manual-exp-recorder',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          label: t('toolbar.manualExpRecorder'),
          onClick: () => onManualExpRecorderClick?.(),
        },
        {
          id: 'accuracy-calculator',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <circle cx="12" cy="12" r="6" strokeWidth="2"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
            </svg>
          ),
          label: t('toolbar.accuracyCalculator'),
          onClick: () => onAccuracyCalculatorClick?.(),
        },
        {
          id: 'game-commands',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          label: t('toolbar.gameCommands'),
          onClick: () => onGameCommandsClick?.(),
        },
        // API 測試工具 - 只在開發環境顯示
        ...(process.env.NODE_ENV === 'development' ? [{
          id: 'api-tester',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          ),
          label: t('toolbar.apiTester'),
          onClick: () => onApiTesterClick?.(),
        }] : []),
      ],
    },
    {
      id: 'settings',
      label: t('toolbar.settings'),
      items: [
        {
          id: 'image-format',
          icon: format === 'png' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ) : format === 'stand' ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <text x="2" y="17" fontSize="12" fontWeight="bold">GIF</text>
            </svg>
          ) : format === 'hit' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          label: `${t('toolbar.imageFormat')}: ${formatLabels[format]}`,
          onClick: toggleFormat,
          keepOpen: true,
        },
      ],
    },
    {
      id: 'about',
      label: t('toolbar.about'),
      items: [
        {
          id: 'privacy-settings',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ),
          label: t('toolbar.privacySettings'),
          onClick: () => onPrivacySettingsClick?.(),
        },
        {
          id: 'bug-report',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          label: t('toolbar.bugReport'),
          onClick: () => onBugReportClick?.(),
          variant: 'danger' as const,
        },
        {
          id: 'about-page',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: t('toolbar.aboutPage'),
          onClick: () => onAboutClick?.(),
        },
      ],
    },
  ]

  return (
    <div className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-gray-200/20 dark:shadow-gray-900/30 pt-1 sm:pt-1.5 pb-1 sm:pb-1.5">
      {/* 標題區域 - 緊湊設計 */}
      <div className="flex items-center justify-between mb-1 px-2 sm:px-4 max-w-7xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <img
            src="/images/chrono.png"
            alt="ChronoStory Logo"
            className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0"
          />
          <span className="truncate">{t('app.title')}</span>
        </h1>
        {/* 工具列和語言切換 - 大於 460px 時顯示在標題旁 */}
        <div className="hidden min-[460px]:flex gap-1.5 sm:gap-2 flex-shrink-0 items-center">
          {/* 工具列下拉選單 + 提示 */}
          <div className="relative">
            <ToolbarDropdown
              label={t('toolbar.menu')}
              icon={
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              }
              groups={toolbarGroups}
              align="right"
            />
            <TipBubble
              tipId="tools-dropdown"
              prerequisiteTipId="search-job-advancement"
              message={t('tip.toolsDropdown')}
            />
            <TipBubble
              tipId="manual-exp-recorder"
              prerequisiteTipId="tools-dropdown"
              message={t('tip.manualExpRecorder')}
            />
          </div>
          {/* 交易市場切換按鈕 - 僅登入後顯示 */}
          {user && (
            <button
              type="button"
              onClick={onTradeModeToggle}
              className={`p-1.5 sm:p-2 text-sm font-medium rounded-lg transition-colors flex items-center ${
                isTradeMode
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title={isTradeMode ? t('trade.backToSearch') : t('trade.title')}
            >
              {isTradeMode ? t('search.short') : t('trade.short')}
            </button>
          )}
          {/* 光暗模式切換 + 提示 */}
          <div className="relative">
            <ThemeToggle />
            <TipBubble
              tipId="theme-toggle"
              prerequisiteTipId="manual-exp-recorder"
              message={t('tip.themeToggle')}
            />
          </div>
          {/* 語言切換 + 提示 */}
          <div className="relative">
            <LanguageToggle />
            <TipBubble
              tipId="language-toggle"
              prerequisiteTipId="theme-toggle"
              message={t('tip.languageToggle')}
            />
          </div>
          {/* 登入按鈕 */}
          <LoginButton onGlobalSettingsClick={onGlobalSettingsClick} />
        </div>
      </div>

      {/* 工具列和語言切換 - 小於 460px 時顯示在搜尋欄上方 */}
      <div className="flex min-[460px]:hidden px-2 mb-1 max-w-7xl mx-auto">
        <div className={`grid ${user ? 'grid-cols-5' : 'grid-cols-4'} gap-1 w-full [&>button]:w-full [&>button]:justify-center [&>div]:w-full [&>div>button]:w-full [&>div>button]:justify-center`}>
          {/* 工具列下拉選單 + 提示 */}
          <div className="relative">
            <ToolbarDropdown
              label={t('toolbar.menu')}
              icon={
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              }
              groups={toolbarGroups}
              align="left"
            />
            <TipBubble
              tipId="tools-dropdown"
              prerequisiteTipId="search-job-advancement"
              message={t('tip.toolsDropdown')}
            />
            <TipBubble
              tipId="manual-exp-recorder"
              prerequisiteTipId="tools-dropdown"
              message={t('tip.manualExpRecorder')}
            />
          </div>
          {/* 交易市場切換按鈕 - 僅登入後顯示 */}
          {user && (
            <button
              type="button"
              onClick={onTradeModeToggle}
              className={`flex items-center justify-center h-[30px] sm:h-auto p-1.5 sm:p-2 text-sm font-medium rounded-lg transition-colors ${
                isTradeMode
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}
              title={isTradeMode ? t('trade.backToSearch') : t('trade.title')}
            >
              {isTradeMode ? t('search.short') : t('trade.short')}
            </button>
          )}
          {/* 光暗模式切換 + 提示 */}
          <div className="relative">
            <ThemeToggle />
            <TipBubble
              tipId="theme-toggle"
              prerequisiteTipId="manual-exp-recorder"
              message={t('tip.themeToggle')}
            />
          </div>
          {/* 語言切換 + 提示 */}
          <div className="relative">
            <LanguageToggle />
            <TipBubble
              tipId="language-toggle"
              prerequisiteTipId="theme-toggle"
              message={t('tip.languageToggle')}
            />
          </div>
          {/* 登入按鈕 */}
          <div className="flex justify-center">
            <LoginButton onGlobalSettingsClick={onGlobalSettingsClick} />
          </div>
        </div>
      </div>

      {/* 搜尋列 - 交易模式時顯示交易篩選器 */}
      {isTradeMode ? (
        <div className="px-2 sm:px-4 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* 交易類型篩選 */}
            <div className="flex gap-1.5 sm:gap-2">
              {(['all', 'sell', 'buy'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onTradeTypeFilterChange?.(type)}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    tradeTypeFilter === type
                      ? type === 'sell'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : type === 'buy'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {type === 'all' ? t('trade.allTypes') : type === 'sell' ? t('trade.sell') : t('trade.buy')}
                </button>
              ))}
            </div>

            {/* 物品搜尋 */}
            <div className="relative flex-1">
              <input
                type="text"
                value={tradeSearchQuery}
                onChange={(e) => onTradeSearchQueryChange?.(e.target.value)}
                placeholder={t('trade.searchPlaceholder')}
                className="w-full px-4 py-2 pl-10 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
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
              {tradeSearchQuery && (
                <button
                  type="button"
                  onClick={() => onTradeSearchQueryChange?.('')}
                  className="absolute right-3 top-2.5 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
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
            isGachaMode={isGachaMode}
            selectedGachaMachineId={selectedGachaMachineId}
            onGachaSelect={onGachaSelect}
            onGachaClose={onGachaClose}
            isMerchantMode={isMerchantMode}
            selectedMerchantMapId={selectedMerchantMapId}
            onMerchantSelect={onMerchantSelect}
            onMerchantClose={onMerchantClose}
          />
          {/* 進階篩選面板 - 僅搜尋模式顯示 */}
          <AdvancedFilterPanel
            filter={advancedFilter}
            onFilterChange={onAdvancedFilterChange}
            isExpanded={isAdvancedFilterExpanded}
          />
        </>
      )}
    </div>
  )
})
