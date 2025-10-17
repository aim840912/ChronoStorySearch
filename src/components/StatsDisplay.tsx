'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { FilterMode } from '@/types'

interface StatsDisplayProps {
  filterMode: FilterMode
  searchTerm: string
  filteredUniqueMonsterCount: number
  favoriteMonsterCount: number
  filteredUniqueItemCount: number
  favoriteItemCount: number
  filteredDropsCount: number
  totalDropsCount: number
}

/**
 * 資料統計顯示元件
 * 根據篩選模式顯示不同的統計資訊
 */
export function StatsDisplay({
  filterMode,
  searchTerm,
  filteredUniqueMonsterCount,
  favoriteMonsterCount,
  filteredUniqueItemCount,
  favoriteItemCount,
  filteredDropsCount,
  totalDropsCount,
}: StatsDisplayProps) {
  const { t } = useLanguage()
  // 生成統計文字
  const getStatsText = () => {
    if (filterMode === 'favorite-monsters') {
      return searchTerm
        ? `${t('stats.searchResult')}: ${filteredUniqueMonsterCount} ${t('stats.monsterUnit')}（${t('stats.from')} ${favoriteMonsterCount} ${t('stats.monsterUnit')}${t('stats.in')}）`
        : `${t('stats.myFavorites')}: ${filteredUniqueMonsterCount} ${t('stats.monsterUnit')}`
    }

    if (filterMode === 'favorite-items') {
      return searchTerm
        ? `${t('stats.searchResult')}: ${filteredUniqueItemCount} ${t('stats.itemUnit')}（${t('stats.from')} ${favoriteItemCount} ${t('stats.itemUnit')}${t('stats.in')}）`
        : `${t('stats.myFavorites')}: ${filteredUniqueItemCount} ${t('stats.itemUnit')}`
    }

    // filterMode === 'all'
    return searchTerm
      ? `${t('stats.searchResult')}: ${filteredDropsCount} ${t('stats.dropUnit')}（${t('stats.from')} ${totalDropsCount} ${t('stats.dropUnit')}${t('stats.in')}）`
      : `${t('stats.randomDisplay')} ${filteredDropsCount} ${t('stats.dropUnit')}（${t('stats.total')} ${totalDropsCount} ${t('stats.dropData')}）`
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-green-800 dark:text-green-200">
              {getStatsText()} | {t('stats.dataSource')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
