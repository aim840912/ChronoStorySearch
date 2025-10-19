'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import type { FilterMode, AdvancedFilterOptions, SuggestionItem } from '@/types'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFavoriteMonsters } from '@/hooks/useFavoriteMonsters'
import { useFavoriteItems } from '@/hooks/useFavoriteItems'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { useModalManager } from '@/hooks/useModalManager'
import { useSearchWithSuggestions } from '@/hooks/useSearchWithSuggestions'
import { useDataManagement } from '@/hooks/useDataManagement'
import { useSearchLogic } from '@/hooks/useSearchLogic'
import { useFilterLogic } from '@/hooks/useFilterLogic'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useLazyItemAttributes } from '@/hooks/useLazyData'
import { SearchBar } from '@/components/SearchBar'
import { FilterButtons } from '@/components/FilterButtons'
import { AdvancedFilterPanel } from '@/components/AdvancedFilterPanel'
import { MonsterCard } from '@/components/MonsterCard'
import { ItemCard } from '@/components/ItemCard'
import { MonsterModal } from '@/components/MonsterModal'
import { ItemModal } from '@/components/ItemModal'
import { BugReportModal } from '@/components/BugReportModal'
import { ClearConfirmModal } from '@/components/ClearConfirmModal'
import { GachaMachineModal } from '@/components/GachaMachineModal'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Toast } from '@/components/Toast'
import { clientLogger } from '@/lib/logger'
import { getDefaultAdvancedFilter } from '@/lib/filter-utils'

