'use client'

import type { ExtendedUniqueItem, ItemAttributesEssential, GachaMachine } from '@/types'
import type { RefObject } from 'react'
import { MonsterCard } from '@/components/MonsterCard'
import { ItemCard } from '@/components/ItemCard'
import { InFeedAd, DisplayAd, MultiplexAd } from '@/components/adsense'
import { EmptyState } from './EmptyState'

/** 每隔多少張卡片插入一個廣告 */
const AD_INTERVAL = 8
/** 每個區段最多插入的 InFeed 廣告數量 */
const MAX_ADS_PER_SECTION = 5

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
  mobInGameMap: Map<number, boolean>
  itemAttributesMap: Map<number, ItemAttributesEssential>
  merchantItemIndex: Map<string, MerchantLocation[]>

  // 回調函數
  onMonsterCardClick: (mobId: number, mobName: string) => void
  onItemCardClick: (itemId: number, itemName: string) => void
  isFavorite: (mobId: number) => boolean
  isItemFavorite: (itemId: number) => boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
  onToggleItemFavorite: (itemId: number, itemName: string) => void

  // 轉蛋資料（用於查詢 reqLevel）
  gachaMachines: GachaMachine[]

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
  mobInGameMap,
  itemAttributesMap,
  merchantItemIndex,
  onMonsterCardClick,
  onItemCardClick,
  isFavorite,
  isItemFavorite,
  onToggleFavorite,
  onToggleItemFavorite,
  gachaMachines,
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

  // 無搜尋詞且無進階篩選：顯示最新怪物為主的混合卡片，共 40 張
  if (!hasSearchOrFilter) {
    const TOTAL_DISPLAY_COUNT = 40
    const displayCards = mixedCards.slice(0, TOTAL_DISPLAY_COUNT)

    if (displayCards.length > 0) {
      // 渲染卡片並穿插廣告
      const cardsWithAds: React.ReactNode[] = []
      let homeAdCount = 0

      displayCards.forEach((card, index) => {
        if (card.type === 'monster') {
          cardsWithAds.push(
            <MonsterCard
              key={`home-monster-${card.data.mobId}`}
              mobId={card.data.mobId}
              mobName={card.data.mobName}
              chineseMobName={card.data.chineseMobName}
              dropCount={card.data.dropCount}
              onCardClick={onMonsterCardClick}
              isFavorite={isFavorite(card.data.mobId)}
              onToggleFavorite={onToggleFavorite}
              level={mobLevelMap.get(card.data.mobId) ?? null}
              index={index}
              inGame={mobInGameMap.get(card.data.mobId) ?? true}
            />
          )
        } else {
          cardsWithAds.push(
            <ItemCard
              key={`home-item-${card.data.itemId}`}
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

        // Insert ad every AD_INTERVAL cards
        if ((index + 1) % AD_INTERVAL === 0 && index < displayCards.length - 1 && homeAdCount < MAX_ADS_PER_SECTION) {
          cardsWithAds.push(<InFeedAd key={`ad-home-${index}`} />)
          homeAdCount++
        }
      })

      return (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mx-auto mt-8">
            {cardsWithAds}
          </div>
          <MultiplexAd />
        </>
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
            {(() => {
              let monsterAdCount = 0
              return displayedMonsters.flatMap((monster, index) => {
                const card = (
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
                    inGame={mobInGameMap.get(monster.mobId) ?? true}
                  />
                )
                if ((index + 1) % AD_INTERVAL === 0 && index < displayedMonsters.length - 1 && monsterAdCount < MAX_ADS_PER_SECTION) {
                  monsterAdCount++
                  return [card, <InFeedAd key={`ad-monster-${index}`} />]
                }
                return [card]
              })
            })()}
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

          {/* 無限滾動載入點廣告 */}
          {!monstersInfiniteScroll.hasMore && !monstersInfiniteScroll.isMaxReached && displayedMonsters.length > AD_INTERVAL && (
            <InFeedAd className="mt-4 max-w-7xl mx-auto" />
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

      {/* 怪物區與物品區之間的展示廣告 */}
      {shouldShowMonsters && displayedMonsters.length > 0 && shouldShowItems && displayedItems.length > 0 && (
        <DisplayAd />
      )}

      {/* 物品區塊 */}
      {shouldShowItems && displayedItems.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mx-auto mt-6 sm:mt-8">
            {(() => {
              let itemAdCount = 0
              return displayedItems.flatMap((item, index) => {
                const card = (
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
                )
                if ((index + 1) % AD_INTERVAL === 0 && index < displayedItems.length - 1 && itemAdCount < MAX_ADS_PER_SECTION) {
                  itemAdCount++
                  return [card, <InFeedAd key={`ad-item-${index}`} />]
                }
                return [card]
              })
            })()}
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

          {/* 無限滾動載入點廣告 */}
          {!itemsInfiniteScroll.hasMore && !itemsInfiniteScroll.isMaxReached && displayedItems.length > AD_INTERVAL && (
            <InFeedAd className="mt-4 max-w-7xl mx-auto" />
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

      {/* 頁面底部 Multiplex 廣告 */}
      <MultiplexAd />
    </>
  )
}
