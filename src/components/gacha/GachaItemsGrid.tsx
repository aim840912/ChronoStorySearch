'use client'

import { memo } from 'react'
import type { GachaItem } from '@/types'
import { getItemImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'

interface GachaItemsGridProps {
  items: GachaItem[]
  onItemClick?: (item: GachaItem) => void
}

/**
 * 轉蛋機物品瀏覽網格
 * 顯示轉蛋機內所有物品的網格視圖
 */
export const GachaItemsGrid = memo(function GachaItemsGrid({
  items,
  onItemClick,
}: GachaItemsGridProps) {
  const { t, language } = useLanguage()

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
          {t('gacha.noItems')}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        {t('gacha.allItems')} ({items.length})
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-14 gap-2 max-h-[500px] overflow-y-auto scrollbar-hide p-2 pt-10">
        {items.map((item) => {
          const itemName = language === 'zh-TW'
            ? item.chineseName
            : (item.itemName || item.name || item.chineseName)
          const itemIconUrl = getItemImageUrl(item.itemId, { itemName: item.name || item.itemName })

          return (
            <button
              key={item.itemId}
              onClick={() => onItemClick?.(item)}
              className="group relative flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-transparent hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all cursor-pointer"
              title={`${itemName} (${item.probability})`}
            >
              {/* 物品圖示 */}
              <div className="w-10 h-10 flex items-center justify-center">
                <img
                  src={itemIconUrl}
                  alt={itemName}
                  loading="lazy"
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* 機率標籤 */}
              <span className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-full">
                {item.probability}
              </span>

              {/* Hover 時顯示物品名稱 */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {itemName}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
})
