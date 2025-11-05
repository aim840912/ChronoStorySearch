'use client'

import { memo, useRef } from 'react'
import type { GachaResult, RandomEquipmentStats } from '@/types'
import { getItemImageUrl } from '@/lib/image-utils'

interface GachaResultCardProps {
  item: GachaResult
  onItemHover?: (
    itemId: number | null,
    itemName: string,
    rect: DOMRect | null,
    randomStats?: RandomEquipmentStats
  ) => void
}

/**
 * 抽獎結果卡片元件（支援 hover 顯示隨機屬性）
 */
export const GachaResultCard = memo(function GachaResultCard({ item, onItemHover }: GachaResultCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 物品圖示 URL
  const itemIconUrl = getItemImageUrl(item.itemId)

  // Hover 事件處理（與 DropItemCard 相同邏輯）
  const handleMouseEnter = () => {
    if (!onItemHover) return

    // 清除之前的延遲計時器
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // 延遲 300ms 後觸發（避免意外觸發）
    hoverTimeoutRef.current = setTimeout(() => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        onItemHover(item.itemId, item.chineseName, rect, item.randomStats)
      }
    }, 300)
  }

  const handleMouseLeave = () => {
    if (!onItemHover) return

    // 清除延遲計時器
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    // 延遲 200ms 後關閉（給用戶時間移動滑鼠）
    hoverTimeoutRef.current = setTimeout(() => {
      onItemHover(null, '', null, undefined)
    }, 200)
  }

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 p-1 aspect-square flex items-center justify-center cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
    >
      {/* 抽取序號 */}
      <div className="absolute top-0.5 left-0.5 bg-purple-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full z-10">
        #{item.drawId}
      </div>

      {/* 物品圖示 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={itemIconUrl}
        alt={`Draw #${item.drawId}`}
        loading="lazy"
        className="w-full h-full object-contain p-1.5"
      />
    </div>
  )
})
