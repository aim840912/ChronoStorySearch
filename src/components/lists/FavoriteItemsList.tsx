'use client'

import type { ItemAttributes } from '@/types'
import { ItemCard } from '@/components/ItemCard'
import { EmptyState } from './EmptyState'

type UniqueFavoriteItem = { itemId: number; itemName: string; chineseItemName?: string | null; monsterCount: number }

interface FavoriteItemsListProps {
  items: UniqueFavoriteItem[]
  hasSearchTerm: boolean
  itemAttributesMap: Map<number, ItemAttributes>
  onCardClick: (itemId: number, itemName: string) => void
  onToggleFavorite: (itemId: number, itemName: string) => void
  t: (key: string) => string
}

/**
 * 最愛物品列表元件 - 顯示使用者收藏的物品
 */
export function FavoriteItemsList({
  items,
  hasSearchTerm,
  itemAttributesMap,
  onCardClick,
  onToggleFavorite,
  t,
}: FavoriteItemsListProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
      {items.map((item) => (
        <ItemCard
          key={item.itemId}
          itemId={item.itemId}
          itemName={item.itemName}
          chineseItemName={item.chineseItemName}
          monsterCount={item.monsterCount}
          onCardClick={onCardClick}
          isFavorite={true}
          onToggleFavorite={onToggleFavorite}
          reqLevel={itemAttributesMap.get(item.itemId)?.equipment?.requirements?.req_level ?? null}
        />
      ))}
    </div>
  )
}
