'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { getItemDisplayName } from '@/lib/display-name'
import { getItemImageUrl } from '@/lib/image-utils'
import type { ItemSource } from '@/types'

interface ItemCardProps {
  itemId: number
  itemName: string
  chineseItemName?: string | null
  monsterCount: number
  onCardClick: (itemId: number, itemName: string) => void
  isFavorite: boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
  source?: ItemSource
}

/**
 * 物品卡片元件（用於最愛物品模式）
 * 顯示物品基本資訊和掉落怪物數量
 */
export function ItemCard({
  itemId,
  itemName,
  chineseItemName,
  monsterCount,
  onCardClick,
  isFavorite,
  onToggleFavorite,
  source,
}: ItemCardProps) {
  const { language, t } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'

  // 獲取顯示名稱（支援中英文切換）
  const displayItemName = getItemDisplayName(itemName, chineseItemName, language)

  const itemIconUrl = getItemImageUrl(itemId)

  return (
    <div
      onClick={() => onCardClick(itemId, displayItemName)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative"
    >
      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(itemId, displayItemName)
        }}
        className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
          isFavorite
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600'
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

      {/* 物品資訊 */}
      <div className="flex items-center gap-3 mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={itemIconUrl}
          alt={displayItemName}
          className="w-16 h-16 object-contain flex-shrink-0"

        />
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {displayItemName}
          </h3>
          {isDev && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('card.itemId')}: {itemId}
            </p>
          )}
        </div>
      </div>

      {/* 來源資訊區域 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="space-y-2">
          {/* 轉蛋機來源 */}
          {source?.fromGacha && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  轉蛋
                </span>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-lg">
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  轉蛋機
                </span>
              </div>
            </div>
          )}

          {/* 怪物掉落來源 */}
          {monsterCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* 惡魔圖示 - 表示怪物掉落 */}
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 640 512">
                  <path d="M320 64c17.7 0 32 14.3 32 32v64c0 17.7-14.3 32-32 32s-32-14.3-32-32V96c0-17.7 14.3-32 32-32zm113.5 22.5l32-32c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3l-32 32c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3zm-227 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l32 32c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0l-32-32zM224 256c-35.3 0-64 28.7-64 64v64c0 17.7 14.3 32 32 32H448c17.7 0 32-14.3 32-32V320c0-35.3-28.7-64-64-64H224zm-32 120a24 24 0 1 1 0-48 24 24 0 1 1 0 48zm208-24a24 24 0 1 1-48 0 24 24 0 1 1 48 0z"/>
                </svg>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('card.droppedBy')}
                </span>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {monsterCount} {t('card.monsterCount')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 提示文字 */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          {source?.fromGacha && monsterCount > 0
            ? t('card.viewAllSources')
            : monsterCount > 0
            ? t('card.viewAllMonsters')
            : t('card.viewGachaSources')}
        </p>
      </div>
    </div>
  )
}
