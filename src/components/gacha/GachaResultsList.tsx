'use client'

import { memo } from 'react'
import type { GachaResult } from '@/types'
import { getItemImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'

interface GachaResultsListProps {
  results: GachaResult[]
  onShowDetails?: (item: GachaResult) => void
}

/**
 * 抽獎結果列表視圖（單列顯示，每項顯示完整資訊）
 */
export const GachaResultsList = memo(function GachaResultsList({
  results,
  onShowDetails,
}: GachaResultsListProps) {
  const { t, language } = useLanguage()

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-24 h-24 mx-auto mb-4 text-purple-400 dark:text-purple-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
          {t('gacha.startDrawing')}
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
          {t('gacha.clickDrawButton')}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        {t('gacha.results')}
      </h3>
      <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide">
        {results.map((item, index) => {
          const displayNumber = results.length - index
          const itemIconUrl = getItemImageUrl(item.itemId, { itemName: item.name || item.itemName })
          const itemName = language === 'zh-TW' ? item.chineseName : (item.itemName || item.name || item.chineseName)
          const level = item.requiredStats?.level

          return (
            <div
              key={`draw-${item.drawId}`}
              onClick={() => onShowDetails?.(item)}
              className="flex items-center gap-4 p-3 bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all"
            >
              {/* 序號 */}
              <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                #{displayNumber}
              </div>

              {/* 物品圖示 */}
              <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                <img
                  src={itemIconUrl}
                  alt={itemName}
                  loading="lazy"
                  className="w-10 h-10 object-contain"
                />
              </div>

              {/* 物品資訊 */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {itemName}
                </p>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span>{item.probability}</span>
                  {level !== undefined && level > 0 && (
                    <span>Lv.{level}</span>
                  )}
                  {item.randomStats && (
                    <span className="text-green-600 dark:text-green-400">
                      {t('gacha.hasRandomStats')}
                    </span>
                  )}
                </div>
              </div>

              {/* 箭頭指示 */}
              <svg
                className="w-5 h-5 text-gray-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          )
        })}
      </div>
    </div>
  )
})
