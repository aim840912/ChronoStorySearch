'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { AdvancedFilterOptions, DataTypeFilter, ItemCategoryGroup, JobClass } from '@/types'

interface AdvancedFilterPanelProps {
  filter: AdvancedFilterOptions
  onFilterChange: (filter: AdvancedFilterOptions) => void
  isExpanded: boolean
}

/**
 * 進階篩選面板元件
 * 提供複合式篩選選項
 */
export function AdvancedFilterPanel({
  filter,
  onFilterChange,
  isExpanded,
}: AdvancedFilterPanelProps) {
  const { t } = useLanguage()

  // 處理資料類型變更（Toggle 模式）
  const handleDataTypeChange = (dataType: DataTypeFilter) => {
    // Toggle 模式：如果當前已選中，則切換為 'all'（取消選擇）
    const newDataType = filter.dataType === dataType ? 'all' : dataType
    onFilterChange({
      ...filter,
      dataType: newDataType,
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

  // 處理職業變更（多選）
  const handleJobClassToggle = (jobClass: JobClass) => {
    const newJobClasses = filter.jobClasses.includes(jobClass)
      ? filter.jobClasses.filter((j) => j !== jobClass)
      : [...filter.jobClasses, jobClass]

    onFilterChange({
      ...filter,
      jobClasses: newJobClasses,
      enabled: true,
    })
  }

  // 處理等級範圍變更
  const handleLevelRangeChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10)

    onFilterChange({
      ...filter,
      levelRange: {
        ...filter.levelRange,
        [type]: numValue,
      },
      enabled: true,
    })
  }

  // 計算已啟用篩選數量
  const activeFilterCount = [
    filter.dataType !== 'all' ? 1 : 0,
    filter.itemCategories.length > 0 ? 1 : 0,
    filter.jobClasses.length > 0 ? 1 : 0,
    (filter.levelRange.min !== null || filter.levelRange.max !== null) ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  // 驗證等級範圍是否有效（最高等級必須 >= 最低等級）
  const isLevelRangeValid =
    filter.levelRange.min === null ||
    filter.levelRange.max === null ||
    filter.levelRange.max >= filter.levelRange.min

  return (
    <div className="max-w-7xl mx-auto mb-4">
      {/* 篩選面板 */}
      <div
        className={`overflow-y-auto transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          {/* 資料類型篩選 */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {(['gacha'] as const).map((type) => (
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

          {/* 物品類別篩選 - 分組顯示 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('filter.itemCategory')}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                ({t('filter.multiSelect')})
              </span>
            </h4>

            {/* 穿著類 + 飾品類 - 同一列 */}
            <div className="mb-4 flex flex-col md:flex-row gap-6">
              {/* 穿著類 */}
              <div className="flex-1">
                <h5 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center">
                  <span className="w-1 h-4 bg-indigo-500 rounded mr-2"></span>
                  {t('filter.categoryGroup.apparel')}
                </h5>
                <div className="flex flex-wrap gap-2">
                  {(['hat', 'top', 'bottom', 'overall', 'shoes', 'gloves', 'cape'] as const).map((category) => (
                    <button
                      key={category}
                      onClick={() => handleCategoryToggle(category)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        filter.itemCategories.includes(category)
                          ? 'bg-indigo-500 text-white shadow-md'
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

              {/* 飾品類 */}
              <div className="md:w-80">
                <h5 className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-2 flex items-center">
                  <span className="w-1 h-4 bg-pink-500 rounded mr-2"></span>
                  {t('filter.categoryGroup.accessory')}
                </h5>
                <div className="flex flex-wrap gap-2">
                  {(['earring', 'accessory'] as const).map((category) => (
                    <button
                      key={category}
                      onClick={() => handleCategoryToggle(category)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        filter.itemCategories.includes(category)
                          ? 'bg-pink-500 text-white shadow-md'
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
            </div>

            {/* 武器防具類 */}
            <div className="mb-4">
              <h5 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center">
                <span className="w-1 h-4 bg-red-500 rounded mr-2"></span>
                {t('filter.categoryGroup.weapon')}
              </h5>
              <div className="flex flex-wrap gap-2">
                {(['sword', 'axe', 'bw', 'polearm', 'spear', 'dagger', 'claw', 'bow', 'crossbow', 'wand', 'staff', 'knuckle', 'gun', 'shield'] as const).map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      filter.itemCategories.includes(category)
                        ? 'bg-red-500 text-white shadow-md'
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

            {/* 消耗品類 */}
            <div className="mb-2">
              <h5 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center">
                <span className="w-1 h-4 bg-green-500 rounded mr-2"></span>
                {t('filter.categoryGroup.consumable')}
              </h5>
              <div className="flex flex-wrap gap-2">
                {(['scroll', 'potion', 'projectile'] as const).map((category) => (
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
          </div>

          {/* 職業篩選 + 等級範圍篩選 - 同一行 */}
          <div className="mb-6 flex flex-col md:flex-row gap-6">
            {/* 職業篩選 */}
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {t('filter.jobClass')}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                  ({t('filter.multiSelect')})
                </span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {(['beginner', 'warrior', 'magician', 'bowman', 'thief', 'pirate'] as const).map((jobClass) => (
                  <button
                    key={jobClass}
                    onClick={() => handleJobClassToggle(jobClass)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      filter.jobClasses.includes(jobClass)
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`filter.jobClass.${jobClass}`)}
                    {filter.jobClasses.includes(jobClass) && (
                      <svg className="inline-block w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 等級範圍篩選 */}
            <div className="md:w-80">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {t('filter.levelRange')}
              </h4>
              <div className="flex items-center gap-4">
                <input
                  id="level-min"
                  type="number"
                  min="0"
                  max="200"
                  value={filter.levelRange.min ?? ''}
                  onChange={(e) => handleLevelRangeChange('min', e.target.value)}
                  placeholder={t('filter.levelRange.min')}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <span className="text-gray-500 dark:text-gray-400">-</span>
                <input
                  id="level-max"
                  type="number"
                  min="0"
                  max="200"
                  value={filter.levelRange.max ?? ''}
                  onChange={(e) => handleLevelRangeChange('max', e.target.value)}
                  placeholder={t('filter.levelRange.max')}
                  className={`flex-1 px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent ${
                    !isLevelRangeValid
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-purple-500'
                  }`}
                />
              </div>
              {/* 錯誤訊息 */}
              {!isLevelRangeValid && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {t('filter.levelRange.error')}
                </p>
              )}
            </div>
          </div>

          {/* 已選標籤顯示 */}
          {activeFilterCount > 0 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                {t('filter.activeFilters')}:
              </h5>
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
                {filter.jobClasses.map((jobClass) => (
                  <span
                    key={jobClass}
                    className="px-3 py-1 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-100 rounded-full text-xs font-medium"
                  >
                    {t(`filter.jobClass.${jobClass}`)}
                  </span>
                ))}
                {(filter.levelRange.min !== null || filter.levelRange.max !== null) && (
                  <span className="px-3 py-1 bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-100 rounded-full text-xs font-medium">
                    {t('filter.levelRange')}: {filter.levelRange.min ?? 0} - {filter.levelRange.max ?? 200}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
