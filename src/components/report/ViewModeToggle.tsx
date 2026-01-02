'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { ReportViewMode } from '@/types/report'

interface ViewModeToggleProps {
  viewMode: ReportViewMode
  onViewModeChange: (mode: ReportViewMode) => void
}

/**
 * 視圖模式切換按鈕
 * 切換平鋪檢視和分組檢視
 */
export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  const { t } = useLanguage()

  return (
    <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-600 overflow-hidden">
      {/* 平鋪檢視 */}
      <button
        type="button"
        onClick={() => onViewModeChange('flat')}
        className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors
          ${viewMode === 'flat'
            ? 'bg-blue-500 text-white'
            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
          }`}
        title={t('report.viewMode.flat')}
      >
        {/* 列表圖示 */}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="hidden sm:inline">{t('report.viewMode.flat')}</span>
      </button>

      {/* 分組檢視 */}
      <button
        type="button"
        onClick={() => onViewModeChange('grouped')}
        className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors border-l border-zinc-300 dark:border-zinc-600
          ${viewMode === 'grouped'
            ? 'bg-blue-500 text-white'
            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
          }`}
        title={t('report.viewMode.grouped')}
      >
        {/* 分組圖示 */}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="hidden sm:inline">{t('report.viewMode.grouped')}</span>
      </button>
    </div>
  )
}
