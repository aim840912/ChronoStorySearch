'use client'

import type { ItemStats } from '@/types/item-stats'
import { StatsComparisonCard } from '../StatsComparisonCard'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 裝備屬性顯示元件
 *
 * 功能：
 * - 顯示物品屬性（如果有）
 * - 使用 StatsComparisonCard 呈現
 * - 僅當物品有屬性時才顯示
 *
 * 使用範例：
 * ```tsx
 * <ListingItemStats
 *   itemStats={listing.item_stats}
 *   locale={language}
 * />
 * ```
 */
interface ListingItemStatsProps {
  /** 物品屬性資料 */
  itemStats: ItemStats | null | undefined
  /** 語言設定 */
  locale: 'zh-TW' | 'en'
}

export function ListingItemStats({ itemStats, locale }: ListingItemStatsProps) {
  const { t } = useLanguage()

  // 如果沒有屬性資料，不顯示
  if (!itemStats) {
    return null
  }

  return (
    <div className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('listing.itemStats')}</h3>
      <StatsComparisonCard
        stats={itemStats}
        locale={locale}
        showMaxValues={false}
        compact={true}
      />
    </div>
  )
}
