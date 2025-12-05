'use client'

import { memo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useImageFormat } from '@/contexts/ImageFormatContext'
import { useAutoFitText } from '@/hooks/useAutoFitText'
import { getMonsterDisplayName } from '@/lib/display-name'
import { getMonsterImageUrl } from '@/lib/image-utils'
import { BaseCard, CardImage, FavoriteButton, TypeBadge } from './cards'

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
}: MonsterCardProps) {
  void dropCount
  const { language, t } = useLanguage()
  const { format } = useImageFormat()
  const isDev = process.env.NODE_ENV === 'development'

  const displayMobName = getMonsterDisplayName(mobName, chineseMobName, language)
  const monsterIconUrl = getMonsterImageUrl(mobId, { format })

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
      {/* 右上角愛心 - 絕對定位 */}
      <div className="absolute top-3 right-3">
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(mobId, displayMobName)}
          ariaLabel={isFavorite ? t('card.unfavorite') : t('card.favorite')}
        />
      </div>

      {/* 等級標籤 - 絕對定位在左上角 */}
      {level !== null && level !== undefined && (
        <div className="absolute top-3 left-5">
          <TypeBadge variant="monster" level={level} />
        </div>
      )}

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
          {isDev && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('card.monsterId')}: {mobId}
            </p>
          )}
        </div>
      </div>
    </BaseCard>
  )
})
