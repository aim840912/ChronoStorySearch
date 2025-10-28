'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { ItemStatFilter, StatFilterKey, STAT_FILTER_OPTIONS } from '@/types'

interface ItemStatFilterRowProps {
  filter: ItemStatFilter
  onChange: (id: string, updates: Partial<ItemStatFilter>) => void
  onRemove: (id: string) => void
  availableStats: StatFilterKey[]
  statOptions: typeof STAT_FILTER_OPTIONS
}

/**
 * 物品屬性篩選行元件
 *
 * 功能：
 * - 下拉選單選擇屬性類型
 * - 輸入最小值和最大值（範圍篩選）
 * - 刪除按鈕移除此篩選項
 *
 * 設計：
 * - 響應式布局（桌面版橫向，手機版堆疊）
 * - 深色模式支援
 * - 清晰的視覺分隔（最小值 ~ 最大值）
 */
export function ItemStatFilterRow({
  filter,
  onChange,
  onRemove,
  availableStats,
  statOptions
}: ItemStatFilterRowProps) {
  const { language } = useLanguage()

  // 獲取當前屬性的標籤
  const getStatLabel = (key: StatFilterKey): string => {
    return language === 'zh-TW' ? statOptions[key].labelZh : statOptions[key].labelEn
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
      {/* 屬性選擇下拉 */}
      <select
        value={filter.statKey}
        onChange={(e) => onChange(filter.id, { statKey: e.target.value as StatFilterKey })}
        className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                   focus:ring-2 focus:ring-purple-500 focus:border-transparent
                   transition-colors"
      >
        {availableStats.map((key) => (
          <option key={key} value={key}>
            {getStatLabel(key)}
          </option>
        ))}
      </select>

      {/* 最小值輸入 */}
      <input
        type="number"
        min="0"
        placeholder={language === 'zh-TW' ? '最小值' : 'Min'}
        value={filter.minValue === null ? '' : filter.minValue}
        onChange={(e) => onChange(filter.id, {
          minValue: e.target.value ? parseInt(e.target.value, 10) : null
        })}
        className="w-full sm:w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                   focus:ring-2 focus:ring-purple-500 focus:border-transparent
                   transition-colors"
      />

      {/* 分隔符 */}
      <span className="hidden sm:inline text-gray-400 dark:text-gray-500 font-medium">~</span>

      {/* 最大值輸入 */}
      <input
        type="number"
        min="0"
        placeholder={language === 'zh-TW' ? '最大值（選填）' : 'Max (optional)'}
        value={filter.maxValue === null ? '' : filter.maxValue}
        onChange={(e) => onChange(filter.id, {
          maxValue: e.target.value ? parseInt(e.target.value, 10) : null
        })}
        className="w-full sm:w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                   focus:ring-2 focus:ring-purple-500 focus:border-transparent
                   transition-colors"
      />

      {/* 刪除按鈕 */}
      <button
        onClick={() => onRemove(filter.id)}
        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
                   rounded-lg transition-colors flex-shrink-0"
        title={language === 'zh-TW' ? '移除此篩選' : 'Remove filter'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
