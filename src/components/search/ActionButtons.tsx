'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface ActionButtonsProps {
  isAdvancedFilterExpanded: boolean
  onAdvancedFilterToggle: () => void
  advancedFilterCount: number
  onResetAdvancedFilter: () => void
  filterSummary?: string
  fullWidth?: boolean
}

/**
 * 動作按鈕元件
 * 包含進階篩選按鈕和清除篩選按鈕
 */
export function ActionButtons({
  isAdvancedFilterExpanded,
  onAdvancedFilterToggle,
  advancedFilterCount,
  onResetAdvancedFilter,
  filterSummary,
  fullWidth = false,
}: ActionButtonsProps) {
  const { t } = useLanguage()

  return (
    <div className={`flex gap-2 ${fullWidth ? 'w-full' : 'flex-shrink-0'}`}>
      {/* 進階篩選按鈕 */}
      <button
        onClick={onAdvancedFilterToggle}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 bg-indigo-500 hover:bg-indigo-600 text-white shadow-md hover:shadow-lg whitespace-nowrap ${fullWidth ? 'flex-1 justify-center' : ''}`}
      >
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${isAdvancedFilterExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
        <span>
          {t('filter.advanced')}
          {advancedFilterCount > 0 && filterSummary && `: ${filterSummary}`}
        </span>
      </button>

      {/* 清除篩選按鈕 */}
      {advancedFilterCount > 0 && (
        <button
          onClick={onResetAdvancedFilter}
          className="px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 border-2 border-red-500/50 hover:border-red-500 text-red-500 hover:text-red-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md hover:shadow-lg whitespace-nowrap"
          title={t('filter.clear')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {t('filter.clear')}
        </button>
      )}
    </div>
  )
}
