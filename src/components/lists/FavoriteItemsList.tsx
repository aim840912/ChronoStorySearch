'use client'

import { useState } from 'react'
import type { ItemAttributesEssential } from '@/types'
import { ExpandableFavoriteItemCard } from '@/components/ExpandableFavoriteItemCard'
import { MultiplexAd } from '@/components/adsense'
import { EmptyState } from './EmptyState'

type UniqueFavoriteItem = { itemId: number; itemName: string; chineseItemName?: string | null; monsterCount: number }

// 商人地點類型
interface MerchantLocation {
  mapId: string
  mapName: string
  chineseMapName: string
  region: string
}

interface FavoriteItemsListProps {
  items: UniqueFavoriteItem[]
  hasSearchTerm: boolean
  itemAttributesMap: Map<number, ItemAttributesEssential>
  merchantItemIndex: Map<string, MerchantLocation[]>
  onCardClick: (itemId: number, itemName: string) => void
  onToggleFavorite: (itemId: number, itemName: string) => void
  onClearClick: () => void
  onReorder: (fromIndex: number, toIndex: number) => void
  t: (key: string) => string
}

/**
 * 最愛物品列表元件 - 顯示使用者收藏的物品
 * 支援拖曳排序功能
 */
export function FavoriteItemsList({
  items,
  hasSearchTerm,
  itemAttributesMap,
  merchantItemIndex,
  onCardClick,
  onToggleFavorite,
  onClearClick,
  onReorder,
  t,
}: FavoriteItemsListProps) {
  // 拖曳狀態
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null)

  // 拖曳處理函數
  const handleDragStart = (e: React.DragEvent, itemId: number) => {
    setDraggedItemId(itemId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetItemId: number) => {
    e.preventDefault()
    if (!draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId(null)
      return
    }
    // 找到 index 並呼叫 reorder
    const fromIndex = items.findIndex((item) => item.itemId === draggedItemId)
    const toIndex = items.findIndex((item) => item.itemId === targetItemId)
    if (fromIndex !== -1 && toIndex !== -1) {
      onReorder(fromIndex, toIndex)
    }
    setDraggedItemId(null)
  }

  const handleDragEnd = () => {
    setDraggedItemId(null)
  }

  if (items.length === 0) {
    return (
      <EmptyState
        hasSearchTerm={hasSearchTerm}
        mode="favorite-items"
        t={t}
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto mt-8">
      {/* 清除按鈕 */}
      <div className="flex justify-end mb-4">
        <button
          onClick={onClearClick}
          className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 border-2 border-red-500 hover:border-red-600 text-red-500 hover:text-red-600 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg"
          title="清除所有最愛物品"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {t('filter.clear')}
        </button>
      </div>

      {/* 卡片網格 - items-start 防止展開時撐高其他卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
        {items.map((item, index) => (
          <ExpandableFavoriteItemCard
            key={item.itemId}
            itemId={item.itemId}
            itemName={item.itemName}
            chineseItemName={item.chineseItemName}
            monsterCount={item.monsterCount}
            onCardClick={onCardClick}
            isFavorite={true}
            onToggleFavorite={onToggleFavorite}
            reqLevel={itemAttributesMap.get(item.itemId)?.req_level ?? null}
            index={index}
            fromMerchant={merchantItemIndex.has(item.itemName.toLowerCase())}
            // 拖曳相關
            isDragging={draggedItemId === item.itemId}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {items.length >= 4 && <MultiplexAd />}
    </div>
  )
}
