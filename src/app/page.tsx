'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { FilterMode, AdvancedFilterOptions, SuggestionItem, SearchTypeFilter } from '@/types'
// TradeType 已移至 usePageModes hook 中管理
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFavorites } from '@/hooks/useFavorites'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { useModalManager } from '@/hooks/useModalManager'
import { useViewHistory } from '@/hooks/useViewHistory'
import { useSearchWithSuggestions } from '@/hooks/useSearchWithSuggestions'
import { useDataManagement } from '@/hooks/useDataManagement'
import { useSearchLogic } from '@/hooks/useSearchLogic'
import { useFilterLogic } from '@/hooks/useFilterLogic'
import { useItemsData } from '@/hooks/useItemsData'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useScrollBehavior } from '@/hooks/useScrollBehavior'
import { useHashNavigation } from '@/hooks/useHashNavigation'
import { usePageModes } from '@/hooks/usePageModes'
import { useToolModals } from '@/hooks/useToolModals'
import { SearchHeader } from '@/components/SearchHeader'
import { ContentDisplay } from '@/components/ContentDisplay'
import { ModalManager } from '@/components/ModalManager'
import { GachaDrawSection } from '@/components/gacha/GachaDrawSection'
import { MerchantShopSection } from '@/components/merchant/MerchantShopSection'
import { TradeSection } from '@/components/trade/TradeSection'
import { ReportSection } from '@/components/report/ReportSection'
import { AdSenseMultiplex } from '@/components/adsense/AdSenseMultiplex'
import { clientLogger } from '@/lib/logger'
import { getDefaultAdvancedFilter } from '@/lib/filter-utils'
import { trackEvent } from '@/lib/analytics/ga4'
import { GA4_EVENTS } from '@/lib/analytics/events'

