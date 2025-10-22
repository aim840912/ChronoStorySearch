'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import type { FilterMode, AdvancedFilterOptions, SuggestionItem, SearchTypeFilter } from '@/types'
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
import { SearchBar } from '@/components/SearchBar'
import { FilterButtons } from '@/components/FilterButtons'
import { AdvancedFilterPanel } from '@/components/AdvancedFilterPanel'
import { MonsterModal } from '@/components/MonsterModal'
import { ItemModal } from '@/components/ItemModal'
import { BugReportModal } from '@/components/BugReportModal'
import { ClearConfirmModal } from '@/components/ClearConfirmModal'
import { GachaMachineModal } from '@/components/GachaMachineModal'
import { AccuracyCalculatorModal } from '@/components/AccuracyCalculatorModal'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Toast } from '@/components/Toast'
import { FavoriteMonstersList } from '@/components/lists/FavoriteMonstersList'
import { FavoriteItemsList } from '@/components/lists/FavoriteItemsList'
import { AllItemsView } from '@/components/lists/AllItemsView'
import { clientLogger } from '@/lib/logger'
import { getDefaultAdvancedFilter } from '@/lib/filter-utils'

export default function Home() {
  const searchParams = useSearchParams()
  const { t, language } = useLanguage()

  // 篩選模式：全部 or 最愛怪物 or 最愛物品
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  // 搜尋類型篩選：全部 or 怪物 or 物品
  const [searchType, setSearchType] = useState<SearchTypeFilter>('all')

  // 進階篩選狀態
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilterOptions>(getDefaultAdvancedFilter())
  const [isAdvancedFilterExpanded, setIsAdvancedFilterExpanded] = useState(false)

  // 追蹤首次掛載，避免初始載入時觸發滾動
  const isFirstMount = useRef(true)
  const isFirstSearchChange = useRef(true)

  // 追蹤是否顯示「返回頂部」按鈕
  const [showBackToTop, setShowBackToTop] = useState(false)

  // 命中率計算器 Modal 狀態
  const [isAccuracyCalcOpen, setIsAccuracyCalcOpen] = useState(false)

  // 計算已啟用的進階篩選數量
  const advancedFilterCount = [
    advancedFilter.itemCategories.length > 0 ? 1 : 0,
    advancedFilter.jobClasses.length > 0 ? 1 : 0,
    (advancedFilter.levelRange.min !== null || advancedFilter.levelRange.max !== null) ? 1 : 0,
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
    initialRandomGachaItems,
    mobLevelMap,
    itemAttributesMap,
    loadGachaMachines,
  } = useDataManagement()

  // 搜尋邏輯 Hook - 處理搜尋索引和建議
  const { suggestions } = useSearchLogic({
    allDrops,
    gachaMachines,
    debouncedSearchTerm,
    searchType,
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
    searchType,
    advancedFilter,
    itemAttributesMap,
    mobLevelMap,
    gachaMachines,
    initialRandomGachaItems,
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

  // 延遲載入轉蛋機 - 當使用者開始搜尋或選擇轉蛋物品類型時才載入
  useEffect(() => {
    // 當有搜尋詞、選擇了轉蛋/物品類型、或轉蛋 Modal 開啟時，載入轉蛋機資料
    const needsGachaData =
      debouncedSearchTerm.trim() !== '' ||
      searchType === 'gacha' ||
      searchType === 'item' ||
      modals.isGachaModalOpen ||
      (advancedFilter.enabled && advancedFilter.itemCategories.length > 0)

    if (needsGachaData) {
      loadGachaMachines()
    }
  }, [debouncedSearchTerm, searchType, advancedFilter.enabled, advancedFilter.itemCategories, loadGachaMachines, modals.isGachaModalOpen])

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

  // 監聽滾動事件，顯示/隱藏「返回頂部」按鈕
  useEffect(() => {
    const handleScroll = () => {
      // 當使用者滾動超過 300px 時顯示按鈕
      setShowBackToTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  // MonsterModal 中點擊裝備：不關閉 MonsterModal，直接在上方打開 ItemModal（保存導航歷史）
  const handleItemClickFromMonsterModal = (itemId: number, itemName: string) => {
    // 不調用 modals.closeMonsterModal()
    modals.openItemModal(itemId, itemName, true) // saveHistory=true
  }

  // ItemModal 中點擊怪物：打開 MonsterModal（保存導航歷史）
  const handleMonsterClickFromItemModal = (mobId: number, mobName: string) => {
    modals.openMonsterModal(mobId, mobName, true) // saveHistory=true，不再關閉 ItemModal
  }

  // ItemModal 中點擊轉蛋機：打開 GachaMachineModal（保存導航歷史）
  const handleGachaMachineClick = (machineId: number) => {
    modals.openGachaModal(machineId, true) // saveHistory=true
  }

  // GachaMachineModal 中點擊物品：打開 ItemModal（保存導航歷史）
  const handleItemClickFromGachaModal = (itemId: number, itemName: string) => {
    modals.openItemModal(itemId, itemName, true) // saveHistory=true
  }

  // 返回頂部
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 pb-8 sm:pb-12">
        {/* Sticky Header - 固定搜尋區域 */}
        <div className="sticky top-0 z-40 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 backdrop-blur-sm pt-8 sm:pt-12 pb-4 sm:pb-6 shadow-md">
          {/* 標題區域 */}
          <div className="relative text-center mb-6 sm:mb-8 pt-2 pr-20 sm:pr-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              {t('app.title')}
            </h1>
            {/* 主題與語言切換按鈕 - 右上角 */}
            <div className="absolute top-0 right-2 sm:right-4 flex gap-1.5 sm:gap-2">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>

          {/* 搜尋列 */}
          <SearchBar
            searchTerm={search.searchTerm}
            onSearchChange={search.setSearchTerm}
            searchType={searchType}
            onSearchTypeChange={setSearchType}
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
            advancedFilter={advancedFilter}
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
              /* 最愛怪物模式 */
              <FavoriteMonstersList
                monsters={filteredUniqueMonsters}
                hasSearchTerm={!!search.searchTerm}
                mobLevelMap={mobLevelMap}
                onCardClick={modals.openMonsterModal}
                onToggleFavorite={toggleFavorite}
                t={t}
              />
            ) : filterMode === 'favorite-items' ? (
              /* 最愛物品模式 */
              <FavoriteItemsList
                items={filteredUniqueItems}
                hasSearchTerm={!!search.searchTerm}
                itemAttributesMap={itemAttributesMap}
                onCardClick={modals.openItemModal}
                onToggleFavorite={toggleItemFavorite}
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
                hasSearchOrFilter={debouncedSearchTerm.trim() !== '' || advancedFilter.enabled}
                hasAnyData={uniqueAllMonsters.length > 0 || uniqueAllItems.length > 0}
                hasSearchTerm={!!search.searchTerm}
                mobLevelMap={mobLevelMap}
                itemAttributesMap={itemAttributesMap}
                onMonsterCardClick={modals.openMonsterModal}
                onItemCardClick={modals.openItemModal}
                isFavorite={isFavorite}
                isItemFavorite={isItemFavorite}
                onToggleFavorite={toggleFavorite}
                onToggleItemFavorite={toggleItemFavorite}
                t={t}
              />
            )}
          </>
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
      </div>

      {/* Monster Drops Modal */}
      <MonsterModal
        isOpen={modals.isMonsterModalOpen}
        onClose={modals.closeMonsterModal}
        monsterId={modals.selectedMonsterId}
        monsterName={modals.selectedMonsterName}
        allDrops={allDrops}
        itemAttributesMap={itemAttributesMap}
        isFavorite={modals.selectedMonsterId ? isFavorite(modals.selectedMonsterId) : false}
        onToggleFavorite={toggleFavorite}
        isItemFavorite={isItemFavorite}
        onToggleItemFavorite={toggleItemFavorite}
        onItemClick={handleItemClickFromMonsterModal}
        hasPreviousModal={modals.hasPreviousModal}
        onGoBack={modals.goBack}
      />

      {/* Item Drops Modal */}
      <ItemModal
        isOpen={modals.isItemModalOpen}
        onClose={modals.closeItemModal}
        itemId={modals.selectedItemId}
        itemName={modals.selectedItemName}
        allDrops={allDrops}
        gachaMachines={gachaMachines}
        itemAttributesMap={itemAttributesMap}
        isFavorite={modals.selectedItemId !== null ? isItemFavorite(modals.selectedItemId) : false}
        onToggleFavorite={toggleItemFavorite}
        isMonsterFavorite={isFavorite}
        onToggleMonsterFavorite={toggleFavorite}
        onMonsterClick={handleMonsterClickFromItemModal}
        onGachaMachineClick={handleGachaMachineClick}
        hasPreviousModal={modals.hasPreviousModal}
        onGoBack={modals.goBack}
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
        onItemClick={handleItemClickFromGachaModal}
        hasPreviousModal={modals.hasPreviousModal}
        onGoBack={modals.goBack}
      />

      {/* Accuracy Calculator Modal */}
      <AccuracyCalculatorModal
        isOpen={isAccuracyCalcOpen}
        onClose={() => setIsAccuracyCalcOpen(false)}
      />

      {/* 浮動轉蛋機按鈕 */}
      <button
        onClick={() => modals.openGachaModal()}
        className="fixed bottom-4 sm:bottom-6 left-4 sm:left-6 z-40 p-3 sm:p-4 bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('gacha.button')}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
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
          <span className="text-sm font-medium hidden group-hover:inline-block lg:inline-block">{t('gacha.button')}</span>
        </div>
      </button>

      {/* 浮動命中率計算器按鈕 */}
      <button
        onClick={() => setIsAccuracyCalcOpen(true)}
        className="fixed bottom-20 sm:bottom-24 left-4 sm:left-6 z-40 p-3 sm:p-4 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label="命中率計算器"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <circle cx="12" cy="12" r="6" strokeWidth="2"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
          </svg>
          <span className="text-sm font-medium hidden group-hover:inline-block lg:inline-block">命中率</span>
        </div>
      </button>

      {/* 浮動 Bug 回報按鈕 */}
      <button
        onClick={modals.openBugReportModal}
        className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 p-3 sm:p-4 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('bug.report')}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐛</span>
          <span className="text-sm font-medium hidden group-hover:inline-block">{t('bug.report')}</span>
        </div>
      </button>

      {/* 返回頂部按鈕 */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-40 p-3 sm:p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
          aria-label={t('scroll.backToTop')}
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}

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
