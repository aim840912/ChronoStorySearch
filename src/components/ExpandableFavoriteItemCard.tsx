'use client'

import { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAutoFitText } from '@/hooks/useAutoFitText'
import { useDropRelations } from '@/hooks/useDropRelations'
import { useLazyItemDetailed } from '@/hooks/useLazyData'
import { useShowDevInfo } from '@/hooks/useShowDevInfo'
import { getItemDisplayName } from '@/lib/display-name'
import { getItemImageUrl, getMonsterImageUrl } from '@/lib/image-utils'
import type { ItemSource } from '@/types'
import { ItemAttributesCard } from './ItemAttributesCard'
import { CardHeader } from '@/components/cards/CardHeader'

interface ExpandableFavoriteItemCardProps {
  itemId: number
  itemName: string
  chineseItemName?: string | null
  monsterCount: number
  onCardClick: (itemId: number, itemName: string) => void
  isFavorite: boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
  source?: ItemSource
  reqLevel?: number | null
  index?: number
  fromMerchant?: boolean
  // 拖曳相關 props
  isDragging?: boolean
  onDragStart?: (e: React.DragEvent, itemId: number) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, itemId: number) => void
  onDragEnd?: () => void
}

/**
 * 可展開的收藏物品卡片元件
 *
 * 特色：
 * - 點擊展開按鈕可顯示物品完整屬性
 * - 懶加載：只在展開時才載入詳細資料
 * - 參考 DropItemCard 的展開/收合模式
 */
export function ExpandableFavoriteItemCard({
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
  isDragging = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ExpandableFavoriteItemCardProps) {
  void monsterCount
  const { language, t } = useLanguage()
  const { getMobsForItem } = useDropRelations()
  const showDevInfo = useShowDevInfo()

  // 展開狀態
  const [isExpanded, setIsExpanded] = useState(false)

  // 懶加載物品詳細資料（只在展開時載入）
  const { data: itemDetailed, isLoading } = useLazyItemDetailed(
    isExpanded ? itemId : null
  )

  const displayItemName = getItemDisplayName(itemName, chineseItemName, language)
  const itemIconUrl = getItemImageUrl(itemId, { itemName })

  // 取得會掉落此物品的怪物預覽圖示（CardHeader 會自動處理顯示數量）
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

  // Staggered 動畫延遲
  const animationDelay = `${index * 50}ms`

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(e, itemId) : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop ? (e) => onDrop(e, itemId) : undefined}
      onDragEnd={onDragEnd}
      className={`
        relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 border border-blue-200/50 dark:border-blue-700/50 hover:border-blue-400 dark:hover:border-blue-500 animate-fade-in-up
        ${onDragStart ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isDragging ? 'opacity-50 scale-95' : ''}
      `}
      style={{ animationDelay }}
    >
      {/* 頂部區域：使用 CardHeader 統一樣式 */}
      <CardHeader
        badges={
          <>
            {reqLevel !== null && reqLevel !== undefined && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-500 text-white text-xs font-bold">
                Lv.{reqLevel}
              </span>
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
          <div className="flex items-center gap-1">
            {/* 展開/收合按鈕 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="p-1.5 transition-all duration-200 hover:scale-110 active:scale-95 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
              aria-label={isExpanded ? t('card.collapse') : t('card.expand')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isExpanded ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                )}
              </svg>
            </button>

            {/* 最愛按鈕 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(itemId, displayItemName)
              }}
              className={`p-1.5 transition-all duration-200 hover:scale-110 active:scale-95 ${
                isFavorite
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-gray-400 hover:text-red-400'
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
        }
      />

      {/* 內容：圖片和名稱（可點擊導覽） */}
      <div
        onClick={() => onCardClick(itemId, displayItemName)}
        className="flex items-center gap-4 mt-10 cursor-pointer"
      >
        <img
          src={itemIconUrl}
          alt={displayItemName}
          className="w-16 h-16 object-contain flex-shrink-0"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <h3
            ref={titleRef as React.RefObject<HTMLHeadingElement>}
            style={{ fontSize: `${fontSize}px` }}
            className="font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug"
          >
            {displayItemName}
          </h3>
          {showDevInfo && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('card.itemId')}: {itemId}
            </p>
          )}
        </div>
      </div>

      {/* 可展開的物品屬性區塊 */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          {isLoading && !itemDetailed ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
            </div>
          ) : (
            <ItemAttributesCard itemData={itemDetailed} showMaxOnly />
          )}
        </div>
      </div>
    </div>
  )
}