export default function Home() {
  const searchParams = useSearchParams()
  const { t, language } = useLanguage()

  // 篩選模式：全部 or 最愛怪物 or 最愛物品
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  // 進階篩選狀態
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilterOptions>(getDefaultAdvancedFilter())
  const [isAdvancedFilterExpanded, setIsAdvancedFilterExpanded] = useState(false)

  // 追蹤首次掛載，避免初始載入時觸發滾動
  const isFirstMount = useRef(true)
  const isFirstSearchChange = useRef(true)

  // 計算已啟用的進階篩選數量
  const advancedFilterCount = [
    advancedFilter.dataType !== 'all' ? 1 : 0,
    advancedFilter.itemCategories.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  // 使用自定義 hooks
  const toast = useToast()
  const modals = useModalManager()
  const search = useSearchWithSuggestions()

  // Debounced 搜尋詞 - 延遲 500ms 以減少計算頻率
  const debouncedSearchTerm = useDebouncedValue(search.searchTerm, 500)

  // 資料管理 Hook - 處理資料載入和索引
  const {
    allDrops,
    gachaMachines,
    isLoading,
    initialRandomDrops,
    loadGachaMachines,
  } = useDataManagement()

  // 懶加載物品屬性資料 (用於進階篩選)
  const {
    itemAttributesMap,
    isLoading: _isLoadingItemAttributes,
    loadData: loadItemAttributes,
  } = useLazyItemAttributes()

  // 搜尋邏輯 Hook - 處理搜尋索引和建議
  const { suggestions } = useSearchLogic({
    allDrops,
    gachaMachines,
    debouncedSearchTerm,
  })

  // 最愛怪物管理
  const {
    favorites: favoriteMonsters,
    toggleFavorite,
    isFavorite,
    favoriteCount,
    clearAll: clearAllMonsters,
  } = useFavoriteMonsters()

  // 最愛物品管理
  const {
    favorites: favoriteItems,
    toggleFavorite: toggleItemFavorite,
    isFavorite: isItemFavorite,
    favoriteCount: favoriteItemCount,
    clearAll: clearAllItems,
  } = useFavoriteItems()

  // 篩選邏輯 Hook - 處理最愛和搜尋過濾
  const {
    filteredUniqueMonsters,
    filteredUniqueItems,
    uniqueAllMonsters,
    uniqueAllItems,
    mixedCards,
    shouldShowItems,
    shouldShowMonsters,
  } = useFilterLogic({
    filterMode,
    favoriteMonsters,
    favoriteItems,
    allDrops,
    initialRandomDrops,
    debouncedSearchTerm, // 延遲搜尋詞（已 debounce）
    advancedFilter,
    itemAttributesMap,
    gachaMachines,
  })

  // 無限滾動 - 在「全部」模式且（有搜尋 或 有進階篩選）時啟用
  // 使用 debouncedSearchTerm 確保資料已過濾後才啟用，避免載入未過濾的全部資料
  const shouldUseInfiniteScroll =
    filterMode === 'all' &&
    (debouncedSearchTerm.trim() !== '' || advancedFilter.enabled)

  const monstersInfiniteScroll = useInfiniteScroll({
    items: uniqueAllMonsters,
    enabled: shouldUseInfiniteScroll,
  })

  const itemsInfiniteScroll = useInfiniteScroll({
    items: uniqueAllItems,
    enabled: shouldUseInfiniteScroll,
  })

  // 決定要顯示的資料（使用無限滾動或完整資料）
  const displayedMonsters = shouldUseInfiniteScroll
    ? monstersInfiniteScroll.displayedItems
    : uniqueAllMonsters

  const displayedItems = shouldUseInfiniteScroll
    ? itemsInfiniteScroll.displayedItems
    : uniqueAllItems

  // 延遲載入轉蛋機 - 當使用者開始搜尋或選擇轉蛋物品篩選時才載入
  useEffect(() => {
    // 當有搜尋詞或進階篩選選擇了轉蛋物品時，載入轉蛋機資料
    const needsGachaData =
      debouncedSearchTerm.trim() !== '' ||
      (advancedFilter.enabled &&
       (advancedFilter.dataType === 'all' ||
        advancedFilter.dataType === 'item' ||
        advancedFilter.dataType === 'gacha')) ||
      modals.isGachaModalOpen  // 轉蛋 Modal 開啟時也載入資料

    if (needsGachaData) {
      loadGachaMachines()
    }
  }, [debouncedSearchTerm, advancedFilter.enabled, advancedFilter.dataType, loadGachaMachines, modals.isGachaModalOpen])

  // 延遲載入物品屬性 - 當使用者啟用進階篩選時才載入
  useEffect(() => {
    if (advancedFilter.enabled) {
      loadItemAttributes()
    }
  }, [advancedFilter.enabled, loadItemAttributes])

  // 處理 URL 參數 - 搜尋詞和自動開啟對應的 modal
  useEffect(() => {
    // 處理搜尋關鍵字參數
    const searchQuery = searchParams.get('q')
    if (searchQuery) {
      search.setSearchTerm(decodeURIComponent(searchQuery))
      clientLogger.info(`從 URL 參數載入搜尋詞: ${decodeURIComponent(searchQuery)}`)
    }

    if (allDrops.length === 0) return // 等待資料載入完成

    const monsterIdParam = searchParams.get('monster')
    const itemIdParam = searchParams.get('item')
    const gachaParam = searchParams.get('gacha')

    if (monsterIdParam) {
      const monsterId = parseInt(monsterIdParam, 10)
      if (!isNaN(monsterId)) {
        // 從 allDrops 中查找怪物名稱
        const monster = allDrops.find((drop) => drop.mobId === monsterId)
        if (monster) {
          // 使用顯示名稱（根據當前語言，有中文名稱且語言為中文時顯示中文，否則顯示英文）
          const displayName = (language === 'zh-TW' && monster.chineseMobName) ? monster.chineseMobName : monster.mobName
          modals.openMonsterModal(monsterId, displayName)
          clientLogger.info(`從 URL 參數開啟怪物 modal: ${displayName} (${monsterId})`)
        }
      }
    } else if (itemIdParam) {
      const itemId = parseInt(itemIdParam, 10)
      if (!isNaN(itemId) || itemIdParam === '0') {
        const parsedItemId = itemIdParam === '0' ? 0 : itemId
        // 從 allDrops 中查找物品名稱
        const item = allDrops.find((drop) => drop.itemId === parsedItemId)
        if (item) {
          // 使用顯示名稱（根據當前語言，有中文名稱且語言為中文時顯示中文，否則顯示英文）
          const displayName = (language === 'zh-TW' && item.chineseItemName) ? item.chineseItemName : item.itemName
          modals.openItemModal(parsedItemId, displayName)
          clientLogger.info(`從 URL 參數開啟物品 modal: ${displayName} (${parsedItemId})`)
        }
      }
    } else if (gachaParam && !modals.isGachaModalOpen) {
      if (gachaParam === 'list') {
        // 開啟轉蛋機列表
        modals.openGachaModal()
        clientLogger.info('從 URL 參數開啟轉蛋機列表 modal')
      } else {
        // 開啟特定轉蛋機
        const machineId = parseInt(gachaParam, 10)
        if (!isNaN(machineId) && machineId >= 1 && machineId <= 7) {
          modals.openGachaModal(machineId)
          clientLogger.info(`從 URL 參數開啟轉蛋機 modal: 機台 ${machineId}`)
        }
      }
    }
  // modals 和 search 的方法是穩定的 useCallback，不需要作為依賴
  // 將它們放入依賴會導致 modal 狀態改變時觸發 useEffect，造成無限循環
  }, [allDrops, searchParams, language]) // eslint-disable-line react-hooks/exhaustive-deps

  // 進階篩選變更時，滾動到頁面頂部以顯示結果
  useEffect(() => {
    // 跳過首次渲染
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }

    // 當進階篩選啟用時，平滑滾動到頁面頂部
    if (advancedFilter.enabled) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [advancedFilter])

  // 搜尋詞變更時，滾動到頁面頂部以顯示結果
  useEffect(() => {
    // 跳過首次變更（包括從 URL 載入搜尋詞）
    if (isFirstSearchChange.current) {
      isFirstSearchChange.current = false
      return
    }

    // 當有搜尋詞時，平滑滾動到頁面頂部
    // 使用即時搜尋詞，讓使用者一輸入就滾動，避免 debounce 延遲導致在底部先載入資料
    if (search.searchTerm.trim() !== '') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [search.searchTerm])

  // 選擇建議項目
  const selectSuggestion = (suggestionName: string, suggestion?: SuggestionItem) => {
    // 如果是轉蛋物品，開啟物品 Modal（而不是轉蛋機 Modal）
    if (suggestion && suggestion.type === 'gacha' && suggestion.id) {
      modals.openItemModal(suggestion.id, suggestionName)
    } else {
      search.selectSuggestion(suggestionName)
    }
  }

  // 清除最愛確認處理
  const handleClearConfirm = () => {
    if (modals.clearModalType === 'monsters') {
      clearAllMonsters()
    } else {
      clearAllItems()
    }
  }

  // 重置進階篩選
  const handleResetAdvancedFilter = () => {
    setAdvancedFilter(getDefaultAdvancedFilter())
  }

  // 分享處理函數
  const handleShare = async () => {
    if (!search.searchTerm.trim()) return

    try {
      const url = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(search.searchTerm)}`
      await navigator.clipboard.writeText(url)
      toast.showToast(t('share.success'), 'success')
      clientLogger.info(`分享連結已複製: ${url}`)
    } catch (error) {
      toast.showToast(t('share.error'), 'error')
      clientLogger.error('複製連結失敗', error)
    }
  }

  // 鍵盤導航處理 - 包裝 search.handleKeyDown 以處理轉蛋建議
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    search.handleKeyDown(e, suggestions, (suggestion) => {
      if (suggestion.type === 'gacha' && suggestion.machineId) {
        const machine = gachaMachines.find(m => m.machineId === suggestion.machineId)
        if (machine) {
          modals.openGachaModal()
        }
      }
    })
  }

  // MonsterModal 中點擊裝備：不關閉 MonsterModal，直接在上方打開 ItemModal
  const handleItemClickFromMonsterModal = (itemId: number, itemName: string) => {
    // 不調用 modals.closeMonsterModal()
    modals.openItemModal(itemId, itemName)
  }

  // ItemModal 中點擊怪物：關閉 ItemModal，打開 MonsterModal
  const handleMonsterClickFromItemModal = (mobId: number, mobName: string) => {
    modals.closeItemModal() // 關閉 ItemModal
    modals.openMonsterModal(mobId, mobName) // 打開 MonsterModal 並設定資料
  }

  // ItemModal 中點擊轉蛋機：不關閉 ItemModal，打開 GachaMachineModal 並選擇轉蛋機
  const handleGachaMachineClick = (machineId: number) => {
    modals.openGachaModal(machineId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 pb-12">
        {/* Sticky Header - 固定搜尋區域 */}
        <div className="sticky top-0 z-40 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 backdrop-blur-sm pt-12 pb-6 shadow-md">
          {/* 標題區域 */}
          <div className="relative text-center mb-8 pt-2">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              {t('app.title')}
            </h1>
            {/* 主題與語言切換按鈕 - 右上角 */}
            <div className="absolute top-0 right-4 flex gap-2">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>

          {/* 搜尋列 */}
          <SearchBar
            searchTerm={search.searchTerm}
            onSearchChange={search.setSearchTerm}
            suggestions={suggestions}
            showSuggestions={search.showSuggestions}
            onFocus={() => search.setShowSuggestions(true)}
            onSelectSuggestion={selectSuggestion}
            onKeyDown={handleKeyDown}
            focusedIndex={search.focusedIndex}
            onFocusedIndexChange={search.setFocusedIndex}
            searchContainerRef={search.searchContainerRef}
            onShare={handleShare}
          />

          {/* 篩選按鈕 */}
          <FilterButtons
            filterMode={filterMode}
            onFilterChange={setFilterMode}
            favoriteMonsterCount={favoriteCount}
            favoriteItemCount={favoriteItemCount}
            onClearClick={modals.openClearModal}
            isAdvancedFilterExpanded={isAdvancedFilterExpanded}
            onAdvancedFilterToggle={() => setIsAdvancedFilterExpanded(!isAdvancedFilterExpanded)}
            advancedFilterCount={advancedFilterCount}
            onResetAdvancedFilter={handleResetAdvancedFilter}
          />

          {/* 進階篩選面板 */}
          <AdvancedFilterPanel
            filter={advancedFilter}
            onFilterChange={setAdvancedFilter}
            isExpanded={isAdvancedFilterExpanded}
          />
        </div>
        {/* End Sticky Header */}

        {/* 載入中 */}
        {isLoading ? (
          <div className="text-center py-12 mt-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading')}</p>
          </div>
        ) : (
          <>
            {filterMode === 'favorite-monsters' ? (
              /* 最愛怪物模式 - 顯示怪物卡片 */
              filteredUniqueMonsters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
                  {filteredUniqueMonsters.map((monster) => (
                    <MonsterCard
                      key={monster.mobId}
                      mobId={monster.mobId}
                      mobName={monster.mobName}
                      chineseMobName={monster.chineseMobName}
                      dropCount={monster.dropCount}
                      onCardClick={modals.openMonsterModal}
                      isFavorite={true}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 mt-8">
                  {search.searchTerm ? (
                    <div className="text-6xl mb-4">🔍</div>
                  ) : (
                    <div className="mb-4 flex justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </div>
                  )}
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                    {search.searchTerm ? t('empty.searchNoMatch') : t('empty.noFavoriteMonsters')}
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">
                    {search.searchTerm
                      ? t('empty.tryOtherKeywords')
                      : t('empty.clickToFavoriteMonster')}
                  </p>
                </div>
              )
            ) : filterMode === 'favorite-items' ? (
              /* 最愛物品模式 - 顯示物品卡片 */
              filteredUniqueItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
                  {filteredUniqueItems.map((item) => (
                    <ItemCard
                      key={item.itemId}
                      itemId={item.itemId}
                      itemName={item.itemName}
                      chineseItemName={item.chineseItemName}
                      monsterCount={item.monsterCount}
                      onCardClick={modals.openItemModal}
                      isFavorite={true}
                      onToggleFavorite={toggleItemFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 mt-8">
                  {search.searchTerm ? (
                    <div className="text-6xl mb-4">🔍</div>
                  ) : (
                    <div className="mb-4 flex justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </div>
                  )}
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                    {search.searchTerm ? t('empty.searchNoMatch') : t('empty.noFavoriteItems')}
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">
                    {search.searchTerm
                      ? t('empty.tryOtherKeywords')
                      : t('empty.clickToFavoriteItem')}
                  </p>
                </div>
              )
            ) : (
              /* 全部模式 - 顯示怪物和物品卡片 */
              uniqueAllMonsters.length > 0 || uniqueAllItems.length > 0 ? (
                <>
                  {/* 無搜尋詞且無進階篩選：隨機混合顯示怪物和物品 */}
                  {!debouncedSearchTerm.trim() && !advancedFilter.enabled && mixedCards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
                      {mixedCards.map((card, index) => {
                        if (card.type === 'monster') {
                          return (
                            <MonsterCard
                              key={`monster-${card.data.mobId}-${index}`}
                              mobId={card.data.mobId}
                              mobName={card.data.mobName}
                              chineseMobName={card.data.chineseMobName}
                              dropCount={card.data.dropCount}
                              onCardClick={modals.openMonsterModal}
                              isFavorite={isFavorite(card.data.mobId)}
                              onToggleFavorite={toggleFavorite}
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
                              onCardClick={modals.openItemModal}
                              isFavorite={isItemFavorite(card.data.itemId)}
                              onToggleFavorite={toggleItemFavorite}
                              source={card.data.source}
                            />
                          )
                        }
                      })}
                    </div>
                  ) : (
                    /* 有搜尋詞：分區顯示怪物和物品 */
                    <>
                      {/* 怪物區塊 */}
                      {shouldShowMonsters && displayedMonsters.length > 0 && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
                            {displayedMonsters.map((monster) => (
                              <MonsterCard
                                key={monster.mobId}
                                mobId={monster.mobId}
                                mobName={monster.mobName}
                                chineseMobName={monster.chineseMobName}
                                dropCount={monster.dropCount}
                                onCardClick={modals.openMonsterModal}
                                isFavorite={isFavorite(monster.mobId)}
                                onToggleFavorite={toggleFavorite}
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
                        </>
                      )}

                      {/* 物品區塊 */}
                      {shouldShowItems && displayedItems.length > 0 && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
                            {displayedItems.map((item) => (
                              <ItemCard
                                key={item.itemId}
                                itemId={item.itemId}
                                itemName={item.itemName}
                                chineseItemName={item.chineseItemName}
                                monsterCount={item.monsterCount}
                                onCardClick={modals.openItemModal}
                                isFavorite={isItemFavorite(item.itemId)}
                                onToggleFavorite={toggleItemFavorite}
                                source={item.source}
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
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-12 mt-8">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                    {search.searchTerm ? t('empty.noResults') : t('empty.noData')}
                  </p>
                  {search.searchTerm && (
                    <p className="text-gray-500 dark:text-gray-500 text-sm">
                      {t('empty.tryOtherKeywords')}
                    </p>
                  )}
                </div>
              )
            )}
          </>
        )}

        {/* 底部資訊 */}
        <div className="mt-16 text-center">
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
      </div>

      {/* Monster Drops Modal */}
      <MonsterModal
        isOpen={modals.isMonsterModalOpen}
        onClose={modals.closeMonsterModal}
        monsterId={modals.selectedMonsterId}
        monsterName={modals.selectedMonsterName}
        allDrops={allDrops}
        isFavorite={modals.selectedMonsterId ? isFavorite(modals.selectedMonsterId) : false}
        onToggleFavorite={toggleFavorite}
        isItemFavorite={isItemFavorite}
        onToggleItemFavorite={toggleItemFavorite}
        onItemClick={handleItemClickFromMonsterModal}
      />

      {/* Item Drops Modal */}
      <ItemModal
        isOpen={modals.isItemModalOpen}
        onClose={modals.closeItemModal}
        itemId={modals.selectedItemId}
        itemName={modals.selectedItemName}
        allDrops={allDrops}
        gachaMachines={gachaMachines}
        isFavorite={modals.selectedItemId !== null ? isItemFavorite(modals.selectedItemId) : false}
        onToggleFavorite={toggleItemFavorite}
        isMonsterFavorite={isFavorite}
        onToggleMonsterFavorite={toggleFavorite}
        onMonsterClick={handleMonsterClickFromItemModal}
        onGachaMachineClick={handleGachaMachineClick}
      />

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={modals.isBugReportModalOpen}
        onClose={modals.closeBugReportModal}
      />

      {/* Confirm Clear Modal */}
      <ClearConfirmModal
        isOpen={modals.isClearModalOpen}
        onClose={modals.closeClearModal}
        onConfirm={handleClearConfirm}
        type={modals.clearModalType}
        count={modals.clearModalType === 'monsters' ? favoriteCount : favoriteItemCount}
      />

      {/* Gacha Machine Modal */}
      <GachaMachineModal
        isOpen={modals.isGachaModalOpen}
        onClose={modals.closeGachaModal}
        initialMachineId={modals.selectedGachaMachineId}
        onItemClick={(itemId, itemName) => {
          // 不關閉 GachaMachineModal，直接在上層打開 ItemModal
          modals.openItemModal(itemId, itemName)
        }}
      />

      {/* 浮動轉蛋機按鈕 */}
      <button
        onClick={() => modals.openGachaModal()}
        className="fixed bottom-6 left-6 z-40 p-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('gacha.button')}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
            />
          </svg>
          <span className="text-sm font-medium hidden group-hover:inline-block">{t('gacha.button')}</span>
        </div>
      </button>

      {/* 浮動 Bug 回報按鈕 */}
      <button
        onClick={modals.openBugReportModal}
        className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('bug.report')}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐛</span>
          <span className="text-sm font-medium hidden group-hover:inline-block">{t('bug.report')}</span>
        </div>
      </button>

      {/* Toast 通知 */}
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={toast.hideToast}
        type={toast.type}
      />
    </div>
  )
}
