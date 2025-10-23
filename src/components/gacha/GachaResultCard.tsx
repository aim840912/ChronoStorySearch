'use client'

import { memo } from 'react'
import type { GachaItem } from '@/types'
import { getItemImageUrl } from '@/lib/image-utils'

interface GachaResultCardProps {
  item: GachaItem & { drawId: number }
}

/**
 * 抽獎結果卡片元件（純展示版 - 只顯示圖片和序號）
 */
export const GachaResultCard = memo(function GachaResultCard({ item }: GachaResultCardProps) {
  // 物品圖示 URL
  const itemIconUrl = getItemImageUrl(item.itemId)

  return (
    <div className="relative bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 p-1 aspect-square flex items-center justify-center">
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
