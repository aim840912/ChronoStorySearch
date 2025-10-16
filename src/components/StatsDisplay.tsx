'use client'

import type { FilterMode } from '@/types'

interface StatsDisplayProps {
  message: string
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
  message,
  filterMode,
  searchTerm,
  filteredUniqueMonsterCount,
  favoriteMonsterCount,
  filteredUniqueItemCount,
  favoriteItemCount,
  filteredDropsCount,
  totalDropsCount,
}: StatsDisplayProps) {
  // 生成統計文字
  const getStatsText = () => {
    if (filterMode === 'favorite-monsters') {
      return searchTerm
        ? `搜尋結果: ${filteredUniqueMonsterCount} 隻怪物（從 ${favoriteMonsterCount} 隻最愛怪物中搜尋）`
        : `我的最愛: ${filteredUniqueMonsterCount} 隻怪物`
    }

    if (filterMode === 'favorite-items') {
      return searchTerm
        ? `搜尋結果: ${filteredUniqueItemCount} 個物品（從 ${favoriteItemCount} 個最愛物品中搜尋）`
        : `我的最愛: ${filteredUniqueItemCount} 個物品`
    }

    // filterMode === 'all'
    return searchTerm
      ? `搜尋結果: ${filteredDropsCount} 筆掉落（從 ${totalDropsCount} 筆中搜尋）`
      : `隨機顯示 ${filteredDropsCount} 筆（共 ${totalDropsCount} 筆掉落資料）`
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
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              ✓ {message}
            </p>
            <p className="text-xs mt-1 text-green-600 dark:text-green-300">
              {getStatsText()} | 資料來源: ChronoStory 掉落表
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
