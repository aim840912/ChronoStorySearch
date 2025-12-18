'use client'

import { memo, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAutoFitText } from '@/hooks/useAutoFitText'
import { useDropRelations } from '@/hooks/useDropRelations'
import { getItemDisplayName } from '@/lib/display-name'
import { getItemImageUrl, getMonsterImageUrl } from '@/lib/image-utils'
import type { ItemSource } from '@/types'
import { BaseCard, CardHeader, CardImage, FavoriteButton, TypeBadge } from './cards'

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
  fromMerchant?: boolean // 是否有商人販售
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
  fromMerchant,
}: ItemCardProps) {
  void monsterCount
  const { language, t } = useLanguage()
  const { getMobsForItem } = useDropRelations()
  const isDev = process.env.NODE_ENV === 'development'

  const displayItemName = getItemDisplayName(itemName, chineseItemName, language)
  // 傳入 itemName 以支援卷軸圖示
  const itemIconUrl = getItemImageUrl(itemId, { itemName })

  // 取得會掉落此物品的怪物預覽圖示（全部傳入，由 CardHeader 動態顯示）
  const allIcons = useMemo(() => {
    const mobIds = getMobsForItem(itemId)
    return mobIds.map((mobId) => ({
      id: mobId,
      imageUrl: getMonsterImageUrl(mobId, { format: 'png' }),
    }))
  }, [itemId, getMobsForItem])

  // 自動縮放文字以適應兩行
  const { ref: titleRef, fontSize } = useAutoFitText({
    text: displayItemName,
    maxLines: 2,
    minFontSize: 12,
    maxFontSize: 18,
  })

  return (
    <BaseCard
      variant="item"
      onClick={() => onCardClick(itemId, displayItemName)}
      index={index}
    >
      {/* 頂部區域：標籤 + 預覽圖示 + 愛心 */}
      <CardHeader
        badges={
          <>
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
            {fromMerchant && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-stone-500 text-white text-xs font-bold"
                title={t('card.merchantDrop')}
              >
                {t('search.type.merchant')}
              </span>
            )}
          </>
        }
        allIcons={allIcons}
        favoriteButton={
          <FavoriteButton
            isFavorite={isFavorite}
            onToggle={() => onToggleFavorite(itemId, displayItemName)}
            ariaLabel={isFavorite ? t('card.unfavorite') : t('card.favorite')}
          />
        }
      />

      {/* 內容：圖片和名稱 - 固定 margin-top 確保位置一致 */}
      <div className="flex items-center gap-4 mt-10">
        <CardImage
          src={itemIconUrl}
          alt={displayItemName}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <h3
            ref={titleRef as React.RefObject<HTMLHeadingElement>}
            style={{ fontSize: `${fontSize}px` }}
            className="font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug"
          >
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