export default function Home() {
  const { t, language } = useLanguage()

  // ===== 核心篩選狀態 =====
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [searchType, setSearchType] = useState<SearchTypeFilter>('all')
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilterOptions>(getDefaultAdvancedFilter())
  const [isAdvancedFilterExpanded, setIsAdvancedFilterExpanded] = useState(false)

  // ===== 整合的 Hooks =====
  // 頁面模式管理（轉蛋/商人/交易模式 - 互斥）
  const pageModes = usePageModes()

  // 工具 Modal 管理（設定/關於/遊戲指令等）
  const toolModals = useToolModals()

  // 追蹤首次掛載，避免初始載入時觸發滾動
  const isFirstMount = useRef(true)
  const isFirstSearchChange = useRef(true)


  // 計算已啟用的進階篩選數量
  const advancedFilterCount = [
    advancedFilter.itemCategories.length > 0 ? 1 : 0,
    advancedFilter.jobClasses.length > 0 ? 1 : 0,
    advancedFilter.elementWeaknesses.length > 0 ? 1 : 0,
    advancedFilter.isBoss ? 1 : 0,
    advancedFilter.healable ? 1 : 0,
    advancedFilter.poisonable ? 1 : 0,
    advancedFilter.burnable ? 1 : 0,
    advancedFilter.freezable ? 1 : 0,
    (advancedFilter.levelRange.min !== null || advancedFilter.levelRange.max !== null) ? 1 : 0,
    (advancedFilter.attackSpeedRange.min !== null || advancedFilter.attackSpeedRange.max !== null) ? 1 : 0,
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
    merchantMaps,
    merchantItemIndex,
    quizQuestions,
    isLoading,
    initialRandomDrops,
    initialRandomGachaItems,
    mobLevelMap,
    mobInGameMap,
    mobInfoMap,
    itemAttributesMap,
    itemIndexMap,
    loadGachaMachines,
  } = useDataManagement()

  // 物品資料 Hook - 提供物品搜尋功能（用於 TradeSection）
  const { searchItems } = useItemsData({
    allDrops,
    gachaMachines,
  })

  // 搜尋邏輯 Hook - 處理搜尋索引和建議
  const { suggestions } = useSearchLogic({
    allDrops,
    gachaMachines,
    merchantMaps,
    quizQuestions,
    itemIndexMap,
    debouncedSearchTerm,
    searchType,
  })

  // 收藏管理（怪物 + 物品）
  const favorites = useFavorites()

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
    favoriteMonsters: favorites.monsters.list,
    favoriteItems: favorites.items.list,
    allDrops,
    initialRandomDrops,
    debouncedSearchTerm, // 延遲搜尋詞（已 debounce）
    searchType,
    advancedFilter,
    itemAttributesMap,
    mobLevelMap,
    mobInfoMap,
    gachaMachines,
    itemIndexMap,
    initialRandomGachaItems,
  })


  // 滾動行為 Hook - 管理返回頂部按鈕
  const { showBackToTop, scrollToTop } = useScrollBehavior()

  // Hash 導航 Hook - 處理 URL hash 連結
  useHashNavigation({
    allDrops,
    language,
    openMonsterModal: modals.openMonsterModal,
    openItemModal: modals.openItemModal,
    openGachaModal: modals.openGachaModal,
    searchTerm: search.searchTerm,
    showToast: toast.showToast,
    t,
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
    // 檢查瀏覽歷史中是否有物品記錄（需要轉蛋資料來顯示「只有轉蛋」的物品）
    const hasItemInHistory = viewHistory.history.some(item => item.type === 'item')

    // 當有搜尋詞、選擇了轉蛋/物品類型、轉蛋 Modal 開啟、收藏物品模式、瀏覽歷史有物品、或等級過濾時，載入轉蛋機資料
    const needsGachaData =
      debouncedSearchTerm.trim() !== '' ||
      searchType === 'gacha' ||
      searchType === 'item' ||
      modals.isGachaModalOpen ||
      filterMode === 'favorite-items' ||
      hasItemInHistory ||
      (advancedFilter.enabled && advancedFilter.itemCategories.length > 0) ||
      (advancedFilter.enabled && (advancedFilter.levelRange.min !== null || advancedFilter.levelRange.max !== null))

    if (needsGachaData) {
      loadGachaMachines()
    }
  }, [debouncedSearchTerm, searchType, advancedFilter.enabled, advancedFilter.itemCategories, advancedFilter.levelRange, loadGachaMachines, modals.isGachaModalOpen, filterMode, viewHistory.history])

  // 監聽瀏覽器返回鍵（popstate 事件）
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { modal?: string; id?: number; name?: string } | null

      if (state?.modal === 'monster' && state.id && state.name) {
        modals.openMonsterModal(state.id, state.name)
        clientLogger.debug('從返回鍵開啟怪物 Modal', { id: state.id, name: state.name })
      } else if (state?.modal === 'item' && typeof state.id === 'number' && state.name) {
        modals.openItemModal(state.id, state.name)
        clientLogger.debug('從返回鍵開啟物品 Modal', { id: state.id, name: state.name })
      } else if (state?.modal === 'gacha') {
        modals.openGachaModal(state.id)
        clientLogger.debug('從返回鍵開啟轉蛋機 Modal', { id: state.id })
      } else {
        // state 為 null 或不是 modal，關閉所有 modal
        if (modals.isMonsterModalOpen) {
          modals.setIsMonsterModalOpen(false)
        }
        if (modals.isItemModalOpen) {
          modals.setIsItemModalOpen(false)
        }
        if (modals.isGachaModalOpen) {
          modals.closeGachaModal()
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [modals])

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
  const selectSuggestion = useCallback((suggestionName: string, suggestion?: SuggestionItem) => {
    // GA4 事件追蹤：選擇搜尋建議
    if (suggestion) {
      trackEvent(GA4_EVENTS.SELECT_ITEM, {
        item_id: suggestion.id?.toString() || suggestionName,
        item_name: suggestionName,
        item_category: suggestion.type
      })
    }

    // 如果是轉蛋物品，開啟物品 Modal（而不是轉蛋機 Modal）
    if (suggestion && suggestion.type === 'gacha' && suggestion.id) {
      modals.openItemModal(suggestion.id, suggestionName)
    } else if (suggestion && suggestion.type === 'merchant' && suggestion.mapId) {
      // 如果是商人物品，開啟商人 Modal 並自動展開對應地圖
      modals.openMerchantShopModal(suggestion.mapId)
    } else {
      search.selectSuggestion(suggestionName)
    }
  }, [modals, search])

  // 清除最愛確認處理
  const handleClearConfirm = useCallback(() => {
    if (modals.clearModalType === 'monsters') {
      favorites.monsters.clearAll()
    } else {
      favorites.items.clearAll()
    }
  }, [modals.clearModalType, favorites.monsters, favorites.items])

  // 重置進階篩選
  const handleResetAdvancedFilter = useCallback(() => {
    setAdvancedFilter(getDefaultAdvancedFilter())
    // 關閉進階篩選面板
    setIsAdvancedFilterExpanded(false)
    // 滾動到頂部以顯示瀏覽紀錄
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // 轉蛋模式處理函數（包裝 usePageModes，加載轉蛋機資料）
  const handleGachaSelect = useCallback((machineId: number | null) => {
    pageModes.selectGacha(machineId)
    loadGachaMachines()
  }, [pageModes, loadGachaMachines])

  // 處理 filterMode 變更（同時關閉轉蛋/商人/交易模式）
  const handleFilterModeChange = useCallback((mode: FilterMode) => {
    setFilterMode(mode)
    // 點擊 FilterTabs 時自動退出所有特殊模式
    pageModes.closeAllModes()
  }, [pageModes])


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

  // ItemModal 中點擊轉蛋機：進入轉蛋模式並選擇對應轉蛋機
  const handleGachaMachineClick = useCallback((machineId: number) => {
    // 關閉 ItemModal 並進入轉蛋模式
    modals.closeItemModal()
    handleGachaSelect(machineId)
  }, [modals, handleGachaSelect])


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 pb-20 sm:pb-24">
        {/* Sticky Header - 固定搜尋區域 */}
        <SearchHeader
          searchTerm={search.searchTerm}
          onSearchChange={search.setSearchTerm}
          searchType={searchType}
          onSearchTypeChange={setSearchType}
          suggestions={suggestions.slice(0, 10)}
          showSuggestions={search.showSuggestions}
          onFocus={() => search.setShowSuggestions(true)}
          onSelectSuggestion={selectSuggestion}
          onKeyDown={handleKeyDown}
          focusedIndex={search.focusedIndex}
          onFocusedIndexChange={search.setFocusedIndex}
          searchContainerRef={search.searchContainerRef}
          filterMode={filterMode}
          onFilterChange={handleFilterModeChange}
          favoriteMonsterCount={favorites.monsters.count}
          favoriteItemCount={favorites.items.count}
          isAdvancedFilterExpanded={isAdvancedFilterExpanded}
          onAdvancedFilterToggle={() => setIsAdvancedFilterExpanded(!isAdvancedFilterExpanded)}
          advancedFilterCount={advancedFilterCount}
          onResetAdvancedFilter={handleResetAdvancedFilter}
          advancedFilter={advancedFilter}
          onAdvancedFilterChange={setAdvancedFilter}
          isGachaMode={pageModes.isGachaMode}
          selectedGachaMachineId={pageModes.selectedGachaMachineId}
          onGachaSelect={handleGachaSelect}
          onGachaClose={pageModes.closeGacha}
          isMerchantMode={pageModes.isMerchantMode}
          selectedMerchantMapId={pageModes.selectedMerchantMapId}
          onMerchantSelect={pageModes.selectMerchant}
          onMerchantClose={pageModes.closeMerchant}
          // 交易市場模式
          isTradeMode={pageModes.isTradeMode}
          onTradeModeToggle={pageModes.toggleTradeMode}
          tradeTypeFilter={pageModes.tradeTypeFilter}
          onTradeTypeFilterChange={pageModes.setTradeTypeFilter}
          tradeSearchQuery={pageModes.tradeSearchQuery}
          onTradeSearchQueryChange={pageModes.setTradeSearchQuery}
          tradeStatsFilter={pageModes.tradeStatsFilter}
          onTradeStatsFilterChange={pageModes.setTradeStatsFilter}
          onTradeStatsFilterReset={pageModes.resetTradeStatsFilter}
          searchItems={searchItems}
          // Toolbar callbacks
          onExpTrackerClick={modals.openExpTrackerModal}
          onScreenRecorderClick={modals.openScreenRecorderModal}
          onManualExpRecorderClick={modals.openManualExpRecorderModal}
          onAccuracyCalculatorClick={() => modals.openAccuracyCalculator()}
          onGameCommandsClick={toolModals.openGameCommands}
          onPrivacySettingsClick={toolModals.openPrivacyModal}
          onBugReportClick={modals.openBugReportModal}
          onAboutClick={toolModals.openAboutModal}
          onApiTesterClick={toolModals.openApiTester}
          onGlobalSettingsClick={toolModals.openGlobalSettings}
          onMerchantShopClick={() => modals.openMerchantShopModal()}
          // 檢舉模式
          isReportMode={pageModes.isReportMode}
          onReportModeToggle={pageModes.toggleReportMode}
        />

        {/* 檢舉系統區域 - 檢舉模式時顯示 */}
        {pageModes.isReportMode && (
          <div className="mt-4">
            <ReportSection />
          </div>
        )}

        {/* 交易市場區域 - 交易模式時顯示 */}
        {pageModes.isTradeMode && (
          <TradeSection
            searchItems={searchItems}
            typeFilter={pageModes.tradeTypeFilter}
            searchQuery={pageModes.tradeSearchQuery}
            statsFilter={pageModes.tradeStatsFilter}
            itemAttributesMap={itemAttributesMap}
            onRecordView={viewHistory.recordView}
          />
        )}

        {/* 轉蛋抽獎區域 - 選擇轉蛋機後顯示（交易/檢舉模式時隱藏） */}
        {!pageModes.isTradeMode && !pageModes.isReportMode && pageModes.isGachaMode && pageModes.selectedGachaMachineId !== null && (
          <GachaDrawSection
            machineId={pageModes.selectedGachaMachineId}
            gachaMachines={gachaMachines}
            onClose={pageModes.closeGacha}
            onItemClick={modals.openItemModal}
          />
        )}

        {/* 商人商店區域 - 選擇商人地圖後顯示（交易/檢舉模式時隱藏） */}
        {!pageModes.isTradeMode && !pageModes.isReportMode && pageModes.isMerchantMode && (
          <MerchantShopSection
            mapId={pageModes.selectedMerchantMapId}
            onClose={pageModes.closeMerchant}
          />
        )}

        {/* 內容顯示區域 - 轉蛋模式、商人模式、交易模式或檢舉模式時隱藏 */}
        {!pageModes.isTradeMode && !pageModes.isReportMode && !(pageModes.isGachaMode && pageModes.selectedGachaMachineId !== null) && !pageModes.isMerchantMode && (
          <ContentDisplay
          isLoading={isLoading}
          filterMode={filterMode}
          hasSearchTerm={!!search.searchTerm}
          filteredUniqueMonsters={filteredUniqueMonsters}
          mobLevelMap={mobLevelMap}
          mobInGameMap={mobInGameMap}
          onMonsterCardClick={modals.openMonsterModal}
          onToggleFavorite={favorites.monsters.toggle}
          isFavorite={favorites.monsters.isFavorite}
          onClearMonsters={() => modals.openClearModal('monsters')}
          filteredUniqueItems={filteredUniqueItems}
          itemAttributesMap={itemAttributesMap}
          merchantItemIndex={merchantItemIndex}
          onItemCardClick={modals.openItemModal}
          onToggleItemFavorite={favorites.items.toggle}
          isItemFavorite={favorites.items.isFavorite}
          onClearItems={() => modals.openClearModal('items')}
          onReorderItems={favorites.items.reorder}
          mixedCards={mixedCards}
          displayedMonsters={displayedMonsters}
          displayedItems={displayedItems}
          shouldShowMonsters={shouldShowMonsters}
          shouldShowItems={shouldShowItems}
          monstersInfiniteScroll={monstersInfiniteScroll}
          itemsInfiniteScroll={itemsInfiniteScroll}
          hasSearchOrFilter={debouncedSearchTerm.trim() !== '' || advancedFilter.enabled}
          hasAnyData={uniqueAllMonsters.length > 0 || uniqueAllItems.length > 0}
          viewHistory={viewHistory.history}
          allDrops={allDrops}
          gachaMachines={gachaMachines}
          itemIndexMap={itemIndexMap}
        />
        )}

        {/* Multiplex 多重廣告 - 列表結束後顯示（交易/轉蛋/商人/檢舉模式時隱藏） */}
        {!pageModes.isTradeMode && !pageModes.isReportMode && !(pageModes.isGachaMode && pageModes.selectedGachaMachineId !== null) && !pageModes.isMerchantMode && (
          <AdSenseMultiplex className="mt-8" />
        )}
      </div>

      {/* Modal 和浮動按鈕管理器 */}
      <ModalManager
        isMonsterModalOpen={modals.isMonsterModalOpen}
        isItemModalOpen={modals.isItemModalOpen}
        isBugReportModalOpen={modals.isBugReportModalOpen}
        isClearModalOpen={modals.isClearModalOpen}
        isMerchantShopModalOpen={modals.isMerchantShopModalOpen}
        isAccuracyCalculatorOpen={modals.isAccuracyCalculatorOpen}
        selectedMonsterId={modals.selectedMonsterId ?? undefined}
        selectedMonsterName={modals.selectedMonsterName}
        selectedItemId={modals.selectedItemId}
        selectedItemName={modals.selectedItemName}
        selectedMerchantMapId={modals.selectedMerchantMapId}
        clearModalType={modals.clearModalType}
        accuracyInitialMonsterId={modals.accuracyInitialMonsterId}
        hasPreviousModal={modals.hasPreviousModal}
        closeMonsterModal={modals.closeMonsterModal}
        closeItemModal={modals.closeItemModal}
        closeBugReportModal={modals.closeBugReportModal}
        closeClearModal={modals.closeClearModal}
        closeMerchantShopModal={modals.closeMerchantShopModal}
        closeAccuracyCalculator={modals.closeAccuracyCalculator}
        goBack={modals.goBack}
        openBugReportModal={modals.openBugReportModal}
        openMerchantShopModal={modals.openMerchantShopModal}
        openAccuracyCalculator={modals.openAccuracyCalculator}
        allDrops={allDrops}
        gachaMachines={gachaMachines}
        itemAttributesMap={itemAttributesMap}
        merchantItemIndex={merchantItemIndex}
        isFavorite={favorites.monsters.isFavorite}
        toggleFavorite={favorites.monsters.toggle}
        isItemFavorite={favorites.items.isFavorite}
        toggleItemFavorite={favorites.items.toggle}
        favoriteMonsterCount={favorites.monsters.count}
        favoriteItemCount={favorites.items.count}
        handleItemClickFromMonsterModal={handleItemClickFromMonsterModal}
        handleMonsterClickFromItemModal={handleMonsterClickFromItemModal}
        handleGachaMachineClick={handleGachaMachineClick}
        handleClearConfirm={handleClearConfirm}
        isAccuracyCalcOpen={toolModals.isAccuracyCalcOpen}
        setIsAccuracyCalcOpen={toolModals.setAccuracyCalcOpen}
        isGameCommandsOpen={toolModals.isGameCommandsOpen}
        setIsGameCommandsOpen={toolModals.setGameCommandsOpen}
        isScreenRecorderModalOpen={modals.isScreenRecorderModalOpen}
        openScreenRecorderModal={modals.openScreenRecorderModal}
        closeScreenRecorderModal={modals.closeScreenRecorderModal}
        isManualExpRecorderModalOpen={modals.isManualExpRecorderModalOpen}
        openManualExpRecorderModal={modals.openManualExpRecorderModal}
        closeManualExpRecorderModal={modals.closeManualExpRecorderModal}
        isExpTrackerModalOpen={modals.isExpTrackerModalOpen}
        openExpTrackerModal={modals.openExpTrackerModal}
        closeExpTrackerModal={modals.closeExpTrackerModal}
        isPrivacyModalOpen={toolModals.isPrivacyModalOpen}
        openPrivacyModal={toolModals.openPrivacyModal}
        closePrivacyModal={toolModals.closePrivacyModal}
        isAboutModalOpen={toolModals.isAboutModalOpen}
        openAboutModal={toolModals.openAboutModal}
        closeAboutModal={toolModals.closeAboutModal}
        isGlobalSettingsOpen={toolModals.isGlobalSettingsOpen}
        openGlobalSettings={toolModals.openGlobalSettings}
        closeGlobalSettings={toolModals.closeGlobalSettings}
        isApiTesterOpen={toolModals.isApiTesterOpen}
        openApiTester={toolModals.openApiTester}
        closeApiTester={toolModals.closeApiTester}
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
