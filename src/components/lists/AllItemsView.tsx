'use client'

import type { ExtendedUniqueItem, ItemAttributesEssential, ViewHistoryItem, DropsEssential, GachaMachine, GachaItem, ItemIndexItem } from '@/types'
import type { RefObject } from 'react'
import { MonsterCard } from '@/components/MonsterCard'
import { ItemCard } from '@/components/ItemCard'
import { EmptyState } from './EmptyState'

type UniqueMonster = { mobId: number; mobName: string; chineseMobName?: string | null; dropCount: number }

type MixedCard =
  | { type: 'monster'; data: UniqueMonster }
  | { type: 'item'; data: ExtendedUniqueItem }

// 商人地點類型
interface MerchantLocation {
  mapId: string
  mapName: string
  chineseMapName: string
  region: string
}

interface AllItemsViewProps {
  // 混合卡片（無搜尋時使用）
  mixedCards: MixedCard[]

  // 分離顯示的資料（有搜尋時使用）
  displayedMonsters: UniqueMonster[]
  displayedItems: ExtendedUniqueItem[]

  // 是否應該顯示
  shouldShowMonsters: boolean
  shouldShowItems: boolean

  // 無限滾動狀態
  monstersInfiniteScroll: {
    observerTarget: RefObject<HTMLDivElement | null>
    hasMore: boolean
    isMaxReached: boolean
  }
  itemsInfiniteScroll: {
    observerTarget: RefObject<HTMLDivElement | null>
    hasMore: boolean
    isMaxReached: boolean
  }

  // 條件判斷
  hasSearchOrFilter: boolean
  hasAnyData: boolean
  hasSearchTerm: boolean

  // 資料映射
  mobLevelMap: Map<number, number | null>
  itemAttributesMap: Map<number, ItemAttributesEssential>
  merchantItemIndex: Map<string, MerchantLocation[]>

  // 回調函數
  onMonsterCardClick: (mobId: number, mobName: string) => void
  onItemCardClick: (itemId: number, itemName: string) => void
  isFavorite: (mobId: number) => boolean
  isItemFavorite: (itemId: number) => boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
  onToggleItemFavorite: (itemId: number, itemName: string) => void

  // 瀏覽歷史（用於首頁顯示）
  viewHistory: ViewHistoryItem[]
  allDrops: DropsEssential[]
  gachaMachines: GachaMachine[]

  // 物品索引（用於查詢中文名稱）
  itemIndexMap: Map<number, ItemIndexItem>

  // 翻譯函數
  t: (key: string) => string
}

// 從轉蛋資料查找物品的 reqLevel
function getGachaItemReqLevel(machines: GachaMachine[], itemId: number): number | null {
  for (const machine of machines) {
    const gachaItem = machine.items.find(item => item.itemId === itemId)
    if (gachaItem) {
      return gachaItem.requiredStats?.level
        ?? (gachaItem.equipment?.requirements as { reqLevel?: number })?.reqLevel
        ?? null
    }
  }
  return null
}

/**
 * 全部模式檢視元件 - 顯示所有怪物和物品
 * 支援混合顯示和分離顯示兩種模式
 */
