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
  // 傳入 itemName 以支援卷軸圖示
  const itemIconUrl = getItemImageUrl(itemId, { itemName })

  return (
    <BaseCard
      variant="item"
      onClick={() => onCardClick(itemId, displayItemName)}
      index={index}
    >
      {/* 右上角 - 收藏按鈕 */}
      <div className="absolute top-3 right-3">
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(itemId, displayItemName)}
          ariaLabel={isFavorite ? t('card.unfavorite') : t('card.favorite')}
        />
      </div>

      {/* 左上角標籤群組 - 等級 + 轉蛋 */}
      {((reqLevel !== null && reqLevel !== undefined) || source?.fromGacha) && (
        <div className="absolute top-3 left-5 flex items-center gap-2">
          {reqLevel !== null && reqLevel !== undefined && (
            <TypeBadge variant="item" level={reqLevel} />
          )}
          {source?.fromGacha && (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-500 text-white text-xs font-bold"
              title={t('card.gachaDrop')}
            >
              {t('search.type.gacha')}
            </span>
          )}
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
