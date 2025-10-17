'use client'

import type { DropItem } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { getItemDisplayName } from '@/lib/display-name'
import { getItemImageUrl } from '@/lib/image-utils'

interface DropItemCardProps {
  drop: DropItem
  isFavorite: boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
  onItemClick: (itemId: number, itemName: string) => void
}

/**
 * 掉落物品卡片子元件
 * 用於 MonsterModal 內，顯示怪物掉落的物品
 */
export function DropItemCard({
  drop,
  isFavorite,
  onToggleFavorite,
  onItemClick,
}: DropItemCardProps) {
  const { language, t } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'

  // 獲取顯示名稱（支援中英文切換）
  const displayItemName = getItemDisplayName(drop.itemName, drop.chineseItemName, language)

  const chancePercent = (drop.chance * 100).toFixed(4)
  const qtyRange =
    drop.minQty === drop.maxQty ? `${drop.minQty}` : `${drop.minQty}-${drop.maxQty}`
  const itemIconUrl = drop.itemId === 0 ? null : getItemImageUrl(drop.itemId)

  return (
    <div
      onClick={() => onItemClick(drop.itemId, displayItemName)}
      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative"
    >
      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(drop.itemId, displayItemName)
        }}
        className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
          isFavorite
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-400 dark:text-gray-400 border border-gray-300 dark:border-gray-500'
        }`}
        aria-label={isFavorite ? t('card.unfavorite') : t('card.favorite')}
      >
        <svg
          className="w-4 h-4"
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

      <div className="flex items-center gap-3 mb-3">
        {/* 物品圖示 */}
        {itemIconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={itemIconUrl}
            alt={displayItemName}
            className="w-10 h-10 object-contain"
          />
        ) : (
          <span className="text-2xl">💰</span>
        )}
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">{displayItemName}</p>
          {isDev && (
            <p className="text-xs text-gray-500 dark:text-gray-400">ID: {drop.itemId}</p>
          )}
        </div>
      </div>
      <div className="flex gap-3 mt-2">
        <div className="flex-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('card.dropChance')}</div>
          <div className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded text-center">
            <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
              {chancePercent}%
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('card.quantity')}</div>
          <div className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded text-center">
            <span className="text-sm font-bold text-green-700 dark:text-green-300">
              {qtyRange}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