export function AllItemsView({
  mixedCards,
  displayedMonsters,
  displayedItems,
  shouldShowMonsters,
  shouldShowItems,
  monstersInfiniteScroll,
  itemsInfiniteScroll,
  hasSearchOrFilter,
  hasAnyData,
  hasSearchTerm,
  mobLevelMap,
  itemAttributesMap,
  merchantItemIndex,
  onMonsterCardClick,
  onItemCardClick,
  isFavorite,
  isItemFavorite,
  onToggleFavorite,
  onToggleItemFavorite,
  viewHistory,
  allDrops,
  gachaMachines,
  itemIndexMap,
  t,
}: AllItemsViewProps) {
  // 沒有任何資料時顯示空狀態
  if (!hasAnyData) {
    return (
      <EmptyState
        hasSearchTerm={hasSearchTerm}
        mode="all"
        t={t}
      />
    )
  }

  // 無搜尋詞且無進階篩選：優先顯示瀏覽歷史，沒有歷史時顯示隨機混合卡片
  if (!hasSearchOrFilter) {
    // 優先顯示瀏覽歷史
    if (viewHistory.length > 0) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mx-auto mt-8">
          {viewHistory.map((historyItem, index) => {
            if (historyItem.type === 'monster') {
              // 從 allDrops 查找怪物完整資料
              const monsterData = allDrops.find(drop => drop.mobId === historyItem.id)
              if (!monsterData) return null // 找不到資料時跳過

              return (
                <MonsterCard
                  key={`history-monster-${historyItem.id}-${index}`}
                  mobId={monsterData.mobId}
                  mobName={monsterData.mobName}
                  chineseMobName={monsterData.chineseMobName}
                  dropCount={1} // 瀏覽歷史不顯示 dropCount，設為 1
                  onCardClick={onMonsterCardClick}
                  isFavorite={isFavorite(monsterData.mobId)}
                  onToggleFavorite={onToggleFavorite}
                  level={mobLevelMap.get(monsterData.mobId) ?? null}
                  index={index}
                />
              )
            } else {
              // 從 allDrops 查找物品完整資料
              const itemData = allDrops.find(drop => drop.itemId === historyItem.id)

              // 同時從轉蛋資料查找（不論 itemData 是否存在，因為物品可能同時在掉落和轉蛋中）
              let gachaItemData: GachaItem | undefined
              for (const machine of gachaMachines) {
                gachaItemData = machine.items.find(item => item.itemId === historyItem.id)
                if (gachaItemData) break
              }

              // 都找不到時跳過
              if (!itemData && !gachaItemData) return null

              // 根據資料來源選擇顯示內容
              const displayItemId = itemData?.itemId ?? gachaItemData?.itemId
              // 如果都沒有 itemId，跳過
              if (!displayItemId) return null
              // 轉蛋物品優先使用 name（英文），若無則使用 chineseName
              const displayItemName = itemData?.itemName ?? gachaItemData?.name ?? gachaItemData?.chineseName ?? ''
              // 中文名稱查詢順序：item-index.json > allDrops > gacha JSON
              const displayChineseName = itemIndexMap.get(displayItemId)?.chineseItemName ?? itemData?.chineseItemName ?? gachaItemData?.chineseName ?? ''
              // 只要在轉蛋中找到就標記為轉蛋物品（即使同時在掉落中）
              const isFromGacha = !!gachaItemData
              // 取得等級：優先從 itemAttributesMap，fallback 到轉蛋資料
              // 注意：轉蛋資料的 equipment.requirements 使用 camelCase (reqLevel)
              const reqLevel = itemAttributesMap.get(displayItemId)?.req_level
                ?? gachaItemData?.requiredStats?.level
                ?? (gachaItemData?.equipment?.requirements as { reqLevel?: number | null } | undefined)?.reqLevel
                ?? null

              return (
                <ItemCard
                  key={`history-item-${historyItem.id}-${index}`}
                  itemId={displayItemId}
                  itemName={displayItemName}
                  chineseItemName={displayChineseName}
                  monsterCount={1} // 瀏覽歷史不顯示 monsterCount，設為 1
                  onCardClick={onItemCardClick}
                  isFavorite={isItemFavorite(displayItemId)}
                  onToggleFavorite={onToggleItemFavorite}
                  source={{ fromDrops: !!itemData, fromGacha: isFromGacha }}
                  reqLevel={reqLevel}
                  index={index}
                  fromMerchant={merchantItemIndex.has(displayItemName.toLowerCase())}
                />
              )
            }
          })}
        </div>
      )
    }

    // 沒有瀏覽歷史時，顯示隨機混合卡片
    if (mixedCards.length > 0) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mx-auto mt-8">
          {mixedCards.map((card, index) => {
            if (card.type === 'monster') {
              return (
                <MonsterCard
                  key={`monster-${card.data.mobId}-${index}`}
                  mobId={card.data.mobId}
                  mobName={card.data.mobName}
                  chineseMobName={card.data.chineseMobName}
                  dropCount={card.data.dropCount}
                  onCardClick={onMonsterCardClick}
                  isFavorite={isFavorite(card.data.mobId)}
                  onToggleFavorite={onToggleFavorite}
                  level={mobLevelMap.get(card.data.mobId) ?? null}
                  index={index}
                />
              )
            } else {
              return (
                <ItemCard
                  key={`item-${card.data.itemId}-${index}`}
                  itemId={card.data.itemId}
                  itemName={card.data.itemName}
                  chineseItemName={card.data.chineseItemName}
                  monsterCount={card.data.monsterCount}
                  onCardClick={onItemCardClick}
                  isFavorite={isItemFavorite(card.data.itemId)}
                  onToggleFavorite={onToggleItemFavorite}
                  source={card.data.source}
                  reqLevel={
                    itemAttributesMap.get(card.data.itemId)?.req_level
                    ?? (card.data.source.fromGacha ? getGachaItemReqLevel(gachaMachines, card.data.itemId) : null)
                  }
                  index={index}
                  fromMerchant={merchantItemIndex.has(card.data.itemName.toLowerCase())}
                />
              )
            }
          })}
        </div>
      )
    }
  }

  // 有搜尋詞：分區顯示怪物和物品
  return (
    <>
      {/* 怪物區塊 */}
      {shouldShowMonsters && displayedMonsters.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mx-auto mt-6 sm:mt-8">
            {displayedMonsters.map((monster, index) => (
              <MonsterCard
                key={monster.mobId}
                mobId={monster.mobId}
                mobName={monster.mobName}
                chineseMobName={monster.chineseMobName}
                dropCount={monster.dropCount}
                onCardClick={onMonsterCardClick}
                isFavorite={isFavorite(monster.mobId)}
                onToggleFavorite={onToggleFavorite}
                level={mobLevelMap.get(monster.mobId) ?? null}
                index={index}
              />
            ))}
          </div>

          {/* 無限滾動觸發器 */}
          {monstersInfiniteScroll.hasMore && (
            <div
              ref={monstersInfiniteScroll.observerTarget}
              className="h-20 flex items-center justify-center max-w-7xl mx-auto mt-4"
            >
              <div className="text-gray-500 dark:text-gray-400 text-sm">載入更多怪物...</div>
            </div>
          )}

          {/* 上限提示訊息 */}
          {monstersInfiniteScroll.isMaxReached && (
            <div className="max-w-7xl mx-auto mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  {t('scroll.maxReached').replace('{count}', displayedMonsters.length.toString())}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* 物品區塊 */}
      {shouldShowItems && displayedItems.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mx-auto mt-6 sm:mt-8">
            {displayedItems.map((item, index) => (
              <ItemCard
                key={item.itemId}
                itemId={item.itemId}
                itemName={item.itemName}
                chineseItemName={item.chineseItemName}
                monsterCount={item.monsterCount}
                onCardClick={onItemCardClick}
                isFavorite={isItemFavorite(item.itemId)}
                onToggleFavorite={onToggleItemFavorite}
                source={item.source}
                reqLevel={
                  itemAttributesMap.get(item.itemId)?.req_level
                  ?? (item.source.fromGacha ? getGachaItemReqLevel(gachaMachines, item.itemId) : null)
                }
                index={index}
                fromMerchant={merchantItemIndex.has(item.itemName.toLowerCase())}
              />
            ))}
          </div>

          {/* 無限滾動觸發器 */}
          {itemsInfiniteScroll.hasMore && (
            <div
              ref={itemsInfiniteScroll.observerTarget}
              className="h-20 flex items-center justify-center max-w-7xl mx-auto mt-4"
            >
              <div className="text-gray-500 dark:text-gray-400 text-sm">載入更多物品...</div>
            </div>
          )}

          {/* 上限提示訊息 */}
          {itemsInfiniteScroll.isMaxReached && (
            <div className="max-w-7xl mx-auto mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  {t('scroll.maxReached').replace('{count}', displayedItems.length.toString())}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
