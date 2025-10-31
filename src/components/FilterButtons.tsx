'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { useSystemStatus } from '@/hooks/useSystemStatus'
import type { FilterMode, ClearModalType, AdvancedFilterOptions } from '@/types'
import type { User } from '@/lib/auth/session-validator'

interface FilterButtonsProps {
  filterMode: FilterMode
  onFilterChange: (mode: FilterMode) => void
  favoriteMonsterCount: number
  favoriteItemCount: number
  onClearClick: (type: ClearModalType) => void
  isAdvancedFilterExpanded: boolean
  onAdvancedFilterToggle: () => void
  advancedFilterCount: number
  onResetAdvancedFilter: () => void
  advancedFilter: AdvancedFilterOptions
  // 市場功能按鈕
  user: User | null
  onOpenCreateListing: () => void
  onOpenMyListings: () => void
  onOpenInterests: () => void
}

/**
 * 篩選按鈕元件
 * 包含全部/最愛怪物/最愛物品的篩選按鈕和清除按鈕
 */
export function FilterButtons({
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
  user,
  onOpenCreateListing,
  onOpenMyListings,
  onOpenInterests,
}: FilterButtonsProps) {
  const { t } = useLanguage()
  const { tradingEnabled } = useSystemStatus()

  // 生成篩選條件摘要
  const getFilterSummary = (): string => {
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
    <div className="max-w-7xl mx-auto mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        {/* 進階篩選按鈕 */}
        <button
          onClick={onAdvancedFilterToggle}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 bg-indigo-500 hover:bg-indigo-600 text-white shadow-md hover:shadow-lg"
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

        {/* 清除進階篩選按鈕 */}
        {advancedFilterCount > 0 && (
          <button
            onClick={onResetAdvancedFilter}
            className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 border-2 border-red-500 hover:border-red-600 text-red-500 hover:text-red-600 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg"
            title="清除所有進階篩選條件"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            清除篩選
          </button>
        )}

        {/* 全部按鈕 */}
        <button
          onClick={() => onFilterChange('all')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            filterMode === 'all'
              ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {t('filter.all')}
        </button>

        {/* 最愛怪物按鈕 */}
        <button
          onClick={() => onFilterChange('favorite-monsters')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
            filterMode === 'favorite-monsters'
              ? 'bg-red-500 text-white shadow-md hover:bg-red-600'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {t('filter.favoriteMonsters')}
          {favoriteMonsterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-white/20 rounded-full">
              {favoriteMonsterCount}
            </span>
          )}
        </button>

        {/* 清除怪物最愛按鈕 */}
        {favoriteMonsterCount > 0 && (
          <button
            onClick={() => onClearClick('monsters')}
            className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 border-2 border-red-500 hover:border-red-600 text-red-500 hover:text-red-600 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg"
            title="清除所有最愛怪物"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('filter.clear')}
          </button>
        )}

        {/* 最愛物品按鈕 */}
        <button
          onClick={() => onFilterChange('favorite-items')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
            filterMode === 'favorite-items'
              ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {t('filter.favoriteItems')}
          {favoriteItemCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-white/20 rounded-full">
              {favoriteItemCount}
            </span>
          )}
        </button>

        {/* 清除物品最愛按鈕 */}
        {favoriteItemCount > 0 && (
          <button
            onClick={() => onClearClick('items')}
            className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 border-2 border-red-500 hover:border-red-600 text-red-500 hover:text-red-600 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg"
            title="清除所有最愛物品"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('filter.clear')}
          </button>
        )}

        {/* 市場刊登按鈕 - 僅登入且交易系統開啟時顯示 */}
        {user && tradingEnabled && (
          <button
            onClick={() => onFilterChange('market-listings')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              filterMode === 'market-listings'
                ? 'border-2 border-purple-500 text-purple-500 bg-white dark:bg-gray-800 shadow-md hover:bg-purple-50 dark:hover:bg-purple-900/10'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {t('filter.marketListings')}
          </button>
        )}

        {/* 市場模式的操作按鈕 - 僅在市場模式下顯示 */}
        {user && tradingEnabled && filterMode === 'market-listings' && (
          <>
            {/* 建立刊登按鈕 */}
            <button
              onClick={onOpenCreateListing}
              className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 border-2 border-green-500 text-green-500 hover:border-green-600 hover:text-green-600 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/10 shadow-md hover:shadow-lg"
              title="建立新的交易刊登"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('market.createListing')}
            </button>

            {/* 我的刊登按鈕 */}
            <button
              onClick={onOpenMyListings}
              className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 border-2 border-blue-500 text-blue-500 hover:border-blue-600 hover:text-blue-600 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 shadow-md hover:shadow-lg"
              title="查看我的交易刊登"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('market.myListings')}
            </button>

            {/* 關注按鈕 */}
            <button
              onClick={onOpenInterests}
              className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 border-2 border-orange-500 text-orange-500 hover:border-orange-600 hover:text-orange-600 bg-white dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/10 shadow-md hover:shadow-lg"
              title="查看我關注的物品"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
              {t('market.interests')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
