/**
 * 掉落物品列表元件（表格視圖）
 *
 * 功能：
 * - 表格式佈局，適合快速掃描和比較
 * - 支援點擊查看物品詳情
 * - 支援最愛功能
 * - 響應式設計（手機版簡化欄位）
 * - 點擊按鈕展開顯示物品屬性
 */

'use client'

import { useState } from 'react'
import type { DropItem, ItemAttributesEssential } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { getItemDisplayName } from '@/lib/display-name'
import { getItemImageUrl } from '@/lib/image-utils'
import { useLazyItemDetailed } from '@/hooks/useLazyData'
import { ItemAttributesCard } from './ItemAttributesCard'

interface DropItemListProps {
  drops: DropItem[]
  itemAttributesMap: Map<number, ItemAttributesEssential>
  isItemFavorite: (itemId: number) => boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
  onItemClick: (itemId: number, itemName: string) => void
}

export function DropItemList({
  drops,
  itemAttributesMap,
  isItemFavorite,
  onToggleFavorite,
  onItemClick,
}: DropItemListProps) {
  const { t } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600">
            <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
              {/* 最愛欄位（圖示） */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </th>
            <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('card.item') || '物品'}
            </th>
            <th className="text-center p-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('card.dropChance') || '掉落率'}
            </th>
            <th className="text-center p-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hidden sm:table-cell">
              {t('card.quantity') || '數量/等級'}
            </th>
            {isDev && (
              <th className="text-center p-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hidden md:table-cell">
                ID
              </th>
            )}
            <th className="text-center p-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
              {/* 展開欄位（圖示） */}
              <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </th>
          </tr>
        </thead>
        <tbody>
          {drops.map((drop, index) => (
            <DropItemListRow
              key={drop.itemId}
              drop={drop}
              itemAttributesMap={itemAttributesMap}
              isFavorite={isItemFavorite(drop.itemId)}
              onToggleFavorite={onToggleFavorite}
              onItemClick={onItemClick}
              isEvenRow={index % 2 === 0}
              isDev={isDev}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================
// 列表行元件（單一物品）
// ============================================

interface DropItemListRowProps {
  drop: DropItem
  itemAttributesMap: Map<number, ItemAttributesEssential>
  isFavorite: boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
  onItemClick: (itemId: number, itemName: string) => void
  isEvenRow: boolean
  isDev: boolean
}

function DropItemListRow({
  drop,
  itemAttributesMap,
  isFavorite,
  onToggleFavorite,
  onItemClick,
  isEvenRow,
  isDev,
}: DropItemListRowProps) {
  const { language, t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)

  const chancePercent = drop.chance.toFixed(4)
  const qtyRange =
    drop.minQty === drop.maxQty ? `${drop.minQty}` : `${drop.minQty}-${drop.maxQty}`

  // 獲取顯示名稱
  const displayItemName = getItemDisplayName(drop.itemName, drop.chineseItemName, language)

  // 物品圖示 URL（傳入 itemName 以支援卷軸圖示）
  const itemIconUrl = getItemImageUrl(drop.itemId, { itemName: drop.itemName })

  // 根據物品類型決定顯示內容
  const essentialData = itemAttributesMap.get(drop.itemId)
  const itemType = essentialData?.type

  let value: string | number = qtyRange

  if (itemType === 'Eqp' && essentialData?.req_level !== undefined) {
    // 裝備：顯示等級
    const reqLevel = essentialData.req_level
    value = reqLevel ? `Lv.${reqLevel}` : '-'
  }

  // 懶加載物品詳細資料（只在展開時載入）
  // 現在 useLazyItemDetailed 直接返回 ItemsOrganizedData 格式
  const shouldLoadDetailed = isExpanded && essentialData !== undefined
  const { data: itemDetailed, isLoading: isLoadingDetailed } = useLazyItemDetailed(
    shouldLoadDetailed ? drop.itemId : null
  )

  // 計算 colspan（根據是否為開發模式，+1 是展開按鈕欄）
  const colSpan = isDev ? 6 : 5

  return (
    <>
      {/* 主要資料行 */}
      <tr
        onClick={() => onItemClick(drop.itemId, displayItemName)}
        className={`
          cursor-pointer
          transition-all duration-200
          hover:bg-blue-50 dark:hover:bg-blue-900/20
          ${!isExpanded && 'border-b border-gray-200 dark:border-gray-700'}
          ${isEvenRow ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}
        `}
      >
        {/* 最愛按鈕 */}
        <td className="p-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(drop.itemId, displayItemName)
            }}
            className={`
              p-2 rounded-full transition-all duration-200
              hover:scale-110 active:scale-95
              ${
                isFavorite
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600'
              }
            `}
            aria-label={isFavorite ? t('card.unfavorite') : t('card.favorite')}
          >
            <svg
              className="w-4 h-4"
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
        </td>

        {/* 物品資訊（圖示 + 名稱） */}
        <td className="p-3">
          <div className="flex items-center gap-3">
            <img
              src={itemIconUrl}
              alt={displayItemName}
              width={48}
              height={48}
              className="object-contain flex-shrink-0"
              loading="lazy"
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 dark:text-white truncate">
                {displayItemName}
              </div>
            </div>
          </div>
        </td>

        {/* 掉落率 */}
        <td className="p-3 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold text-sm">
            {chancePercent}%
          </span>
        </td>

        {/* 數量/等級（手機版隱藏） */}
        <td className="p-3 text-center hidden sm:table-cell">
          <span className="inline-block px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold text-sm">
            {value}
          </span>
        </td>

        {/* 開發模式：物品 ID（桌面版才顯示） */}
        {isDev && (
          <td className="p-3 text-center text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell">
            {drop.itemId}
          </td>
        )}

        {/* 展開/收合按鈕 */}
        <td className="p-3 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 hover:text-blue-500 border border-gray-300 dark:border-gray-600"
            aria-label={isExpanded ? t('card.collapse') : t('card.expand')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isExpanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              )}
            </svg>
          </button>
        </td>
      </tr>

      {/* 延展行：物品屬性詳情 */}
      <tr
        className={`
          border-b border-gray-200 dark:border-gray-700
          ${isEvenRow ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}
        `}
      >
        <td colSpan={colSpan} className="p-0">
          <div
            className={`
              overflow-hidden transition-all duration-300 ease-in-out
              ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}
            `}
          >
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              {isLoadingDetailed && !itemDetailed ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400" />
                </div>
              ) : (
                <ItemAttributesCard itemData={itemDetailed} />
              )}
            </div>
          </div>
        </td>
      </tr>
    </>
  )
}
