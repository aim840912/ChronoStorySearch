'use client'

import { memo } from 'react'
import type { FilterMode, ItemAttributesEssential, ViewHistoryItem, DropsEssential, GachaMachine, ItemIndexItem } from '@/types'
import { FavoriteMonstersList } from '@/components/lists/FavoriteMonstersList'
import { FavoriteItemsList } from '@/components/lists/FavoriteItemsList'
import { AllItemsView } from '@/components/lists/AllItemsView'
import { SkeletonGrid } from '@/components/CardSkeleton'
import { useLanguage } from '@/contexts/LanguageContext'

// 類型定義（與內部元件一致）
import type { ExtendedUniqueItem } from '@/types'
import type { RefObject } from 'react'

// 商人地點類型
interface MerchantLocation {
  mapId: string
  mapName: string
  chineseMapName: string
  region: string
}

type UniqueMonster = { mobId: number; mobName: string; chineseMobName?: string | null; dropCount: number }
type MixedCard =
  | { type: 'monster'; data: { mobId: number; mobName: string; chineseMobName?: string | null; dropCount: number } }
  | { type: 'item'; data: ExtendedUniqueItem }

interface InfiniteScrollResult<T> {
  displayedItems: T[]
  hasMore: boolean
  isMaxReached: boolean
  loadMore: () => void
  observerTarget: RefObject<HTMLDivElement | null>
}

interface ContentDisplayProps {
  // 通用狀態
  isLoading: boolean
  filterMode: FilterMode
  hasSearchTerm: boolean

  // 最愛怪物模式
  filteredUniqueMonsters: Array<{
    mobId: number
    mobName: string
    chineseMobName?: string | null
    dropCount: number
  }>
  mobLevelMap: Map<number, number | null>
  onMonsterCardClick: (mobId: number, mobName: string) => void
  onToggleFavorite: (mobId: number, mobName: string) => void
  isFavorite: (mobId: number) => boolean
  onClearMonsters: () => void

  // 最愛物品模式
  filteredUniqueItems: Array<{
    itemId: number
    itemName: string
    chineseItemName?: string | null
    monsterCount: number
  }>
  itemAttributesMap: Map<number, ItemAttributesEssential>
  merchantItemIndex: Map<string, MerchantLocation[]>
  onItemCardClick: (itemId: number, itemName: string) => void
  onToggleItemFavorite: (itemId: number, itemName: string) => void
  isItemFavorite: (itemId: number) => boolean
  onClearItems: () => void

  // 全部模式
  mixedCards: MixedCard[]
  displayedMonsters: UniqueMonster[]
  displayedItems: ExtendedUniqueItem[]
  shouldShowMonsters: boolean
  shouldShowItems: boolean
  monstersInfiniteScroll: InfiniteScrollResult<UniqueMonster>
  itemsInfiniteScroll: InfiniteScrollResult<ExtendedUniqueItem>
  hasSearchOrFilter: boolean
  hasAnyData: boolean

  // 瀏覽歷史（用於首頁顯示）
  viewHistory: ViewHistoryItem[]
  allDrops: DropsEssential[]
  gachaMachines: GachaMachine[]

  // 物品索引（用於查詢中文名稱）
  itemIndexMap: Map<number, ItemIndexItem>
}

/**
 * 內容顯示元件
 * 根據篩選模式顯示不同的列表（最愛怪物/最愛物品/全部）
 *
 * 使用 React.memo 優化以避免不必要的重新渲染
 */
export const ContentDisplay = memo(function ContentDisplay({
  isLoading,
  filterMode,
  hasSearchTerm,
  filteredUniqueMonsters,
  mobLevelMap,
  onMonsterCardClick,
  onToggleFavorite,
  isFavorite,
  onClearMonsters,
  filteredUniqueItems,
  itemAttributesMap,
  merchantItemIndex,
  onItemCardClick,
  onToggleItemFavorite,
  isItemFavorite,
  onClearItems,
  mixedCards,
  displayedMonsters,
  displayedItems,
  shouldShowMonsters,
  shouldShowItems,
  monstersInfiniteScroll,
  itemsInfiniteScroll,
  hasSearchOrFilter,
  hasAnyData,
  viewHistory,
  allDrops,
  gachaMachines,
  itemIndexMap,
}: ContentDisplayProps) {
  const { t } = useLanguage()

  // 載入中 - 使用骨架屏提升感知載入速度
  if (isLoading) {
    return <SkeletonGrid count={6} />
  }

  return (
    <>
      {filterMode === 'favorite-monsters' ? (
        /* 最愛怪物模式 */
        <FavoriteMonstersList
          monsters={filteredUniqueMonsters}
          hasSearchTerm={hasSearchTerm}
          mobLevelMap={mobLevelMap}
          onCardClick={onMonsterCardClick}
          onToggleFavorite={onToggleFavorite}
          onClearClick={onClearMonsters}
          t={t}
        />
      ) : filterMode === 'favorite-items' ? (
        /* 最愛物品模式 */
        <FavoriteItemsList
          items={filteredUniqueItems}
          hasSearchTerm={hasSearchTerm}
          itemAttributesMap={itemAttributesMap}
          merchantItemIndex={merchantItemIndex}
          onCardClick={onItemCardClick}
          onToggleFavorite={onToggleItemFavorite}
          onClearClick={onClearItems}
          t={t}
        />
      ) : (
        /* 全部模式 */
        <AllItemsView
          mixedCards={mixedCards}
          displayedMonsters={displayedMonsters}
          displayedItems={displayedItems}
          shouldShowMonsters={shouldShowMonsters}
          shouldShowItems={shouldShowItems}
          monstersInfiniteScroll={monstersInfiniteScroll}
          itemsInfiniteScroll={itemsInfiniteScroll}
          hasSearchOrFilter={hasSearchOrFilter}
          hasAnyData={hasAnyData}
          hasSearchTerm={hasSearchTerm}
          mobLevelMap={mobLevelMap}
          itemAttributesMap={itemAttributesMap}
          merchantItemIndex={merchantItemIndex}
          onMonsterCardClick={onMonsterCardClick}
          onItemCardClick={onItemCardClick}
          isFavorite={isFavorite}
          isItemFavorite={isItemFavorite}
          onToggleFavorite={onToggleFavorite}
          onToggleItemFavorite={onToggleItemFavorite}
          viewHistory={viewHistory}
          allDrops={allDrops}
          gachaMachines={gachaMachines}
          itemIndexMap={itemIndexMap}
          t={t}
        />
      )}
    </>
  )
})
