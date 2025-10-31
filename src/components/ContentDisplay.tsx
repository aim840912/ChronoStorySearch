'use client'

import { memo } from 'react'
import type { FilterMode, ItemAttributesEssential, ViewHistoryItem, DropsEssential, ListingWithUserInfo, Pagination } from '@/types'
import { FavoriteMonstersList } from '@/components/lists/FavoriteMonstersList'
import { FavoriteItemsList } from '@/components/lists/FavoriteItemsList'
import { AllItemsView } from '@/components/lists/AllItemsView'
import { MarketListView } from '@/components/trade/MarketListView'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSystemStatus } from '@/hooks/useSystemStatus'

// 類型定義（與內部元件一致）
import type { ExtendedUniqueItem } from '@/types'
import type { RefObject } from 'react'

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

  // 最愛物品模式
  filteredUniqueItems: Array<{
    itemId: number
    itemName: string
    chineseItemName?: string | null
    monsterCount: number
  }>
  itemAttributesMap: Map<number, ItemAttributesEssential>
  onItemCardClick: (itemId: number, itemName: string) => void
  onToggleItemFavorite: (itemId: number, itemName: string) => void
  isItemFavorite: (itemId: number) => boolean

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

  // 市場刊登模式
  marketListings: ListingWithUserInfo[]
  marketPagination: Pagination | null
  isMarketLoading: boolean
  marketError: string | null
  isMarketRefreshing?: boolean
  marketRefreshError?: string | null
  userQuota?: { active: number; max: number } | null
  onListingClick: (listingId: string) => void
  onMarketPageChange: (page: number) => void
  onMarketRefresh?: () => void
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
  filteredUniqueItems,
  itemAttributesMap,
  onItemCardClick,
  onToggleItemFavorite,
  isItemFavorite,
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
  marketListings,
  marketPagination,
  isMarketLoading,
  marketError,
  isMarketRefreshing,
  marketRefreshError,
  userQuota,
  onListingClick,
  onMarketPageChange,
  onMarketRefresh,
}: ContentDisplayProps) {
  const { t } = useLanguage()
  const { tradingEnabled } = useSystemStatus()

  // 載入中
  if (isLoading) {
    return (
      <div className="text-center py-12 mt-8">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading')}</p>
      </div>
    )
  }

  return (
    <>
      {filterMode === 'market-listings' ? (
        /* 市場刊登模式 */
        tradingEnabled ? (
          <div className="mt-8">
            <MarketListView
              listings={marketListings}
              pagination={marketPagination}
              isLoading={isMarketLoading}
              error={marketError}
              isRefreshing={isMarketRefreshing}
              refreshError={marketRefreshError}
              userQuota={userQuota}
              onListingClick={onListingClick}
              onPageChange={onMarketPageChange}
              onRefresh={onMarketRefresh}
            />
          </div>
        ) : (
          /* 交易系統已關閉提示 */
          <div className="mt-8 text-center py-12">
            <div className="max-w-md mx-auto">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('market.systemDisabled')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('market.systemDisabledMessage')}
              </p>
            </div>
          </div>
        )
      ) : filterMode === 'favorite-monsters' ? (
        /* 最愛怪物模式 */
        <FavoriteMonstersList
          monsters={filteredUniqueMonsters}
          hasSearchTerm={hasSearchTerm}
          mobLevelMap={mobLevelMap}
          onCardClick={onMonsterCardClick}
          onToggleFavorite={onToggleFavorite}
          t={t}
        />
      ) : filterMode === 'favorite-items' ? (
        /* 最愛物品模式 */
        <FavoriteItemsList
          items={filteredUniqueItems}
          hasSearchTerm={hasSearchTerm}
          itemAttributesMap={itemAttributesMap}
          onCardClick={onItemCardClick}
          onToggleFavorite={onToggleItemFavorite}
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
          onMonsterCardClick={onMonsterCardClick}
          onItemCardClick={onItemCardClick}
          isFavorite={isFavorite}
          isItemFavorite={isItemFavorite}
          onToggleFavorite={onToggleFavorite}
          onToggleItemFavorite={onToggleItemFavorite}
          viewHistory={viewHistory}
          allDrops={allDrops}
          t={t}
        />
      )}

      {/* 底部資訊 */}
      <div className="mt-12 sm:mt-16 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          <a
            href="https://docs.google.com/spreadsheets/d/e/2PACX-1vRpKuZGJQIFFxSi6kzYx4ALI0MQborpLEkh3J1qIGSd0Bw7U4NYg5CK-3ESzyK580z4D8NO59SUeC3k/pubhtml?gid=1888753114&single=true"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
          >
            {t('footer.dataSource')}
          </a>
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
          {t('footer.note')}
        </p>
      </div>
    </>
  )
})
