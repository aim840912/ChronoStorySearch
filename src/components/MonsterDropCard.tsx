'use client'

import { memo } from 'react'
import type { DropItem } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useImageFormat } from '@/contexts/ImageFormatContext'
import { getMonsterDisplayName } from '@/lib/display-name'
import { getMonsterImageUrl } from '@/lib/image-utils'

interface MonsterDropCardProps {
  drop: DropItem
  monsterHPMap: Map<number, number | null>
  isFavorite: boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
  onMonsterClick: (mobId: number, mobName: string) => void
}

/**
 * 怪物掉落卡片元件（用於 ItemModal）
 * 顯示掉落特定物品的怪物資訊，包含掉落率和血量
 *
 * 使用 React.memo 優化以避免不必要的重新渲染
 */
export const MonsterDropCard = memo(function MonsterDropCard({
  drop,
  monsterHPMap,
  isFavorite,
  onToggleFavorite,
  onMonsterClick,
}: MonsterDropCardProps) {
  const { language, t } = useLanguage()
  const { format } = useImageFormat()
  const isDev = process.env.NODE_ENV === 'development'
  const chancePercent = drop.chance.toFixed(4)

  // 計算怪物血量顯示值
  const monsterHP = monsterHPMap.get(drop.mobId)
  const hpDisplay = monsterHP !== undefined && monsterHP !== null
    ? monsterHP.toLocaleString()
    : 'N/A'

  // 獲取顯示名稱（支援中英文切換）
  const displayMobName = getMonsterDisplayName(drop.mobName, drop.chineseMobName, language)

  const monsterIconUrl = getMonsterImageUrl(drop.mobId, { format })

  return (
    <div
      onClick={() => onMonsterClick(drop.mobId, displayMobName)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative"
    >
      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(drop.mobId, displayMobName)
        }}
        className={`absolute top-3 right-3 p-2 transition-all duration-200 hover:scale-110 active:scale-95 ${
          isFavorite
            ? 'text-red-500 hover:text-red-600'
            : 'text-gray-400 hover:text-red-400'
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
      <div className="flex items-center gap-3 mb-4">
        <img
          src={monsterIconUrl}
          alt={displayMobName}
          className="w-16 h-16 monster-image flex-shrink-0"
        />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {displayMobName}
          </h3>
          {isDev && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('card.monsterId')}: {drop.mobId}
            </p>
          )}
        </div>
      </div>

      {/* 掉落率和血量 */}
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('card.dropChance')}
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded">
            <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
              {chancePercent}%
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('card.hp')}
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
            <span className="text-sm font-bold text-red-700 dark:text-red-300">
              {hpDisplay}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})
