'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { SearchTypeFilter, FilterMode } from '@/types'

interface FilterTabsProps {
  searchType: SearchTypeFilter
  onSearchTypeChange: (type: SearchTypeFilter) => void
  filterMode: FilterMode
  onFilterChange: (mode: FilterMode) => void
  favoriteMonsterCount: number
  favoriteItemCount: number
}

/**
 * 篩選按鈕群組元件
 * 包含類型篩選（全部/怪物/物品/轉蛋）和收藏篩選按鈕
 */
export function FilterTabs({
  searchType,
  onSearchTypeChange,
  filterMode,
  onFilterChange,
  favoriteMonsterCount,
  favoriteItemCount,
}: FilterTabsProps) {
  const { t } = useLanguage()

  const handleTypeChange = (type: SearchTypeFilter) => {
    onSearchTypeChange(type)
    onFilterChange('all')
  }

  return (
    <div className="flex flex-wrap w-full min-[554px]:w-fit rounded-xl bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm p-1.5 gap-1">
      {/* 類型篩選按鈕 */}
      <button
        onClick={() => handleTypeChange('all')}
        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
          searchType === 'all' && filterMode === 'all'
            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
        }`}
      >
        {t('search.type.all')}
      </button>
      <button
        onClick={() => handleTypeChange('monster')}
        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
          searchType === 'monster' && filterMode === 'all'
            ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
        }`}
      >
        {t('search.type.monster')}
      </button>
      <button
        onClick={() => handleTypeChange('item')}
        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
          searchType === 'item' && filterMode === 'all'
            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
        }`}
      >
        {t('search.type.item')}
      </button>
      <button
        onClick={() => handleTypeChange('gacha')}
        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
          searchType === 'gacha' && filterMode === 'all'
            ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
        }`}
      >
        {t('search.type.gacha')}
      </button>

      {/* 分隔線 */}
      <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />

      {/* 收藏按鈕 */}
      <button
        onClick={() => onFilterChange('favorite-monsters')}
        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
          filterMode === 'favorite-monsters'
            ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
            : favoriteMonsterCount > 0
            ? 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
        }`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span>{t('filter.favoriteMonsters')}</span>
        {favoriteMonsterCount > 0 && (
          <span className="text-xs opacity-70">({favoriteMonsterCount})</span>
        )}
      </button>
      <button
        onClick={() => onFilterChange('favorite-items')}
        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
          filterMode === 'favorite-items'
            ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
            : favoriteItemCount > 0
            ? 'text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
        }`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span>{t('filter.favoriteItems')}</span>
        {favoriteItemCount > 0 && (
          <span className="text-xs opacity-70">({favoriteItemCount})</span>
        )}
      </button>
    </div>
  )
}
