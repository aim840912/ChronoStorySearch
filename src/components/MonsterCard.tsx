'use client'

import { memo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useImageFormat } from '@/contexts/ImageFormatContext'
import { getMonsterDisplayName } from '@/lib/display-name'
import { getMonsterImageUrl } from '@/lib/image-utils'

interface MonsterCardProps {
  mobId: number
  mobName: string
  chineseMobName?: string | null
  dropCount: number
  onCardClick: (mobId: number, mobName: string) => void
  isFavorite: boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
  level?: number | null
}

/**
 * 怪物卡片元件（用於最愛怪物模式）
 * 顯示怪物基本資訊和掉落物數量
 *
 * 使用 React.memo 優化以避免不必要的重新渲染
 */
export const MonsterCard = memo(function MonsterCard({
  mobId,
  mobName,
  chineseMobName,
  dropCount,
  onCardClick,
  isFavorite,
  onToggleFavorite,
  level,
}: MonsterCardProps) {
  // dropCount is part of props but not used in this component
  void dropCount
  const { language, t } = useLanguage()
  const { format } = useImageFormat()
  const isDev = process.env.NODE_ENV === 'development'

  // 獲取顯示名稱（支援中英文切換）
  const displayMobName = getMonsterDisplayName(mobName, chineseMobName, language)

  const monsterIconUrl = getMonsterImageUrl(mobId, { format })

  return (
    <div
      onClick={() => onCardClick(mobId, displayMobName)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative min-h-[140px]"
    >
      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(mobId, displayMobName)
        }}
        className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
          isFavorite
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600'
        }`}
        aria-label={isFavorite ? t('card.unfavorite') : t('card.favorite')}
      >
        <svg
          className="w-5 h-5"
          fill={isFavorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>

      {/* 怪物資訊 */}
      <div className="flex items-center gap-3">
        {/* 固定尺寸容器，確保不同格式圖片不會撐開卡片高度 */}
        <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
          <img
            src={monsterIconUrl}
            alt={displayMobName}
            className="monster-image w-full h-full object-contain"
            loading="lazy"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {displayMobName}
          </h3>
          {/* 等級顯示 */}
          {level !== null && level !== undefined && (
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-500 text-white text-xs font-semibold">
                Lv. {level}
              </span>
            </div>
          )}
          {isDev && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('card.monsterId')}: {mobId}
            </p>
          )}
        </div>
      </div>
    </div>
  )
})
