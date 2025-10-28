'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { MarketFilterOptions, TradeType, StatFilterKey, ItemStatFilter } from '@/types'
import { STAT_FILTER_OPTIONS } from '@/types'
import { ItemStatFilterRow } from './ItemStatFilterRow'

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

  // 添加新屬性篩選項
  const handleAddStatFilter = () => {
    const availableStats = getAvailableStats()
    if (availableStats.length === 0) return

    const newFilter: ItemStatFilter = {
      id: `stat_${Date.now()}`,
      statKey: availableStats[0],
      minValue: null,
      maxValue: null
    }

    onFilterChange({
      ...filter,
      itemStatsFilter: [...filter.itemStatsFilter, newFilter]
    })
  }

  // 更新屬性篩選項
  const handleStatFilterChange = (id: string, updates: Partial<ItemStatFilter>) => {
    onFilterChange({
      ...filter,
      itemStatsFilter: filter.itemStatsFilter.map(f =>
        f.id === id ? { ...f, ...updates } : f
      )
    })
  }

  // 移除屬性篩選項
  const handleRemoveStatFilter = (id: string) => {
    onFilterChange({
      ...filter,
      itemStatsFilter: filter.itemStatsFilter.filter(f => f.id !== id)
    })
  }

  // 清空所有屬性篩選項
  const handleClearAllStats = () => {
    onFilterChange({
      ...filter,
      itemStatsFilter: []
    })
  }

  // 獲取可用屬性（排除已選擇的）
  const getAvailableStats = (): StatFilterKey[] => {
    const usedStats = new Set(filter.itemStatsFilter.map(f => f.statKey))
    return (Object.keys(STAT_FILTER_OPTIONS) as StatFilterKey[]).filter(
      key => !usedStats.has(key)
    )
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

          {/* 交易類型 + 排序方式 (同一列) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 交易類型篩選 */}
            <div>
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

            {/* 排序方式 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {t('market.filters.sortBy')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'created_at' as const, label: t('market.filters.sortBy.createdAt') },
                  { value: 'price' as const, label: t('market.filters.sortBy.price') }
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

          {/* 物品屬性篩選 - 動態版本 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('market.filters.itemStats')}
              </h4>
              {filter.itemStatsFilter.length > 0 && (
                <button
                  onClick={handleClearAllStats}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300
                             font-medium transition-colors"
                >
                  {t('itemStats.clearAll')}
                </button>
              )}
            </div>

            {/* 已添加的篩選項 */}
            {filter.itemStatsFilter.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {filter.itemStatsFilter.map((statFilter) => {
                  // 確保當前選擇的屬性在可用列表中
                  const availableStats = getAvailableStats()
                  const currentAvailableStats = [statFilter.statKey, ...availableStats]

                  return (
                    <ItemStatFilterRow
                      key={statFilter.id}
                      filter={statFilter}
                      onChange={handleStatFilterChange}
                      onRemove={handleRemoveStatFilter}
                      availableStats={currentAvailableStats}
                      statOptions={STAT_FILTER_OPTIONS}
                    />
                  )
                })}
              </div>
            )}

            {/* 添加新篩選項按鈕 */}
            {filter.itemStatsFilter.length < 5 && (
              <button
                onClick={handleAddStatFilter}
                disabled={getAvailableStats().length === 0}
                className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg
                           text-sm font-medium text-gray-600 dark:text-gray-400
                           hover:border-purple-500 hover:bg-purple-50 hover:text-purple-600
                           dark:hover:border-purple-400 dark:hover:bg-purple-900/20 dark:hover:text-purple-400
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300
                           dark:disabled:hover:border-gray-600 disabled:hover:bg-transparent
                           transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('market.filters.addStatFilter')}
                {filter.itemStatsFilter.length > 0 && (
                  <span className="text-xs opacity-70">
                    ({filter.itemStatsFilter.length}/5)
                  </span>
                )}
              </button>
            )}

            {/* 達到上限提示 */}
            {filter.itemStatsFilter.length >= 5 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                {t('market.filters.maxFiltersReached')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
