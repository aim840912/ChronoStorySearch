'use client'

import { memo } from 'react'
import type { GachaResult } from '@/types'
import { getItemImageUrl } from '@/lib/image-utils'

interface GachaResultCardProps {
  item: GachaResult
  onShowDetails?: (item: GachaResult) => void
}

/**
 * 抽獎結果卡片元件（點擊顯示詳細資訊）
 */
export const GachaResultCard = memo(function GachaResultCard({ item, onShowDetails }: GachaResultCardProps) {
  // 物品圖示 URL
  const itemIconUrl = getItemImageUrl(item.itemId)

  // 點擊事件處理
  const handleClick = () => {
    if (onShowDetails) {
      onShowDetails(item)
    }
  }

  return (
    <div
      onClick={handleClick}
      className="relative bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 p-1 aspect-square flex items-center justify-center cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-lg transition-all"
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
