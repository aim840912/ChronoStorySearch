'use client'

/**
 * 轉蛋機瀏覽模式內容元件
 *
 * 職責：
 * - 顯示搜尋和排序控制
 * - 顯示物品列表
 */

import type { GachaItem, GachaMachine } from '@/types'
import { GachaItemCard } from '@/components/gacha/GachaItemCard'

type SortOption = 'probability-desc' | 'probability-asc' | 'level-desc' | 'level-asc' | 'name-asc'

interface GachaBrowseContentProps {
  selectedMachine: GachaMachine
  filteredAndSortedItems: GachaItem[]
  searchTerm: string
  onSearchChange: (term: string) => void
  sortOption: SortOption
  onSortChange: (option: SortOption) => void
  language: 'zh-TW' | 'en'
  t: (key: string) => string
  onItemClick?: (itemId: number, itemName: string) => void
}

export function GachaBrowseContent({
  selectedMachine,
  filteredAndSortedItems,
  searchTerm,
  onSearchChange,
  sortOption,
  onSortChange,
  language,
  t,
  onItemClick,
}: GachaBrowseContentProps) {
  return (
    <>
      {/* 搜尋和排序控制 */}
      <div className="mb-6 space-y-4">
        {/* 搜尋框 */}
        <input
          type="text"
          placeholder={t('gacha.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* 排序選項 */}
        <div className="flex flex-wrap gap-2">
          <select
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="probability-desc">{t('gacha.sortProbabilityDesc')}</option>
            <option value="probability-asc">{t('gacha.sortProbabilityAsc')}</option>
            <option value="level-desc">{t('gacha.sortLevelDesc')}</option>
            <option value="level-asc">{t('gacha.sortLevelAsc')}</option>
            <option value="name-asc">{t('gacha.sortNameAsc')}</option>
          </select>

          <div className="flex-1 text-right text-sm text-gray-500 dark:text-gray-400 flex items-center justify-end">
            {t('gacha.showing')} {filteredAndSortedItems.length} {t('gacha.of')} {selectedMachine.totalItems} {t('gacha.items')}
          </div>
        </div>
      </div>

      {/* 物品列表 */}
      {filteredAndSortedItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredAndSortedItems.map((item, index) => (
            <GachaItemCard
              key={`${item.itemId}-${index}`}
              item={item}
              language={language}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
            {t('gacha.noResults')}
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            {t('gacha.tryOtherKeywords')}
          </p>
        </div>
      )}
    </>
  )
}
