'use client'

import { memo } from 'react'
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
  reqLevel?: number | null
}

/**
 * 物品卡片元件（用於最愛物品模式）
 * 顯示物品基本資訊和掉落怪物數量
 *
 * 使用 React.memo 優化以避免不必要的重新渲染
 */
export const ItemCard = memo(function ItemCard({
  itemId,
  itemName,
  chineseItemName,
  monsterCount,
  onCardClick,
  isFavorite,
  onToggleFavorite,
  source,
  reqLevel,
}: ItemCardProps) {
  // monsterCount is part of props but not used in this component
  void monsterCount
  const { language, t } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'

  // 獲取顯示名稱（支援中英文切換）
  const displayItemName = getItemDisplayName(itemName, chineseItemName, language)

  const itemIconUrl = getItemImageUrl(itemId)

  return (
    <div
      onClick={() => onCardClick(itemId, displayItemName)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 hover:border-blue-500 cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative min-h-[140px]"
    >
      {/* 右上角按鈕群組 */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {/* 轉蛋機圖示 - 只在來自轉蛋機時顯示 */}
        {source?.fromGacha && (
          <div className="p-2 rounded-full bg-purple-500 text-white" title={t('card.gachaDrop')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="10" r="7" strokeWidth={2}/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10h14"/>
              <rect x="8" y="16" width="8" height="5" rx="1" strokeWidth={2}/>
              <circle cx="10" cy="8" r="1.5" strokeWidth={1.5}/>
              <circle cx="14" cy="12" r="1.5" strokeWidth={1.5}/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 10l2 2"/>
              <rect x="10" y="18" width="4" height="1.5" rx="0.5" strokeWidth={1}/>
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
        {/* 固定尺寸容器，確保圖片不會撐開卡片高度 */}
        <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
          <img
            src={itemIconUrl}
            alt={displayItemName}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>
        <div className="flex-1 pr-28">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {displayItemName}
          </h3>
          {/* 等級顯示 */}
          {reqLevel !== null && reqLevel !== undefined && (
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-500 text-white text-xs font-semibold">
                Lv. {reqLevel}
              </span>
            </div>
          )}
          {isDev && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('card.itemId')}: {itemId}
            </p>
          )}
        </div>
      </div>
    </div>
  )
})
