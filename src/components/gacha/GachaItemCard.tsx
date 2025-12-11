'use client'

import { memo } from 'react'
import type { GachaItem } from '@/types'
import { getItemImageUrl } from '@/lib/image-utils'
import { getItemDisplayName } from '@/lib/display-name'

interface GachaItemCardProps {
  item: GachaItem
  language: 'zh-TW' | 'en'
  onItemClick?: (itemId: number, itemName: string) => void
}

export const GachaItemCard = memo(function GachaItemCard({ item, language, onItemClick }: GachaItemCardProps) {
  // 根據語言選擇顯示名稱（使用統一工具函數處理 null fallback）
  const displayName = getItemDisplayName(
    item.name || item.itemName || '',
    item.chineseName,
    language
  )

  // 物品圖示 URL（傳入 itemName 以支援卷軸圖示）
  const itemIconUrl = getItemImageUrl(item.itemId, { itemName: item.name || item.itemName })

  return (
    <div
      onClick={() => onItemClick?.(item.itemId, displayName)}
      className="p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
    >
      <div className="flex gap-2 items-center">
        {/* 物品圖示 */}
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
