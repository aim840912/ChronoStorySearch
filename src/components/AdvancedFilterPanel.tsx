'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { AdvancedFilterOptions, DataTypeFilter, ItemCategoryGroup } from '@/types'

interface AdvancedFilterPanelProps {
  filter: AdvancedFilterOptions
  onFilterChange: (filter: AdvancedFilterOptions) => void
  isExpanded: boolean
  onToggle: () => void
}

/**
 * 進階篩選面板元件
 * 提供複合式篩選選項
 */
export function AdvancedFilterPanel({
  filter,
  onFilterChange,
  isExpanded,
  onToggle,
}: AdvancedFilterPanelProps) {
  const { t } = useLanguage()

  // 處理資料類型變更
  const handleDataTypeChange = (dataType: DataTypeFilter) => {
    onFilterChange({
      ...filter,
      dataType,
      enabled: true,
    })
  }

  // 處理物品類別變更（多選）
  const handleCategoryToggle = (category: ItemCategoryGroup) => {
    const newCategories = filter.itemCategories.includes(category)
      ? filter.itemCategories.filter((c) => c !== category)
      : [...filter.itemCategories, category]

    onFilterChange({
      ...filter,
      itemCategories: newCategories,
      enabled: true,
    })
  }

  // 切換邏輯運算子
  const handleLogicToggle = () => {
    onFilterChange({
      ...filter,
      logicOperator: filter.logicOperator === 'AND' ? 'OR' : 'AND',
    })
  }

  // 重置篩選
  const handleReset = () => {
    onFilterChange({
      dataType: 'all',
      itemCategories: [],
      logicOperator: 'AND',
      enabled: false,
    })
  }

  // 計算已啟用篩選數量
  const activeFilterCount = [
    filter.dataType !== 'all' ? 1 : 0,
    filter.itemCategories.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-7xl mx-auto mb-4">
      {/* 篩選面板 */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[600px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          {/* 邏輯運算子切換 */}
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('filter.advancedTitle')}
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('filter.logicOperator')}:
              </span>
              <button
                onClick={handleLogicToggle}
                className={`px-4 py-1.5 rounded-md font-medium text-sm transition-all ${
                  filter.logicOperator === 'AND'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                AND
              </button>
              <button
                onClick={handleLogicToggle}
                className={`px-4 py-1.5 rounded-md font-medium text-sm transition-all ${
                  filter.logicOperator === 'OR'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                OR
              </button>
            </div>
          </div>

          {/* 資料類型篩選 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('filter.dataType')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {(['all', 'monster', 'item', 'gacha'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleDataTypeChange(type)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    filter.dataType === type
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t(`filter.dataType.${type}`)}
                </button>
              ))}
            </div>
          </div>

          {/* 物品類別篩選 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('filter.itemCategory')}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                ({t('filter.multiSelect')})
              </span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {(['weapon', 'armor', 'accessory', 'consume', 'etc'] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    filter.itemCategories.includes(category)
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t(`filter.itemCategory.${category}`)}
                  {filter.itemCategories.includes(category) && (
                    <svg className="inline-block w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 已選標籤顯示 */}
          {activeFilterCount > 0 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  {t('filter.activeFilters')}:
                </h5>
                <button
                  onClick={handleReset}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  {t('filter.reset')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {filter.dataType !== 'all' && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-full text-xs font-medium">
                    {t('filter.dataType')}: {t(`filter.dataType.${filter.dataType}`)}
                  </span>
                )}
                {filter.itemCategories.map((category) => (
                  <span
                    key={category}
                    className="px-3 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 rounded-full text-xs font-medium"
                  >
                    {t(`filter.itemCategory.${category}`)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 底部按鈕 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleReset}
              className="px-6 py-2 rounded-lg font-medium text-sm transition-all bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              {t('filter.reset')}
            </button>
            <button
              onClick={onToggle}
              className="px-6 py-2 rounded-lg font-medium text-sm transition-all bg-indigo-500 hover:bg-indigo-600 text-white shadow-md"
            >
              {t('filter.apply')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
