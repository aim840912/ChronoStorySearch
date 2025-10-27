'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { MarketFilterOptions, TradeType } from '@/types'
import type { StatsGrade } from '@/types/item-stats'

interface MarketFilterPanelProps {
  filter: MarketFilterOptions
  onFilterChange: (filter: MarketFilterOptions) => void
  isExpanded: boolean
}

/**
 * 市場篩選面板元件
 *
 * 功能：
 * - 交易類型多選（販售/收購/交換）
 * - 價格範圍篩選（最小/最大）
 * - 物品屬性篩選（展開式）
 * - 排序方式選擇
 *
 * 設計：
 * - 展開/收合動畫
 * - 響應式設計
 * - 深色模式支援
 */
export function MarketFilterPanel({
  filter,
  onFilterChange,
  isExpanded
}: MarketFilterPanelProps) {
  const { t } = useLanguage()

  // 處理交易類型切換
  const handleTradeTypeToggle = (tradeType: TradeType) => {
    const newTypes = filter.tradeTypes.includes(tradeType)
      ? filter.tradeTypes.filter(t => t !== tradeType)
      : [...filter.tradeTypes, tradeType]

    onFilterChange({ ...filter, tradeTypes: newTypes })
  }

  // 處理價格範圍變更
  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10)

    if (numValue !== null && isNaN(numValue)) return

    onFilterChange({
      ...filter,
      priceRange: {
        ...filter.priceRange,
        [type]: numValue
      }
    })
  }

  // 處理物品屬性變更
  const handleStatsChange = (key: 'min_watk' | 'min_matk' | 'min_wdef', value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10)

    if (numValue !== undefined && isNaN(numValue)) return

    onFilterChange({
      ...filter,
      itemStatsFilter: {
        ...filter.itemStatsFilter,
        [key]: numValue
      }
    })
  }

  // 處理素質等級切換
  const handleGradeToggle = (grade: StatsGrade) => {
    const currentGrades = filter.itemStatsFilter.stats_grade || []
    const newGrades = currentGrades.includes(grade)
      ? currentGrades.filter(g => g !== grade)
      : [...currentGrades, grade]

    onFilterChange({
      ...filter,
      itemStatsFilter: {
        ...filter.itemStatsFilter,
        stats_grade: newGrades.length > 0 ? newGrades : undefined
      }
    })
  }

  // 處理排序變更
  const handleSortChange = (sortBy: MarketFilterOptions['sortBy'], sortOrder: MarketFilterOptions['sortOrder']) => {
    onFilterChange({ ...filter, sortBy, sortOrder })
  }

  if (!isExpanded) return null

  return (
    <div className="max-w-7xl mx-auto mb-4">
      <div
        className="overflow-y-auto overscroll-contain touch-scroll-safe transition-all duration-300 ease-in-out opacity-100 mt-4"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">

          {/* 交易類型篩選 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('market.filters.tradeType')}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                ({t('filter.multiSelect')})
              </span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {(['sell', 'buy', 'exchange'] as TradeType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleTradeTypeToggle(type)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    filter.tradeTypes.includes(type)
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t(`trade.type.${type}`)}
                  {filter.tradeTypes.includes(type) && (
                    <svg className="inline-block w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 價格範圍篩選 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('market.filters.priceRange')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('market.filters.minPrice')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={filter.priceRange.min || ''}
                  onChange={(e) => handlePriceChange('min', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('market.filters.maxPrice')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={filter.priceRange.max || ''}
                  onChange={(e) => handlePriceChange('max', e.target.value)}
                  placeholder="999999999"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* 物品屬性篩選 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('market.filters.itemStats')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('itemStats.filter.minWatk')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={filter.itemStatsFilter.min_watk || ''}
                  onChange={(e) => handleStatsChange('min_watk', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('itemStats.filter.minMatk')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={filter.itemStatsFilter.min_matk || ''}
                  onChange={(e) => handleStatsChange('min_matk', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('itemStats.filter.grade')}
                </label>
                <div className="flex flex-wrap gap-1">
                  {(['S', 'A', 'B', 'C'] as StatsGrade[]).map((grade) => (
                    <button
                      key={grade}
                      onClick={() => handleGradeToggle(grade)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        filter.itemStatsFilter.stats_grade?.includes(grade)
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 排序方式 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('market.filters.sortBy')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'created_at' as const, label: t('market.filters.sortBy.createdAt') },
                { value: 'price' as const, label: t('market.filters.sortBy.price') },
                { value: 'stats_score' as const, label: t('market.filters.sortBy.statsScore') }
              ].map((option) => (
                <div key={option.value} className="flex items-center gap-1">
                  <button
                    onClick={() => handleSortChange(option.value, filter.sortOrder)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      filter.sortBy === option.value
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                  {filter.sortBy === option.value && (
                    <button
                      onClick={() => handleSortChange(option.value, filter.sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      title={filter.sortOrder === 'asc' ? t('market.filters.sortOrder.asc') : t('market.filters.sortOrder.desc')}
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${filter.sortOrder === 'desc' ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
