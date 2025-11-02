'use client'

import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 交換匹配卡片元件
 *
 * 功能：
 * - 顯示交換匹配說明
 * - 查看匹配按鈕
 * - 僅在交換模式時顯示
 *
 * 使用範例：
 * ```tsx
 * <ExchangeMatchCard
 *   onViewMatch={() => setExchangeMatchOpen(true)}
 * />
 * ```
 */
interface ExchangeMatchCardProps {
  /** 查看匹配回調 */
  onViewMatch: () => void
}

export function ExchangeMatchCard({ onViewMatch }: ExchangeMatchCardProps) {
  const { t } = useLanguage()

  return (
    <div className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('listing.exchangeMatch')}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {t('listing.exchangeMatchDesc')}
      </p>
      <button
        onClick={onViewMatch}
        className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg
                   hover:bg-purple-600 transition-colors
                   flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        {t('listing.viewExchangeMatch')}
      </button>
    </div>
  )
}
