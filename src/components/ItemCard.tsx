'use client'

import { memo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getItemDisplayName } from '@/lib/display-name'
import { getItemImageUrl } from '@/lib/image-utils'
import type { ItemSource } from '@/types'
import { BaseCard, CardImage, FavoriteButton, TypeBadge } from './cards'

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
  index?: number // 用於 staggered 動畫
}

/**
 * 物品卡片元件
 *
 * 特色：
 * - 玻璃擬態效果（backdrop-blur）
 * - Framer Motion 入場動畫
 * - 藍色主題（hover 邊框、發光效果）
 * - 轉蛋機來源標示
 * - 使用 React.memo 優化效能
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
  index = 0,
}: ItemCardProps) {
  void monsterCount
  const { language, t } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'

  const displayItemName = getItemDisplayName(itemName, chineseItemName, language)
  const itemIconUrl = getItemImageUrl(itemId)

  return (
    <BaseCard
      variant="item"
      onClick={() => onCardClick(itemId, displayItemName)}
      index={index}
    >
      {/* 右上角按鈕群組 - 絕對定位 */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {/* 轉蛋機圖示 */}
        {source?.fromGacha && (
          <div
            className="p-2 rounded-full bg-purple-500 text-white"
            title={t('card.gachaDrop')}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="10" r="7" strokeWidth={2} />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10h14"
              />
              <rect x="8" y="16" width="8" height="5" rx="1" strokeWidth={2} />
              <circle cx="10" cy="8" r="1.5" strokeWidth={1.5} />
              <circle cx="14" cy="12" r="1.5" strokeWidth={1.5} />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 10l2 2"
              />
              <rect x="10" y="18" width="4" height="1.5" rx="0.5" strokeWidth={1} />
            </svg>
          </div>
        )}
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(itemId, displayItemName)}
          ariaLabel={isFavorite ? t('card.unfavorite') : t('card.favorite')}
        />
      </div>

      {/* 等級標籤 - 絕對定位在左上角 */}
      {reqLevel !== null && reqLevel !== undefined && (
        <div className="absolute top-3 left-5">
          <TypeBadge variant="item" level={reqLevel} />
        </div>
      )}

      {/* 內容：圖片和名稱 - 固定 margin-top 確保位置一致 */}
      <div className="flex items-center gap-4 mt-10">
        <CardImage
          src={itemIconUrl}
          alt={displayItemName}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {displayItemName}
          </h3>
          {isDev && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('card.itemId')}: {itemId}
            </p>
          )}
        </div>
      </div>
    </BaseCard>
  )
})
