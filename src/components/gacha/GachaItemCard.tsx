'use client'

import { memo } from 'react'
import type { GachaItem } from '@/types'
import { getItemImageUrl } from '@/lib/image-utils'

interface GachaItemCardProps {
  item: GachaItem
  language: 'zh-TW' | 'en'
  onItemClick?: (itemId: number, itemName: string) => void
}

export const GachaItemCard = memo(function GachaItemCard({ item, language, onItemClick }: GachaItemCardProps) {
  // 根據語言選擇顯示名稱
  const displayName = language === 'zh-TW' ? item.chineseName : (item.name || item.itemName || item.chineseName)

  // 物品圖示 URL
  const itemIconUrl = getItemImageUrl(item.itemId)

  return (
    <div
      onClick={() => onItemClick?.(item.itemId, displayName)}
      className="p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
    >
      <div className="flex gap-2 items-center">
        {/* 物品圖示 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={itemIconUrl}
          alt={displayName}
          className="w-12 h-12 object-contain flex-shrink-0"
        />

        {/* 物品名稱 */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 dark:text-white truncate">{displayName}</h4>
        </div>

        {/* 機率 */}
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {item.probability}
          </div>
        </div>
      </div>
    </div>
  )
})
