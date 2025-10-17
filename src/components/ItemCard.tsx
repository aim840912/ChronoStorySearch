'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getItemDisplayName } from '@/lib/display-name'

interface ItemCardProps {
  itemId: number
  itemName: string
  chineseItemName?: string | null
  monsterCount: number
  onCardClick: (itemId: number, itemName: string) => void
  isFavorite: boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
}

/**
 * 物品卡片元件（用於最愛物品模式）
 * 顯示物品基本資訊和掉落怪物數量
 */
export function ItemCard({
  itemId,
  itemName,
  chineseItemName,
  monsterCount,
  onCardClick,
  isFavorite,
  onToggleFavorite,
}: ItemCardProps) {
  const { language, t } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'
  const [imageError, setImageError] = useState(false)

  // 獲取顯示名稱（支援中英文切換）
  const displayItemName = getItemDisplayName(itemName, chineseItemName, language)

  const itemIconUrl =
    itemId === 0
      ? null
      : imageError
        ? '/images/items/default.svg'
        : `/images/items/${itemId}.png`

  return (
    <div
      onClick={() => onCardClick(itemId, displayItemName)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative"
    >
      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(itemId, displayItemName)
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

      {/* 物品資訊 */}
      <div className="flex items-center gap-3 mb-4">
        {itemIconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={itemIconUrl}
            alt={displayItemName}
            className="w-16 h-16 object-contain flex-shrink-0"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
            <span className="text-4xl">💰</span>
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {displayItemName}
          </h3>
          {isDev && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('card.itemId')}: {itemId}
            </p>
          )}
        </div>
      </div>

      {/* 掉落怪物數量資訊 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('card.droppedBy')}
            </span>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {monsterCount} {t('card.monsterCount')}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          {t('card.viewAllMonsters')}
        </p>
      </div>
    </div>
  )
}
