'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { FilterMode, AdvancedFilterOptions, SuggestionItem, SearchTypeFilter, MarketFilterOptions } from '@/types'
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
import { useMarketFilter } from '@/hooks/useMarketFilter'
import { useMarketListings } from '@/hooks/useMarketListings'
import { SearchHeader } from '@/components/SearchHeader'
import { ContentDisplay } from '@/components/ContentDisplay'
import { ModalManager } from '@/components/ModalManager'
import { EnhanceWorkshopModal } from '@/components/EnhanceWorkshopModal'
import { clientLogger } from '@/lib/logger'
import { getDefaultAdvancedFilter } from '@/lib/filter-utils'
import { trackEvent } from '@/lib/analytics/ga4'
import { GA4_EVENTS } from '@/lib/analytics/events'

export default function Home() {
  const { t, language } = useLanguage()
  // 注意：不再需要 user 變數，因為批次 API 已返回所有用戶資訊

  // 篩選模式：全部 or 最愛怪物 or 最愛物品
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  // 用戶配額狀態（刊登數量）
  const [userQuota, setUserQuota] = useState<{ active: number; max: number } | null>(null)

  // 搜尋類型篩選：全部 or 怪物 or 物品
  const [searchType, setSearchType] = useState<SearchTypeFilter>('all')

  // 進階篩選狀態
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilterOptions>(getDefaultAdvancedFilter())
  const [isAdvancedFilterExpanded, setIsAdvancedFilterExpanded] = useState(false)

  // 市場篩選狀態
  const [marketFilter, setMarketFilter] = useState<MarketFilterOptions>({
    tradeTypes: [],
    priceRange: { min: null, max: null },
    itemStatsFilter: [],
    sortBy: 'created_at',
    sortOrder: 'desc'
  })

  // 追蹤首次掛載，避免初始載入時觸發滾動
  const isFirstMount = useRef(true)
  const isFirstSearchChange = useRef(true)
  // 追蹤進階篩選面板展開時的滾動位置
  const expandedAtScrollY = useRef<number | null>(null)

  // 追蹤是否顯示「返回頂部」按鈕
  const [showBackToTop, setShowBackToTop] = useState(false)

  // 命中率計算器 Modal 狀態
  const [isAccuracyCalcOpen, setIsAccuracyCalcOpen] = useState(false)

  // 遊戲指令 Modal 狀態
  const [isGameCommandsOpen, setIsGameCommandsOpen] = useState(false)

  // 強化 Modal 狀態
  const [isEnhanceModalOpen, setIsEnhanceModalOpen] = useState(false)
  const [enhanceModalConfig, setEnhanceModalConfig] = useState<{
    hasPreviousModal: boolean
    preSelectedEquipmentId?: number
  }>({ hasPreviousModal: false })

  // 計算已啟用的進階篩選數量
  const advancedFilterCount = [
    advancedFilter.itemCategories.length > 0 ? 1 : 0,
    advancedFilter.jobClasses.length > 0 ? 1 : 0,
    advancedFilter.elementWeaknesses.length > 0 ? 1 : 0,
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
    mobInfoMap,
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
    mobInfoMap,
    gachaMachines,
    initialRandomGachaItems,
  })

  // 市場篩選 Hook - 處理市場物品篩選（將進階篩選轉換為物品 ID 列表）
  const { getFilteredItemIds } = useMarketFilter({
    advancedFilter,
    itemAttributesMap
  })

  // 市場刊登 Hook - 處理市場刊登的載入和管理
  const marketListings = useMarketListings({
    enabled: filterMode === 'market-listings'
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
    // 當有搜尋詞、選擇了轉蛋/物品類型、轉蛋 Modal 開啟、或收藏物品模式時，載入轉蛋機資料
    const needsGachaData =
      debouncedSearchTerm.trim() !== '' ||
      searchType === 'gacha' ||
      searchType === 'item' ||
      modals.isGachaModalOpen ||
      filterMode === 'favorite-items' ||
      (advancedFilter.enabled && advancedFilter.itemCategories.length > 0)

    if (needsGachaData) {
      loadGachaMachines()
    }
  }, [debouncedSearchTerm, searchType, advancedFilter.enabled, advancedFilter.itemCategories, loadGachaMachines, modals.isGachaModalOpen, filterMode])

  // 初始載入時處理分享連結（從 hash 參數開啟 modal）
  useEffect(() => {
    if (allDrops.length === 0) return // 等待資料載入完成

    const hash = window.location.hash
    if (!hash || hash === '#') return

    // 解析 hash 參數
    const params = new URLSearchParams(hash.slice(1))
    const monsterIdParam = params.get('monster')
    const itemIdParam = params.get('item')
    const gachaParam = params.get('gacha')

    // 立即清除 hash（使用 replaceState）
    window.history.replaceState(null, '', '/')

    // 根據參數開啟對應 Modal
    if (monsterIdParam) {
      const monsterId = parseInt(monsterIdParam, 10)
      if (!isNaN(monsterId)) {
        const monster = allDrops.find((drop) => drop.mobId === monsterId)
        if (monster) {
          const displayName = (language === 'zh-TW' && monster.chineseMobName)
            ? monster.chineseMobName
            : monster.mobName
          modals.openMonsterModal(monsterId, displayName)
          clientLogger.info(`從分享連結開啟怪物 modal: ${displayName} (${monsterId})`)
        }
      }
    } else if (itemIdParam) {
      const itemId = parseInt(itemIdParam, 10)
      if (!isNaN(itemId) || itemIdParam === '0') {
        const parsedItemId = itemIdParam === '0' ? 0 : itemId
        const item = allDrops.find((drop) => drop.itemId === parsedItemId)
        if (item) {
          const displayName = (language === 'zh-TW' && item.chineseItemName)
            ? item.chineseItemName
            : item.itemName
          modals.openItemModal(parsedItemId, displayName)
          clientLogger.info(`從分享連結開啟物品 modal: ${displayName} (${parsedItemId})`)
        }
      }
    } else if (gachaParam) {
      if (gachaParam === 'list') {
        modals.openGachaModal()
        clientLogger.info('從分享連結開啟轉蛋機列表 modal')
      } else {
        const machineId = parseInt(gachaParam, 10)
        if (!isNaN(machineId) && machineId >= 1 && machineId <= 7) {
          modals.openGachaModal(machineId)
          clientLogger.info(`從分享連結開啟轉蛋機 modal: 機台 ${machineId}`)
        }
      }
    }
  }, [allDrops, language]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // 追蹤進階篩選面板展開時的滾動位置
  useEffect(() => {
    if (isAdvancedFilterExpanded) {
      // 面板剛展開，記錄當前滾動位置
      expandedAtScrollY.current = window.scrollY
    } else {
      // 面板收合，清除記錄
      expandedAtScrollY.current = null
    }
  }, [isAdvancedFilterExpanded])

  // 監聽滾動事件，顯示/隱藏「返回頂部」按鈕，並自動收合進階篩選
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY

      // 當使用者滾動超過 300px 時顯示按鈕
      setShowBackToTop(scrollY > 300)

      // 只有從展開位置向下滾動超過 50px 才收合面板
      if (
        isAdvancedFilterExpanded &&
        expandedAtScrollY.current !== null &&
        scrollY > expandedAtScrollY.current + 50
      ) {
        setIsAdvancedFilterExpanded(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isAdvancedFilterExpanded])

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
    // 關閉進階篩選面板
    setIsAdvancedFilterExpanded(false)
    // 滾動到頂部以顯示瀏覽紀錄
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // 模式切換到市場刊登時，載入市場資料
  useEffect(() => {
    if (filterMode === 'market-listings') {
      // 取得篩選的物品 ID
      const filteredItemIds = getFilteredItemIds()

      // 載入市場刊登
      marketListings.fetchListings({
        page: 1,
        filter: marketFilter,
        itemIds: filteredItemIds.length > 0 ? filteredItemIds : undefined,
        searchTerm: debouncedSearchTerm
      })
    }
  }, [filterMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // 從批次 API 響應中提取用戶配額（優化：不再需要額外調用 /api/auth/me）
  useEffect(() => {
    if (filterMode === 'market-listings' && marketListings.userInfo) {
      const quotas = marketListings.userInfo.quotas
      if (quotas) {
        setUserQuota({
          active: quotas.active_listings_count,
          max: quotas.max_listings
        })
        clientLogger.debug('[Page] 用戶配額已從批次 API 載入:', quotas)
      }
    } else {
      // 離開市場模式或尚未載入時清除配額
      setUserQuota(null)
    }
  }, [filterMode, marketListings.userInfo])

  // 市場篩選或搜尋詞變更時，重新載入資料
  useEffect(() => {
    if (filterMode === 'market-listings') {
      const filteredItemIds = getFilteredItemIds()

      marketListings.fetchListings({
        page: 1,
        filter: marketFilter,
        itemIds: filteredItemIds.length > 0 ? filteredItemIds : undefined,
        searchTerm: debouncedSearchTerm
      })
    }
  }, [marketFilter, advancedFilter, debouncedSearchTerm]) // eslint-disable-line react-hooks/exhaustive-deps

  // 分享處理函數
  const handleShare = useCallback(async () => {
    if (!search.searchTerm.trim()) return

    try {
      const url = `${window.location.origin}${window.location.pathname}#q=${encodeURIComponent(search.searchTerm)}`
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

  // 返回頂部
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // 開啟強化 Modal（從 FilterButtons）
  const handleOpenEnhance = useCallback(() => {
    setEnhanceModalConfig({
      hasPreviousModal: false,
      preSelectedEquipmentId: undefined
    })
    setIsEnhanceModalOpen(true)
  }, [])

  // 從轉蛋機切換到強化 Modal
  const handleSwitchToEnhance = useCallback((equipmentId?: number) => {
    modals.closeGachaModal()
    setTimeout(() => {
      setEnhanceModalConfig({
        hasPreviousModal: true,
        preSelectedEquipmentId: equipmentId
      })
      setIsEnhanceModalOpen(true)
    }, 150) // 等待轉蛋機 Modal 關閉動畫
  }, [modals])

  // 從強化 Modal 返回轉蛋機
  const handleGoBackToGacha = useCallback(() => {
    setIsEnhanceModalOpen(false)
    setTimeout(() => {
      modals.openGachaModal()
    }, 150)
  }, [modals])

  // 建立刊登成功後的處理函數
  const handleCreateListingSuccess = useCallback(() => {
    // 清除市場刊登快取，確保下次載入時會取得最新資料
    marketListings.reset()

    // 如果當前在市場刊登模式，自動重新載入列表
    if (filterMode === 'market-listings') {
      const filteredItemIds = getFilteredItemIds()
      marketListings.fetchListings({
        page: 1,
        filter: marketFilter,
        itemIds: filteredItemIds.length > 0 ? filteredItemIds : undefined,
        searchTerm: debouncedSearchTerm
      })
    }
  }, [filterMode, marketFilter, advancedFilter, marketListings, getFilteredItemIds, debouncedSearchTerm]) // eslint-disable-line react-hooks/exhaustive-deps

  // 防抖的市場刊登重新整理函數
  const debouncedMarketRefresh = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null

    return async () => {
      // 如果有進行中的 timeout，清除它
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // 設置新的 timeout（1000ms 防抖）
      timeoutId = setTimeout(async () => {
        try {
          const filteredItemIds = getFilteredItemIds()
          await marketListings.refresh(
            marketFilter,
            filteredItemIds.length > 0 ? filteredItemIds : undefined,
            debouncedSearchTerm
          )

          // 成功時顯示 Toast 通知
          toast.showToast(t('market.refreshSuccess') || '重新整理成功', 'success')
        } catch (error) {
          // 錯誤時顯示 Toast 通知
          const errorMessage = error instanceof Error ? error.message : '重新整理失敗'
          toast.showToast(
            `${t('market.refreshError') || '重新整理失敗'}: ${errorMessage}`,
            'error'
          )
          clientLogger.error('[Page] Market refresh failed:', error)
        }
      }, 1000) // 1 秒防抖
    }
  }, [marketFilter, getFilteredItemIds, marketListings, toast, t, debouncedSearchTerm])

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
          onShare={handleShare}
          filterMode={filterMode}
          onFilterChange={setFilterMode}
          favoriteMonsterCount={favoriteCount}
          favoriteItemCount={favoriteItemCount}
          isAdvancedFilterExpanded={isAdvancedFilterExpanded}
          onAdvancedFilterToggle={() => setIsAdvancedFilterExpanded(!isAdvancedFilterExpanded)}
          advancedFilterCount={advancedFilterCount}
          onResetAdvancedFilter={handleResetAdvancedFilter}
          advancedFilter={advancedFilter}
          onAdvancedFilterChange={setAdvancedFilter}
          onOpenCreateListing={modals.openCreateListingModal}
          onOpenMyListings={modals.openMyListingsModal}
          onOpenInterests={modals.openInterestsModal}
          marketFilter={marketFilter}
          onMarketFilterChange={setMarketFilter}
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
          onClearMonsters={() => modals.openClearModal('monsters')}
          filteredUniqueItems={filteredUniqueItems}
          itemAttributesMap={itemAttributesMap}
          onItemCardClick={modals.openItemModal}
          onToggleItemFavorite={toggleItemFavorite}
          isItemFavorite={isItemFavorite}
          onClearItems={() => modals.openClearModal('items')}
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
          marketListings={marketListings.listings}
          marketPagination={marketListings.pagination}
          isMarketLoading={marketListings.isLoading}
          marketError={marketListings.error}
          isMarketRefreshing={marketListings.isLoading}
          marketRefreshError={marketListings.refreshError}
          userQuota={userQuota}
          onListingClick={(listingId: string) => {
            // 開啟刊登詳情 Modal（顯示完整資訊和購買意向功能）
            modals.openListingDetailModal(parseInt(listingId, 10))
          }}
          onMarketPageChange={marketListings.goToPage}
          onMarketRefresh={debouncedMarketRefresh}
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
        isCreateListingModalOpen={modals.isCreateListingModalOpen}
        isMyListingsModalOpen={modals.isMyListingsModalOpen}
        isInterestsModalOpen={modals.isInterestsModalOpen}
        isListingDetailModalOpen={modals.isListingDetailModalOpen}
        selectedListingId={modals.selectedListingId}
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
        closeCreateListingModal={modals.closeCreateListingModal}
        closeMyListingsModal={modals.closeMyListingsModal}
        closeInterestsModal={modals.closeInterestsModal}
        closeListingDetailModal={modals.closeListingDetailModal}
        goBack={modals.goBack}
        openGachaModal={modals.openGachaModal}
        openBugReportModal={modals.openBugReportModal}
        openMerchantShopModal={modals.openMerchantShopModal}
        openAccuracyCalculator={modals.openAccuracyCalculator}
        openCreateListingModal={modals.openCreateListingModal}
        openMyListingsModal={modals.openMyListingsModal}
        onCreateListingSuccess={handleCreateListingSuccess}
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
        onSwitchToEnhance={handleSwitchToEnhance}
        onOpenEnhance={handleOpenEnhance}
      />

      {/* 強化 Modal */}
      <EnhanceWorkshopModal
        isOpen={isEnhanceModalOpen}
        onClose={() => setIsEnhanceModalOpen(false)}
        hasPreviousModal={enhanceModalConfig.hasPreviousModal}
        onGoBack={handleGoBackToGacha}
        preSelectedEquipmentId={enhanceModalConfig.preSelectedEquipmentId}
      />
    </div>
  )
}
