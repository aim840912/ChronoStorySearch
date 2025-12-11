'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface GachaButtonProps {
  isActive: boolean
  onClick: () => void
}

/**
 * 獨立的轉蛋按鈕元件
 * 用於快速切換到轉蛋篩選模式
 */
export function GachaButton({ isActive, onClick }: GachaButtonProps) {
  const { t } = useLanguage()

  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
        isActive
          ? 'bg-purple-600 text-white shadow-md'
          : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
      }`}
    >
      {t('search.type.gacha')}
    </button>
  )
}
