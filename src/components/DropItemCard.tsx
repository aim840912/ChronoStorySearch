'use client'

import { useState, useMemo } from 'react'
import type { DropItem, ItemAttributesEssential, ItemAttributes } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { getItemDisplayName } from '@/lib/display-name'
import { getItemImageUrl } from '@/lib/image-utils'
import { useLazyItemDetailed } from '@/hooks/useLazyData'
import { ItemAttributesCard } from './ItemAttributesCard'

interface DropItemCardProps {
  drop: DropItem
  itemAttributesMap: Map<number, ItemAttributesEssential>
  isFavorite: boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
  onItemClick: (itemId: number, itemName: string) => void
}

/**
 * 掉落物品卡片元件（用於 MonsterModal）
 * 顯示怪物掉落的物品資訊，包含掉落率和數量
 */
export function DropItemCard({
  drop,
  itemAttributesMap,
  isFavorite,
  onToggleFavorite,
  onItemClick,
}: DropItemCardProps) {
  const { language, t } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'
  const [isExpanded, setIsExpanded] = useState(false)
  const chancePercent = (drop.chance * 100).toFixed(4)
  const qtyRange =
    drop.minQty === drop.maxQty ? `${drop.minQty}` : `${drop.minQty}-${drop.maxQty}`

  // 獲取顯示名稱（支援中英文切換）
  const displayItemName = getItemDisplayName(drop.itemName, drop.chineseItemName, language)

  // 物品圖示 URL（傳入 itemName 以支援卷軸圖示）
  const itemIconUrl = getItemImageUrl(drop.itemId, { itemName: drop.itemName })

  // 根據物品類型決定顯示內容
  const essentialData = itemAttributesMap.get(drop.itemId)
  const itemType = essentialData?.type

  let label = t('card.quantity')
  let value: string | number = qtyRange

  if (itemType === 'Eqp' && essentialData?.req_level !== undefined) {
    // 裝備：type 是 'Eqp'，顯示等級（從 Essential 的 req_level 讀取）
    label = t('card.level')
    const reqLevel = essentialData.req_level
    value = reqLevel ? `Lv.${reqLevel}` : '-'
  }

  // 懶加載物品詳細資料（只在展開時載入）
  const shouldLoadDetailed = isExpanded && essentialData !== undefined
  const { data: itemDetailed, isLoading: isLoadingDetailed } = useLazyItemDetailed(
    shouldLoadDetailed ? drop.itemId : null
  )

  // 組合 Essential + Detailed 資料
  const combinedAttributes = useMemo<ItemAttributes | null>(() => {
    if (!essentialData) return null
    if (!itemDetailed) return null

    return {
      item_id: essentialData.item_id,
      item_name: essentialData.item_name,
      type: essentialData.type,
      sub_type: essentialData.sub_type,
      item_type_id: itemDetailed.item_type_id,
      sale_price: itemDetailed.sale_price,
      max_stack_count: itemDetailed.max_stack_count,
      untradeable: itemDetailed.untradeable,
      item_description: itemDetailed.item_description,
      equipment: itemDetailed.equipment,
      scroll: itemDetailed.scroll,
      potion: itemDetailed.potion,
    }
  }, [essentialData, itemDetailed])

  return (
    <div
      onClick={() => onItemClick(drop.itemId, displayItemName)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 cursor-pointer active:scale-[0.98] relative"
    >
      {/* 展開/收合按鈕 - 愛心左邊 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsExpanded(!isExpanded)
        }}
        className="absolute top-3 right-12 p-2 transition-all duration-200 hover:scale-110 active:scale-95 text-gray-400 hover:text-blue-500"
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

      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(drop.itemId, displayItemName)
        }}
        className={`absolute top-3 right-3 p-2 transition-all duration-200 hover:scale-110 active:scale-95 ${
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

      {/* 物品資訊 */}
      <div className="flex items-center gap-3 mb-4">
        <img
          src={itemIconUrl}
          alt={displayItemName}
          width={64}
          height={64}
          className="object-contain flex-shrink-0"
          loading="lazy"
        />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {displayItemName}
          </h3>
          {isDev && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('card.itemId')}: {drop.itemId}
            </p>
          )}
        </div>
      </div>

      {/* 掉落率和數量/等級/效果 */}
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('card.dropChance')}
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded">
            <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
              {chancePercent}%
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {label}
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded">
            <span className="text-sm font-bold text-green-700 dark:text-green-300">
              {value}
            </span>
          </div>
        </div>
      </div>

      {/* 可延展的物品屬性區塊 */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          {isLoadingDetailed && !combinedAttributes ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400" />
            </div>
          ) : (
            <ItemAttributesCard attributes={combinedAttributes} />
          )}
        </div>
      </div>
    </div>
  )
}
