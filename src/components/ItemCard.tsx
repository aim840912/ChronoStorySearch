'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { getItemDisplayName } from '@/lib/display-name'
import { getItemImageUrl } from '@/lib/image-utils'
import type { ItemSource } from '@/types'

interface ItemCardProps {
  itemId: number
  itemName: string
  chineseItemName?: string | null
  monsterCount: number
  onCardClick: (itemId: number, itemName: string) => void
  isFavorite: boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
  source?: ItemSource
}

/**
 * 物品卡片元件（用於最愛物品模式）
 * 顯示物品基本資訊和掉落怪物數量
 */
export function ItemCard({
  itemId,
  itemName,
  chineseItemName,
  monsterCount: _monsterCount,
  onCardClick,
  isFavorite,
  onToggleFavorite,
  source,
}: ItemCardProps) {
  const { language, t } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'

  // 獲取顯示名稱（支援中英文切換）
  const displayItemName = getItemDisplayName(itemName, chineseItemName, language)

  const itemIconUrl = getItemImageUrl(itemId)

  return (
    <div
      onClick={() => onCardClick(itemId, displayItemName)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative"
    >
      {/* 右上角按鈕群組 */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {/* 怪物掉落圖示 - 只在有怪物掉落時顯示 */}
        {source?.fromDrops && (
          <div className="p-2 rounded-full bg-green-500 text-white" title={t('card.monsterDrop')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
              />
            </svg>
          </div>
        )}
        {/* 轉蛋機圖示 - 只在來自轉蛋機時顯示 */}
        {source?.fromGacha && (
          <div className="p-2 rounded-full bg-purple-500 text-white" title={t('card.gachaDrop')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}
        {/* 最愛按鈕 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(itemId, displayItemName)
          }}
          className={`p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
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
      </div>

      {/* 物品資訊 */}
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={itemIconUrl}
          alt={displayItemName}
          className="w-16 h-16 object-contain flex-shrink-0"

        />
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
    </div>
  )
}
