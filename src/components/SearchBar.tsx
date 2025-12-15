'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { useWindowHeight } from '@/hooks/useWindowHeight'
import { SearchInput, SuggestionList, FilterTabs, ActionButtons, GachaDropdown, MerchantShopDropdown, MoreFiltersDropdown } from '@/components/search'
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
  placeholder?: string
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
}

/**
 * 搜尋列元件
 * 組合 SearchInput、SuggestionList、FilterTabs、ActionButtons 子元件
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
  placeholder,
  filterMode = 'all',
  onFilterChange,
  favoriteMonsterCount = 0,
  favoriteItemCount = 0,
  isAdvancedFilterExpanded = false,
  onAdvancedFilterToggle,
  advancedFilterCount = 0,
  advancedFilter,
  onResetAdvancedFilter,
  isGachaMode = false,
  selectedGachaMachineId = null,
  onGachaSelect,
  onGachaClose,
  isMerchantMode = false,
  selectedMerchantMapId = null,
  onMerchantSelect,
  onMerchantClose,
}: SearchBarProps) {
  const { t } = useLanguage()
  const { isShortScreen } = useWindowHeight()

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

    // 攻擊速度（單選）
    if (advancedFilter.attackSpeedRange.min !== null) {
      labels.push(`${t('filter.attackSpeed')}: ${advancedFilter.attackSpeedRange.min}`)
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

  // 生成篩選條件摘要（縮寫版，用於窄視窗）
  const getAbbreviatedFilterSummary = (): string => {
    if (!advancedFilter) return ''

    const labels: string[] = []

    // 物品類別 - 取第一個字
    advancedFilter.itemCategories.forEach(cat => {
      const fullLabel = t(`filter.itemCategory.${cat}`)
      labels.push(fullLabel.charAt(0))
    })

    // 職業 - 取第一個字
    advancedFilter.jobClasses.forEach(job => {
      const fullLabel = t(`filter.jobClass.${job}`)
      labels.push(fullLabel.charAt(0))
    })

    // 等級範圍 - 簡化為 "L"
    if (advancedFilter.levelRange.min !== null || advancedFilter.levelRange.max !== null) {
      labels.push('L')
    }

    // 攻擊速度範圍 - 簡化為 "A"
    if (advancedFilter.attackSpeedRange.min !== null || advancedFilter.attackSpeedRange.max !== null) {
      labels.push('A')
    }

    if (labels.length === 0) {
      return ''
    } else if (labels.length <= 3) {
      return labels.join('、')
    } else {
      return labels.slice(0, 3).join('、') + '...'
    }
  }

  return (
    <div className="max-w-7xl mx-auto mb-6 px-2 sm:px-4">
      {/* 搜尋輸入框行 */}
      <div className="flex gap-3 items-center mb-3">
        {/* 搜尋輸入框 + 建議列表 */}
        <div className="relative flex-1" ref={searchContainerRef}>
          <SearchInput
            value={searchTerm}
            onChange={onSearchChange}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
          />
          <SuggestionList
            suggestions={suggestions}
            isVisible={showSuggestions}
            focusedIndex={focusedIndex}
            onSelect={onSelectSuggestion}
            onFocusedIndexChange={onFocusedIndexChange}
          />
        </div>

        {/* 進階篩選按鈕 - 只在 md 以上顯示（搜尋框旁） */}
        {onAdvancedFilterToggle && onResetAdvancedFilter && (
          <div className="hidden md:block">
            <ActionButtons
              isAdvancedFilterExpanded={isAdvancedFilterExpanded}
              onAdvancedFilterToggle={onAdvancedFilterToggle}
              advancedFilterCount={advancedFilterCount}
              onResetAdvancedFilter={onResetAdvancedFilter}
              filterSummary={getFilterSummary()}
              abbreviatedFilterSummary={getAbbreviatedFilterSummary()}
            />
          </div>
        )}
      </div>

      {/* 進階篩選按鈕 - 只在 <=553px 且非短螢幕時顯示（獨立一行） */}
      {onAdvancedFilterToggle && onResetAdvancedFilter && !isShortScreen && (
        <div className="block min-[554px]:hidden mb-3">
          <ActionButtons
            isAdvancedFilterExpanded={isAdvancedFilterExpanded}
            onAdvancedFilterToggle={onAdvancedFilterToggle}
            advancedFilterCount={advancedFilterCount}
            onResetAdvancedFilter={onResetAdvancedFilter}
            filterSummary={getFilterSummary()}
            abbreviatedFilterSummary={getAbbreviatedFilterSummary()}
            fullWidth
          />
        </div>
      )}

      {/* 篩選按鈕行 */}
      {onFilterChange && (
        <div className="flex flex-wrap items-center gap-2">
          {/* 短螢幕時顯示 MoreFiltersDropdown，正常高度時顯示完整按鈕 */}
          {isShortScreen ? (
            <div className="flex items-center gap-2 w-full">
              {/* 短螢幕：All 按鈕、進階篩選、清除按鈕同列並佔滿寬度 */}
              {onGachaSelect && onGachaClose && onMerchantSelect && onMerchantClose && (
                <MoreFiltersDropdown
                  searchType={searchType}
                  onSearchTypeChange={onSearchTypeChange}
                  filterMode={filterMode}
                  onFilterChange={onFilterChange}
                  favoriteMonsterCount={favoriteMonsterCount}
                  favoriteItemCount={favoriteItemCount}
                  isGachaMode={isGachaMode}
                  selectedGachaMachineId={selectedGachaMachineId ?? null}
                  onGachaSelect={onGachaSelect}
                  onGachaClose={onGachaClose}
                  isMerchantMode={isMerchantMode}
                  selectedMerchantMapId={selectedMerchantMapId ?? null}
                  onMerchantSelect={onMerchantSelect}
                  onMerchantClose={onMerchantClose}
                />
              )}
              {onAdvancedFilterToggle && onResetAdvancedFilter && (
                <ActionButtons
                  isAdvancedFilterExpanded={isAdvancedFilterExpanded}
                  onAdvancedFilterToggle={onAdvancedFilterToggle}
                  advancedFilterCount={advancedFilterCount}
                  onResetAdvancedFilter={onResetAdvancedFilter}
                  filterSummary={getFilterSummary()}
                  abbreviatedFilterSummary={getAbbreviatedFilterSummary()}
                  fullWidth
                />
              )}
            </div>
          ) : (
            <>
              {/* 正常高度：顯示完整按鈕 */}
              <FilterTabs
                searchType={searchType}
                onSearchTypeChange={onSearchTypeChange}
                filterMode={filterMode}
                onFilterChange={onFilterChange}
                favoriteMonsterCount={favoriteMonsterCount}
                favoriteItemCount={favoriteItemCount}
                isGachaMode={isGachaMode}
                isMerchantMode={isMerchantMode}
              />

              {/* 進階篩選按鈕 - 只在 554-767px 顯示（緊接 FilterTabs） */}
              {onAdvancedFilterToggle && onResetAdvancedFilter && (
                <div className="hidden min-[554px]:block md:hidden">
                  <ActionButtons
                    isAdvancedFilterExpanded={isAdvancedFilterExpanded}
                    onAdvancedFilterToggle={onAdvancedFilterToggle}
                    advancedFilterCount={advancedFilterCount}
                    onResetAdvancedFilter={onResetAdvancedFilter}
                    filterSummary={getFilterSummary()}
                    abbreviatedFilterSummary={getAbbreviatedFilterSummary()}
                  />
                </div>
              )}

              {onGachaSelect && onGachaClose && (
                <GachaDropdown
                  isGachaMode={isGachaMode}
                  selectedMachineId={selectedGachaMachineId ?? null}
                  onSelect={onGachaSelect}
                  onClose={onGachaClose}
                />
              )}

              {onMerchantSelect && onMerchantClose && (
                <MerchantShopDropdown
                  isMerchantMode={isMerchantMode}
                  selectedMapId={selectedMerchantMapId ?? null}
                  onSelect={onMerchantSelect}
                  onClose={onMerchantClose}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
