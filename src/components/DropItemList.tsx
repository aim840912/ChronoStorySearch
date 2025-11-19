/**
 * 掉落物品列表元件（表格視圖）
 *
 * 功能：
 * - 表格式佈局，適合快速掃描和比較
 * - 支援點擊查看物品詳情
 * - 支援最愛功能
 * - 響應式設計（手機版簡化欄位）
 * - 與 DropItemCard 功能一致
 */

'use client'

import { useRef } from 'react'
import type { DropItem, ItemAttributesEssential } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { getItemDisplayName } from '@/lib/display-name'
import { getItemImageUrl } from '@/lib/image-utils'

interface DropItemListProps {
  drops: DropItem[]
  itemAttributesMap: Map<number, ItemAttributesEssential>
  isItemFavorite: (itemId: number) => boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
  onItemClick: (itemId: number, itemName: string) => void
  onItemHover?: (itemId: number | null, itemName: string, rect: DOMRect | null) => void
}

export function DropItemList({
  drops,
  itemAttributesMap,
  isItemFavorite,
  onToggleFavorite,
  onItemClick,
  onItemHover,
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
              onItemHover={onItemHover}
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
  onItemHover?: (itemId: number | null, itemName: string, rect: DOMRect | null) => void
  isEvenRow: boolean
  isDev: boolean
}

function DropItemListRow({
  drop,
  itemAttributesMap,
  isFavorite,
  onToggleFavorite,
  onItemClick,
  onItemHover,
  isEvenRow,
  isDev,
}: DropItemListRowProps) {
  const { language, t } = useLanguage()
  const rowRef = useRef<HTMLTableRowElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const chancePercent = (drop.chance * 100).toFixed(4)
  const qtyRange =
    drop.minQty === drop.maxQty ? `${drop.minQty}` : `${drop.minQty}-${drop.maxQty}`

  // 獲取顯示名稱
  const displayItemName = getItemDisplayName(drop.itemName, drop.chineseItemName, language)

  // 物品圖示 URL
  const itemIconUrl = getItemImageUrl(drop.itemId)

  // 根據物品類型決定顯示內容
  const itemAttributes = itemAttributesMap.get(drop.itemId)
  const itemType = itemAttributes?.type

  let value: string | number = qtyRange

  if (itemType === 'Eqp' && itemAttributes?.req_level !== undefined) {
    // 裝備：顯示等級
    const reqLevel = itemAttributes.req_level
    value = reqLevel ? `Lv.${reqLevel}` : '-'
  }

  // Hover 事件處理
  const handleMouseEnter = () => {
    if (!onItemHover) return

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    hoverTimeoutRef.current = setTimeout(() => {
      if (rowRef.current) {
        const rect = rowRef.current.getBoundingClientRect()
        onItemHover(drop.itemId, displayItemName, rect)
      }
    }, 300)
  }

  const handleMouseLeave = () => {
    if (!onItemHover) return

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    hoverTimeoutRef.current = setTimeout(() => {
      onItemHover(null, '', null)
    }, 200)
  }

  return (
    <tr
      ref={rowRef}
      onClick={() => onItemClick(drop.itemId, displayItemName)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        cursor-pointer
        transition-all duration-200
        hover:bg-blue-50 dark:hover:bg-blue-900/20
        border-b border-gray-200 dark:border-gray-700
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
    </tr>
  )
}
