'use client'

import { memo, useRef, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TradeType, EquipmentStatsFilter } from '@/types/trade'

interface TradeFiltersProps {
  selectedType: TradeType | 'all'
  onTypeChange: (type: TradeType | 'all') => void
  searchQuery: string
  onSearchChange: (query: string) => void
  // 素質篩選
  statsFilter: EquipmentStatsFilter
  onStatsFilterChange: (filter: EquipmentStatsFilter) => void
  onStatsFilterReset: () => void
}

// 素質欄位配置
const STAT_FIELDS: Array<{
  key: keyof EquipmentStatsFilter
  labelZh: string
  labelEn: string
}> = [
  // 基礎四維
  { key: 'str', labelZh: '力量', labelEn: 'STR' },
  { key: 'dex', labelZh: '敏捷', labelEn: 'DEX' },
  { key: 'int', labelZh: '智力', labelEn: 'INT' },
  { key: 'luk', labelZh: '幸運', labelEn: 'LUK' },
  // 攻防
  { key: 'attack', labelZh: '攻擊', labelEn: 'ATK' },
  { key: 'magic', labelZh: '魔攻', labelEn: 'MAG' },
  { key: 'pDef', labelZh: '物防', labelEn: 'PDD' },
  { key: 'mDef', labelZh: '魔防', labelEn: 'MDD' },
  // HP/MP
  { key: 'hp', labelZh: 'HP', labelEn: 'HP' },
  { key: 'mp', labelZh: 'MP', labelEn: 'MP' },
  // 其他
  { key: 'accuracy', labelZh: '命中', labelEn: 'ACC' },
  { key: 'avoid', labelZh: '迴避', labelEn: 'EVA' },
  { key: 'speed', labelZh: '速度', labelEn: 'SPD' },
  { key: 'jump', labelZh: '跳躍', labelEn: 'JMP' },
  { key: 'slots', labelZh: '卷數', labelEn: 'Slots' },
]

/**
 * 交易篩選器
 * 包含交易類型篩選、物品搜尋和裝備素質篩選
 */
export const TradeFilters = memo(function TradeFilters({
  selectedType,
  onTypeChange,
  searchQuery,
  onSearchChange,
  statsFilter,
  onStatsFilterChange,
  onStatsFilterReset,
}: TradeFiltersProps) {
  const { t, language } = useLanguage()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isStatsExpanded, setIsStatsExpanded] = useState(false)
  const isZh = language === 'zh-TW'

  // 計算已啟用的篩選數量
  const activeFilterCount = Object.values(statsFilter).filter(v => v !== undefined && v !== null).length

  const typeOptions: Array<{ value: TradeType | 'all'; label: string }> = [
    { value: 'all', label: t('trade.allTypes') },
    { value: 'sell', label: t('trade.sell') },
    { value: 'buy', label: t('trade.buy') },
  ]

  // 更新單個素質篩選
  const handleStatChange = (key: keyof EquipmentStatsFilter, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10)
    if (value !== '' && isNaN(numValue!)) return // 非數字不處理

    onStatsFilterChange({
      ...statsFilter,
      [key]: numValue,
    })
  }

  return (
    <div className="space-y-3">
      {/* 交易類型篩選 */}
      <div className="flex gap-2">
        {typeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onTypeChange(option.value)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedType === option.value
                ? option.value === 'sell'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  : option.value === 'buy'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 物品搜尋 + 篩選素質按鈕 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('trade.searchPlaceholder')}
            className="w-full px-4 py-2.5 pl-10 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-3 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-2.5 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 篩選素質按鈕 */}
        <button
          type="button"
          onClick={() => setIsStatsExpanded(!isStatsExpanded)}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
            isStatsExpanded || activeFilterCount > 0
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {isZh ? '素質' : 'Stats'}
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-blue-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* 素質篩選展開面板 */}
      {isStatsExpanded && (
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {/* 標題和重置按鈕 */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isZh ? '素質篩選（最小值）' : 'Stats Filter (Min)'}
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onStatsFilterReset}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
              >
                {isZh ? '重置' : 'Reset'}
              </button>
            )}
          </div>

          {/* 素質輸入格 - 5 列網格 */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {STAT_FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {isZh ? field.labelZh : field.labelEn}
                </label>
                <input
                  type="number"
                  min="0"
                  value={statsFilter[field.key] ?? ''}
                  onChange={(e) => handleStatChange(field.key, e.target.value)}
                  placeholder={isZh ? '最小' : 'Min'}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
