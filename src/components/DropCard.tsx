'use client'

import type { DropItem } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { getMonsterDisplayName, getItemDisplayName } from '@/lib/display-name'
import { getItemImageUrl, getMonsterImageUrl } from '@/lib/image-utils'

interface DropCardProps {
  drop: DropItem
  onCardClick: (mobId: number, mobName: string) => void
  isFavorite: boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
  maxHP?: number | null // 怪物血量（可選，部分怪物沒有血量資料）
}

/**
 * 掉落資料卡片元件（用於全部模式）
 * 顯示怪物及其掉落物品的完整資訊
 */
export function DropCard({ drop, onCardClick, isFavorite, onToggleFavorite, maxHP }: DropCardProps) {
  const { language, t } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'
  const chancePercent = (drop.chance * 100).toFixed(4)

  // 獲取顯示名稱（支援中英文切換）
  const displayMobName = getMonsterDisplayName(drop.mobName, drop.chineseMobName, language)
  const displayItemName = getItemDisplayName(drop.itemName, drop.chineseItemName, language)

  // 使用本地圖片，直接使用工具函數
  const monsterIconUrl = getMonsterImageUrl(drop.mobId)

  // 物品圖示 URL（itemId = 0 是 Meso，不顯示圖示）
  const itemIconUrl = drop.itemId === 0 ? null : getItemImageUrl(drop.itemId)

  return (
    <div
      onClick={() => onCardClick(drop.mobId, displayMobName)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative"
    >
      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(drop.mobId, displayMobName)
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
      <div className="flex items-center gap-3 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={monsterIconUrl}
          alt={displayMobName}
          className="w-12 h-12 object-contain flex-shrink-0"
          
        />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{displayMobName}</h3>
          {isDev && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('card.monsterId')}: {drop.mobId}
            </p>
          )}
        </div>
      </div>

      {/* 掉落物品資訊 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          {/* 物品圖示 */}
          {itemIconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={itemIconUrl}
              alt={displayItemName}
              className="w-8 h-8 object-contain flex-shrink-0"
              
            />
          ) : (
            <span className="text-lg">💰</span>
          )}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('card.drop')}:</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {displayItemName}
            </span>
          </div>
        </div>

        {/* 機率和血量 */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('card.dropRate')}</div>
            <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded">
              <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                {chancePercent}%
              </span>
            </div>
          </div>
          {maxHP !== null && maxHP !== undefined && (
            <div className="flex-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('monster.maxHP')}</div>
              <div className="bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
                <span className="text-sm font-bold text-red-700 dark:text-red-300">
                  {maxHP.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 物品 ID */}
        {isDev && (
          <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            {t('card.itemId')}: {drop.itemId}
          </div>
        )}
      </div>
    </div>
  )
}
