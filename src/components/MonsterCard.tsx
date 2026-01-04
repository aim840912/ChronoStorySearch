'use client'

import { memo, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useImageFormat } from '@/contexts/ImageFormatContext'
import { useAutoFitText } from '@/hooks/useAutoFitText'
import { useDropRelations } from '@/hooks/useDropRelations'
import { useShowDevInfo } from '@/hooks/useShowDevInfo'
import { getMonsterDisplayName } from '@/lib/display-name'
import { getItemImageUrl, getMonsterImageUrl } from '@/lib/image-utils'
import { BaseCard, CardHeader, CardImage, FavoriteButton, TypeBadge } from './cards'

interface MonsterCardProps {
  mobId: number
  mobName: string
  chineseMobName?: string | null
  dropCount: number
  onCardClick: (mobId: number, mobName: string) => void
  isFavorite: boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
  level?: number | null
  index?: number // 用於 staggered 動畫
  inGame?: boolean // 是否已在遊戲中
}

/**
 * 怪物卡片元件
 *
 * 特色：
 * - 玻璃擬態效果（backdrop-blur）
 * - Framer Motion 入場動畫
 * - 紅色主題（hover 邊框、發光效果）
 * - 使用 React.memo 優化效能
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
  index = 0,
  inGame = true,
}: MonsterCardProps) {
  void dropCount
  const { language, t } = useLanguage()
  const { format } = useImageFormat()
  const { getScrollsForMob } = useDropRelations()
  const showDevInfo = useShowDevInfo()

  const displayMobName = getMonsterDisplayName(mobName, chineseMobName, language)
  const monsterIconUrl = getMonsterImageUrl(mobId, { format })

  // 取得此怪物會掉落的卷軸預覽圖示（全部傳入，由 CardHeader 動態顯示）
  const allIcons = useMemo(() => {
    const scrolls = getScrollsForMob(mobId)
    return scrolls.map((scroll) => ({
      id: scroll.id,
      imageUrl: getItemImageUrl(scroll.id, { itemName: scroll.name }),
    }))
  }, [mobId, getScrollsForMob])

  // 自動縮放文字以適應兩行
  const { ref: titleRef, fontSize } = useAutoFitText({
    text: displayMobName,
    maxLines: 2,
    minFontSize: 12,
    maxFontSize: 18,
  })

  return (
    <BaseCard
      variant="monster"
      onClick={() => onCardClick(mobId, displayMobName)}
      index={index}
    >
      {/* 頂部區域：標籤 + 預覽圖示 + 愛心 */}
      <CardHeader
        badges={
          <div className="flex gap-1.5">
            {level !== null && level !== undefined && (
              <TypeBadge variant="monster" level={level} />
            )}
            {!inGame && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-xs font-medium">
                {t('card.unreleased')}
              </span>
            )}
          </div>
        }
        allIcons={allIcons}
        favoriteButton={
          <FavoriteButton
            isFavorite={isFavorite}
            onToggle={() => onToggleFavorite(mobId, displayMobName)}
            ariaLabel={isFavorite ? t('card.unfavorite') : t('card.favorite')}
          />
        }
      />

      {/* 內容：圖片和名稱 - 固定 margin-top 確保位置一致 */}
      <div className="flex items-center gap-4 mt-10">
        <CardImage
          src={monsterIconUrl}
          alt={displayMobName}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <h3
            ref={titleRef as React.RefObject<HTMLHeadingElement>}
            style={{ fontSize: `${fontSize}px` }}
            className="font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug"
          >
            {displayMobName}
          </h3>
          {showDevInfo && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('card.monsterId')}: {mobId}
            </p>
          )}
        </div>
      </div>
    </BaseCard>
  )
})
