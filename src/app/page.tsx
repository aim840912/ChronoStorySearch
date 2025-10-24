'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import type { FilterMode, AdvancedFilterOptions, SuggestionItem, SearchTypeFilter, ViewHistoryItem } from '@/types'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFavoriteMonsters } from '@/hooks/useFavoriteMonsters'
import { useFavoriteItems } from '@/hooks/useFavoriteItems'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { useModalManager } from '@/hooks/useModalManager'
import { useViewHistory } from '@/hooks/useViewHistory'
import { useSearchWithSuggestions } from '@/hooks/useSearchWithSuggestions'
import { useDataManagement } from '@/hooks/useDataManagement'
import { useSearchLogic } from '@/hooks/useSearchLogic'
import { useFilterLogic } from '@/hooks/useFilterLogic'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { SearchHeader } from '@/components/SearchHeader'
import { ContentDisplay } from '@/components/ContentDisplay'
import { ModalManager } from '@/components/ModalManager'
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

  // 遊戲指令 Modal 狀態
  const [isGameCommandsOpen, setIsGameCommandsOpen] = useState(false)

  // 計算已啟用的進階篩選數量
  const advancedFilterCount = [
    advancedFilter.itemCategories.length > 0 ? 1 : 0,
    advancedFilter.jobClasses.length > 0 ? 1 : 0,
    (advancedFilter.levelRange.min !== null || advancedFilter.levelRange.max !== null) ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  // 使用自定義 hooks
  const toast = useToast()
  const viewHistory = useViewHistory()
  const modals = useModalManager({ recordView: viewHistory.recordView })
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
  const selectSuggestion = useCallback((suggestionName: string, suggestion?: SuggestionItem) => {
    // 如果是轉蛋物品，開啟物品 Modal（而不是轉蛋機 Modal）
    if (suggestion && suggestion.type === 'gacha' && suggestion.id) {
      modals.openItemModal(suggestion.id, suggestionName)
    } else {
      search.selectSuggestion(suggestionName)
    }
  }, [modals, search])

  // 清除最愛確認處理
  const handleClearConfirm = useCallback(() => {
    if (modals.clearModalType === 'monsters') {
      clearAllMonsters()
    } else {
      clearAllItems()
    }
  }, [modals.clearModalType, clearAllMonsters, clearAllItems])

  // 重置進階篩選
  const handleResetAdvancedFilter = useCallback(() => {
    setAdvancedFilter(getDefaultAdvancedFilter())
  }, [])

  // 分享處理函數
  const handleShare = useCallback(async () => {
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
  }, [search.searchTerm, toast, t])

  // 鍵盤導航處理 - 包裝 search.handleKeyDown 以處理轉蛋建議
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    search.handleKeyDown(e, suggestions, (suggestion) => {
      if (suggestion.type === 'gacha' && suggestion.machineId) {
        const machine = gachaMachines.find(m => m.machineId === suggestion.machineId)
        if (machine) {
          modals.openGachaModal()
        }
      }
    })
  }, [search, suggestions, gachaMachines, modals])

  // MonsterModal 中點擊裝備：不關閉 MonsterModal，直接在上方打開 ItemModal（保存導航歷史）
  const handleItemClickFromMonsterModal = useCallback((itemId: number, itemName: string) => {
    // 不調用 modals.closeMonsterModal()
    modals.openItemModal(itemId, itemName, true) // saveHistory=true
  }, [modals])

  // ItemModal 中點擊怪物：打開 MonsterModal（保存導航歷史）
  const handleMonsterClickFromItemModal = useCallback((mobId: number, mobName: string) => {
    modals.openMonsterModal(mobId, mobName, true) // saveHistory=true，不再關閉 ItemModal
  }, [modals])

  // ItemModal 中點擊轉蛋機：打開 GachaMachineModal（保存導航歷史）
  const handleGachaMachineClick = useCallback((machineId: number) => {
    modals.openGachaModal(machineId, true) // saveHistory=true
  }, [modals])

  // GachaMachineModal 中點擊物品：打開 ItemModal（保存導航歷史）
  const handleItemClickFromGachaModal = useCallback((itemId: number, itemName: string) => {
    modals.openItemModal(itemId, itemName, true) // saveHistory=true
  }, [modals])

  // 處理瀏覽歷史項目點擊
  const handleViewHistoryItemClick = useCallback((item: ViewHistoryItem) => {
    if (item.type === 'monster') {
      modals.openMonsterModal(item.id, item.name)
      clientLogger.debug('從瀏覽歷史開啟怪物 Modal', { id: item.id, name: item.name })
    } else {
      modals.openItemModal(item.id, item.name)
      clientLogger.debug('從瀏覽歷史開啟物品 Modal', { id: item.id, name: item.name })
    }
  }, [modals])

  // 返回頂部
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 pb-8 sm:pb-12">
        {/* Sticky Header - 固定搜尋區域 */}
        <SearchHeader
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
          onAdvancedFilterChange={setAdvancedFilter}
          viewHistory={viewHistory.history}
          onViewHistoryItemClick={handleViewHistoryItemClick}
          onClearViewHistory={viewHistory.clearHistory}
        />

        {/* 內容顯示區域 */}
        <ContentDisplay
          isLoading={isLoading}
          filterMode={filterMode}
          hasSearchTerm={!!search.searchTerm}
          filteredUniqueMonsters={filteredUniqueMonsters}
          mobLevelMap={mobLevelMap}
          onMonsterCardClick={modals.openMonsterModal}
          onToggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
          filteredUniqueItems={filteredUniqueItems}
          itemAttributesMap={itemAttributesMap}
          onItemCardClick={modals.openItemModal}
          onToggleItemFavorite={toggleItemFavorite}
          isItemFavorite={isItemFavorite}
          mixedCards={mixedCards}
          displayedMonsters={displayedMonsters}
          displayedItems={displayedItems}
          shouldShowMonsters={shouldShowMonsters}
          shouldShowItems={shouldShowItems}
          monstersInfiniteScroll={monstersInfiniteScroll}
          itemsInfiniteScroll={itemsInfiniteScroll}
          hasSearchOrFilter={debouncedSearchTerm.trim() !== '' || advancedFilter.enabled}
          hasAnyData={uniqueAllMonsters.length > 0 || uniqueAllItems.length > 0}
        />
      </div>

      {/* Modal 和浮動按鈕管理器 */}
      <ModalManager
        isMonsterModalOpen={modals.isMonsterModalOpen}
        isItemModalOpen={modals.isItemModalOpen}
        isBugReportModalOpen={modals.isBugReportModalOpen}
        isClearModalOpen={modals.isClearModalOpen}
        isGachaModalOpen={modals.isGachaModalOpen}
        isMerchantShopModalOpen={modals.isMerchantShopModalOpen}
        isAccuracyCalculatorOpen={modals.isAccuracyCalculatorOpen}
        selectedMonsterId={modals.selectedMonsterId ?? undefined}
        selectedMonsterName={modals.selectedMonsterName}
        selectedItemId={modals.selectedItemId}
        selectedItemName={modals.selectedItemName}
        selectedGachaMachineId={modals.selectedGachaMachineId ?? null}
        clearModalType={modals.clearModalType}
        accuracyInitialMonsterId={modals.accuracyInitialMonsterId}
        hasPreviousModal={modals.hasPreviousModal}
        closeMonsterModal={modals.closeMonsterModal}
        closeItemModal={modals.closeItemModal}
        closeBugReportModal={modals.closeBugReportModal}
        closeClearModal={modals.closeClearModal}
        closeGachaModal={modals.closeGachaModal}
        closeMerchantShopModal={modals.closeMerchantShopModal}
        closeAccuracyCalculator={modals.closeAccuracyCalculator}
        goBack={modals.goBack}
        openGachaModal={modals.openGachaModal}
        openBugReportModal={modals.openBugReportModal}
        openMerchantShopModal={modals.openMerchantShopModal}
        openAccuracyCalculator={modals.openAccuracyCalculator}
        allDrops={allDrops}
        gachaMachines={gachaMachines}
        itemAttributesMap={itemAttributesMap}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
        isItemFavorite={isItemFavorite}
        toggleItemFavorite={toggleItemFavorite}
        favoriteMonsterCount={favoriteCount}
        favoriteItemCount={favoriteItemCount}
        handleItemClickFromMonsterModal={handleItemClickFromMonsterModal}
        handleMonsterClickFromItemModal={handleMonsterClickFromItemModal}
        handleGachaMachineClick={handleGachaMachineClick}
        handleItemClickFromGachaModal={handleItemClickFromGachaModal}
        handleClearConfirm={handleClearConfirm}
        isAccuracyCalcOpen={isAccuracyCalcOpen}
        setIsAccuracyCalcOpen={setIsAccuracyCalcOpen}
        isGameCommandsOpen={isGameCommandsOpen}
        setIsGameCommandsOpen={setIsGameCommandsOpen}
        showBackToTop={showBackToTop}
        scrollToTop={scrollToTop}
        toastMessage={toast.message}
        toastIsVisible={toast.isVisible}
        toastType={toast.type}
        hideToast={toast.hideToast}
      />
    </div>
  )
}
