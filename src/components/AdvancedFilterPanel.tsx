'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { AdvancedFilterOptions, ItemCategoryGroup, JobClass, ElementType, StatType } from '@/types'

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

  // 判斷是否有任何篩選條件被設定
  const hasAnyFilterCriteria = (filterToCheck: Omit<AdvancedFilterOptions, 'enabled'>): boolean => {
    return (
      filterToCheck.itemCategories.length > 0 ||
      filterToCheck.jobClasses.length > 0 ||
      filterToCheck.elementWeaknesses.length > 0 ||
      filterToCheck.statBoosts.length > 0 ||
      filterToCheck.isBoss ||
      filterToCheck.isUndead ||
      filterToCheck.levelRange.min !== null ||
      filterToCheck.levelRange.max !== null ||
      filterToCheck.attackSpeedRange.min !== null ||
      filterToCheck.attackSpeedRange.max !== null
    )
  }

  // 處理物品類別變更（多選）
  const handleCategoryToggle = (category: ItemCategoryGroup) => {
    const newCategories = filter.itemCategories.includes(category)
      ? filter.itemCategories.filter((c) => c !== category)
      : [...filter.itemCategories, category]

    const newFilter = {
      ...filter,
      itemCategories: newCategories,
    }

    onFilterChange({
      ...newFilter,
      enabled: hasAnyFilterCriteria(newFilter),
    })
  }

  // 處理職業變更（多選）
  const handleJobClassToggle = (jobClass: JobClass) => {
    const newJobClasses = filter.jobClasses.includes(jobClass)
      ? filter.jobClasses.filter((j) => j !== jobClass)
      : [...filter.jobClasses, jobClass]

    const newFilter = {
      ...filter,
      jobClasses: newJobClasses,
    }

    onFilterChange({
      ...newFilter,
      enabled: hasAnyFilterCriteria(newFilter),
    })
  }

  // 處理屬性弱點變更（多選）
  const handleElementWeaknessToggle = (element: ElementType) => {
    const newElements = filter.elementWeaknesses.includes(element)
      ? filter.elementWeaknesses.filter((e) => e !== element)
      : [...filter.elementWeaknesses, element]

    const newFilter = {
      ...filter,
      elementWeaknesses: newElements,
    }

    onFilterChange({
      ...newFilter,
      enabled: hasAnyFilterCriteria(newFilter),
    })
  }

  // 處理 Boss 篩選變更
  const handleBossToggle = () => {
    const newFilter = {
      ...filter,
      isBoss: !filter.isBoss,
    }

    onFilterChange({
      ...newFilter,
      enabled: hasAnyFilterCriteria(newFilter),
    })
  }

  // 處理不死篩選變更
  const handleUndeadToggle = () => {
    const newFilter = {
      ...filter,
      isUndead: !filter.isUndead,
    }

    onFilterChange({
      ...newFilter,
      enabled: hasAnyFilterCriteria(newFilter),
    })
  }

  // 處理等級範圍變更
  const handleLevelRangeChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10)

    const newFilter = {
      ...filter,
      levelRange: {
        ...filter.levelRange,
        [type]: numValue,
      },
    }

    onFilterChange({
      ...newFilter,
      enabled: hasAnyFilterCriteria(newFilter),
    })
  }

  // 處理攻擊速度變更（單選下拉選單）
  const handleAttackSpeedChange = (value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10)

    // 單選模式：min 和 max 設為相同值
    const newFilter = {
      ...filter,
      attackSpeedRange: {
        min: numValue,
        max: numValue,
      },
    }

    onFilterChange({
      ...newFilter,
      enabled: hasAnyFilterCriteria(newFilter),
    })
  }

  // 處理主屬性變更（多選）
  const handleStatToggle = (stat: StatType) => {
    const newStatBoosts = filter.statBoosts.includes(stat)
      ? filter.statBoosts.filter((s) => s !== stat)
      : [...filter.statBoosts, stat]

    const newFilter = {
      ...filter,
      statBoosts: newStatBoosts,
    }

    onFilterChange({
      ...newFilter,
      enabled: hasAnyFilterCriteria(newFilter),
    })
  }

  // 驗證等級範圍是否有效（最高等級必須 >= 最低等級）
  const isLevelRangeValid =
    filter.levelRange.min === null ||
    filter.levelRange.max === null ||
    filter.levelRange.max >= filter.levelRange.min

  return (
    <div className="max-w-7xl mx-auto mb-4">
      {/* 篩選面板 */}
      <div
        className={`overflow-y-auto overscroll-contain touch-scroll-safe transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[60vh] min-h-[400px] sm:max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          {/* 物品類別篩選 - 分組顯示 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('filter.itemCategory')}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                ({t('filter.multiSelect')})
              </span>
            </h4>

            {/* 穿著類 + 飾品類 + 消耗品類 - 同一列 */}
            <div className="mb-4 flex flex-col lg:flex-row gap-6">
              {/* 穿著類（含耳環、飾品） */}
              <div className="flex-1">
                <h5 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center">
                  <span className="w-1 h-4 bg-indigo-500 rounded mr-2"></span>
                  {t('filter.categoryGroup.apparel')}
                </h5>
                <div className="flex flex-wrap gap-2">
                  {(['hat', 'top', 'bottom', 'overall', 'shoes', 'gloves', 'cape', 'earring', 'accessory'] as const).map((category) => (
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
                    </button>
                  ))}
                </div>
              </div>

              {/* 主屬性 + 消耗品類容器 - iPad mini 時並排，桌面版並排 */}
              <div className="flex flex-col md:flex-row lg:contents md:gap-6">
                {/* 主屬性篩選 */}
                <div className="flex-1">
                  <h5 className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-2 flex items-center">
                    <span className="w-1 h-4 bg-pink-500 rounded mr-2"></span>
                    {t('filter.categoryGroup.stat')}
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {(['str', 'dex', 'int', 'luk'] as const).map((stat) => (
                      <button
                        key={stat}
                        onClick={() => handleStatToggle(stat)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          filter.statBoosts.includes(stat)
                            ? 'bg-pink-500 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t(`filter.stat.${stat}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 消耗品類 */}
                <div className="flex-1">
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
                      </button>
                    ))}
                  </div>
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
                {(['oneHandedSword', 'twoHandedSword', 'oneHandedAxe', 'twoHandedAxe', 'oneHandedBW', 'twoHandedBW', 'polearm', 'spear', 'dagger', 'claw', 'bow', 'crossbow', 'wand', 'staff', 'knuckle', 'gun', 'shield'] as const).map((category) => (
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
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 職業篩選 + 屬性弱點篩選 + 等級範圍篩選 */}
          <div className="mb-0 flex flex-col lg:flex-row gap-6">
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
                  </button>
                ))}
              </div>
            </div>

            {/* 屬性弱點 + 等級範圍 - iPad mini 時並排，桌面版並排 */}
            <div className="flex flex-col md:flex-row lg:contents md:gap-6">
              {/* 屬性弱點篩選 */}
              <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {t('filter.elementWeakness')}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                  ({t('filter.multiSelect')})
                </span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {(['fire', 'ice', 'lightning', 'holy', 'poison'] as const).map((element) => {
                  const elementColors = {
                    fire: 'bg-red-500',
                    ice: 'bg-cyan-500',
                    lightning: 'bg-yellow-500',
                    holy: 'bg-purple-500',
                    poison: 'bg-green-500',
                  }
                  return (
                    <button
                      key={element}
                      onClick={() => handleElementWeaknessToggle(element)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        filter.elementWeaknesses.includes(element)
                          ? `${elementColors[element]} text-white shadow-md`
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t(`filter.elementWeakness.${element}`)}
                    </button>
                  )
                })}
              </div>
              </div>

              {/* 怪物類型篩選 */}
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t('filter.monsterType')}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                    ({t('filter.multiSelect')})
                  </span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {/* Boss 按鈕 */}
                  <button
                    onClick={handleBossToggle}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      filter.isBoss
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t('filter.monsterType.boss')}
                  </button>
                  {/* 不死按鈕 */}
                  <button
                    onClick={handleUndeadToggle}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      filter.isUndead
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t('filter.monsterType.undead')}
                  </button>
                </div>
              </div>

              {/* 數值範圍篩選區塊（等級 + 攻速） */}
              <div className="flex-1 space-y-4">
                {/* 等級範圍篩選 */}
                <div>
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

                {/* 攻擊速度篩選（單選下拉選單） */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {t('filter.attackSpeed')}
                  </h4>
                  <select
                    id="attack-speed"
                    value={filter.attackSpeedRange.min ?? ''}
                    onChange={(e) => handleAttackSpeedChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">{t('filter.attackSpeed.all')}</option>
                    {[2, 3, 4, 5, 6, 7, 8, 9].map((speed) => (
                      <option key={speed} value={speed}>{speed}</option>
                    ))}
                  </select>
                </div>
              </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
