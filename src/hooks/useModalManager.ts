import { useState, useCallback } from 'react'
import type { ClearModalType } from '@/types'
import { trackEvent, trackViewItem } from '@/lib/analytics/ga4'
import { GA4_EVENTS } from '@/lib/analytics/events'

/**
 * Modal 類型定義
 */
type ModalType = 'monster' | 'item' | 'gacha' | 'bug' | 'clear' | 'merchant' | 'accuracy' | 'createListing' | 'myListings' | 'interests' | 'listingDetail' | 'screenRecorder' | 'expTracker' | 'manualExpRecorder'

/**
 * Monster Modal 資料結構
 */
interface MonsterModalData {
  mobId: number
  mobName: string
}

/**
 * Item Modal 資料結構
 */
interface ItemModalData {
  itemId: number
  itemName: string
}

/**
 * Clear Modal 資料結構
 */
interface ClearModalData {
  type: ClearModalType
}

/**
 * Gacha Modal 資料結構
 */
interface GachaModalData {
  machineId?: number
}

/**
 * Accuracy Calculator Modal 資料結構
 */
interface AccuracyModalData {
  initialMonsterId?: number | null
}

/**
 * Merchant Shop Modal 資料結構
 */
interface MerchantModalData {
  initialMapId?: string
}

/**
 * Listing Detail Modal 資料結構
 */
interface ListingDetailModalData {
  listingId: number
}

/**
 * Modal 狀態的聯合類型
 */
type ModalData = MonsterModalData | ItemModalData | ClearModalData | GachaModalData | AccuracyModalData | MerchantModalData | ListingDetailModalData | null

/**
 * 統一的 Modal 狀態
 */
interface ModalState {
  type: ModalType | null
  data: ModalData
}

/**
 * Modal 導航歷史狀態
 */
interface ModalHistoryState {
  previous: ModalState | null
}

/**
 * Modal 管理 Hook 參數
 */
interface UseModalManagerOptions {
  /**
   * 記錄瀏覽歷史的回調函數（可選）
   * 當開啟 Monster 或 Item Modal 時會自動調用
   */
  recordView?: (type: 'monster' | 'item', id: number, name: string) => void
}

/**
 * Modal 管理 Hook
 *
 * 職責：
 * - 統一管理所有 Modal 的開啟/關閉狀態
 * - 簡化 Modal 相關資料的儲存和存取
 * - 提供一致的 API 介面
 * - 自動記錄瀏覽歷史（如果提供 recordView callback）
 *
 * 優化：
 * - 從 13 個 state 變數減少為 1 個統一狀態
 * - 從 19 個 return 值減少為 8 個核心方法
 * - 使用 TypeScript 泛型確保型別安全
 */
export function useModalManager(options: UseModalManagerOptions = {}) {
  const { recordView } = options
  const [modal, setModal] = useState<ModalState>({ type: null, data: null })
  const [history, setHistory] = useState<ModalHistoryState>({ previous: null })
  // ExpTrackerFloating 使用獨立狀態，不受其他 Modal 影響
  const [isExpTrackerFloatingOpen, setIsExpTrackerFloatingOpen] = useState(false)
  // AccuracyCalculatorFloating 使用獨立狀態，可與 MonsterModal 同時開啟
  const [isAccuracyFloatingOpen, setIsAccuracyFloatingOpen] = useState(false)
  const [accuracyFloatingMonsterId, setAccuracyFloatingMonsterId] = useState<number | null>(null)

  // 開啟 Monster Modal
  const openMonsterModal = useCallback((mobId: number, mobName: string, saveHistory = false) => {
    // 記錄瀏覽歷史（如果提供了 recordView）
    recordView?.('monster', mobId, mobName)

    // GA4 事件追蹤：查看怪物
    trackEvent(GA4_EVENTS.VIEW_MONSTER, {
      monster_id: mobId.toString(),
      monster_name: mobName
    })

    setModal(currentModal => {
      // 如果需要保存歷史，且當前有開啟的 Modal，則保存
      if (saveHistory && currentModal.type !== null) {
        setHistory({ previous: currentModal })
      }
      return {
        type: 'monster',
        data: { mobId, mobName }
      }
    })

    // 使用 pushState 添加歷史記錄，URL 保持 /
    window.history.pushState(
      { modal: 'monster', id: mobId, name: mobName },
      '',
      '/'
    )
  }, [recordView])

  // 關閉 Monster Modal
  const closeMonsterModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
    // 使用 pushState 清除 state（返回首頁）
    window.history.pushState(null, '', '/')
  }, [])

  // 開啟 Item Modal
  const openItemModal = useCallback((itemId: number, itemName: string, saveHistory = false) => {
    // 記錄瀏覽歷史（如果提供了 recordView）
    recordView?.('item', itemId, itemName)

    // GA4 事件追蹤：查看物品
    trackViewItem(itemId.toString(), itemName, 'item')

    setModal(currentModal => {
      // 如果需要保存歷史，且當前有開啟的 Modal，則保存
      if (saveHistory && currentModal.type !== null) {
        setHistory({ previous: currentModal })
      }
      return {
        type: 'item',
        data: { itemId, itemName }
      }
    })

    // 使用 pushState 添加歷史記錄，URL 保持 /
    window.history.pushState(
      { modal: 'item', id: itemId, name: itemName },
      '',
      '/'
    )
  }, [recordView])

  // 關閉 Item Modal
  const closeItemModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
    // 使用 pushState 清除 state（返回首頁）
    window.history.pushState(null, '', '/')
  }, [])

  // 開啟 Gacha Modal
  const openGachaModal = useCallback((machineId?: number, saveHistory = false) => {
    // GA4 事件追蹤：查看轉蛋機
    trackEvent(GA4_EVENTS.VIEW_GACHA, {
      ...(machineId !== undefined && { machine_id: machineId.toString() })
    })

    setModal(currentModal => {
      // 如果需要保存歷史，且當前有開啟的 Modal，則保存
      if (saveHistory && currentModal.type !== null) {
        setHistory({ previous: currentModal })
      }
      return {
        type: 'gacha',
        data: machineId !== undefined ? { machineId } : null
      }
    })

    // 使用 pushState 添加歷史記錄，URL 保持 /
    window.history.pushState(
      { modal: 'gacha', id: machineId },
      '',
      '/'
    )
  }, [])

  // 關閉 Gacha Modal
  const closeGachaModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
    // 使用 pushState 清除 state（返回首頁）
    window.history.pushState(null, '', '/')
  }, [])

  // 開啟 Bug Report Modal
  const openBugReportModal = useCallback(() => {
    setModal({ type: 'bug', data: null })
  }, [])

  // 關閉 Bug Report Modal
  const closeBugReportModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
  }, [])

  // 開啟 Clear Confirm Modal
  const openClearModal = useCallback((type: ClearModalType) => {
    setModal({
      type: 'clear',
      data: { type }
    })
  }, [])

  // 關閉 Clear Confirm Modal
  const closeClearModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
  }, [])

  // 開啟 Merchant Shop Modal
  const openMerchantShopModal = useCallback((initialMapId?: string) => {
    setModal({ type: 'merchant', data: initialMapId ? { initialMapId } : null })
  }, [])

  // 關閉 Merchant Shop Modal
  const closeMerchantShopModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
  }, [])

  // 開啟 Accuracy Calculator 懸浮視窗（獨立狀態，不影響其他 Modal）
  const openAccuracyCalculator = useCallback((initialMonsterId?: number | null) => {
    setIsAccuracyFloatingOpen(true)
    setAccuracyFloatingMonsterId(initialMonsterId ?? null)
  }, [])

  // 關閉 Accuracy Calculator 懸浮視窗
  const closeAccuracyCalculator = useCallback(() => {
    setIsAccuracyFloatingOpen(false)
    setAccuracyFloatingMonsterId(null)
  }, [])

  // 開啟 Create Listing Modal
  const openCreateListingModal = useCallback(() => {
    setModal({ type: 'createListing', data: null })
  }, [])

  // 關閉 Create Listing Modal
  const closeCreateListingModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
  }, [])

  // 開啟 My Listings Modal
  const openMyListingsModal = useCallback(() => {
    setModal({ type: 'myListings', data: null })
  }, [])

  // 關閉 My Listings Modal
  const closeMyListingsModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
  }, [])

  // 開啟 Interests Modal
  const openInterestsModal = useCallback(() => {
    setModal({ type: 'interests', data: null })
  }, [])

  // 關閉 Interests Modal
  const closeInterestsModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
  }, [])

  // 開啟 Listing Detail Modal
  const openListingDetailModal = useCallback((listingId: number) => {
    setModal({ type: 'listingDetail', data: { listingId } })
  }, [])

  // 關閉 Listing Detail Modal
  const closeListingDetailModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
  }, [])

  // 開啟 Screen Recorder Modal
  const openScreenRecorderModal = useCallback(() => {
    setModal({ type: 'screenRecorder', data: null })
  }, [])

  // 關閉 Screen Recorder Modal
  const closeScreenRecorderModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
  }, [])

  // 開啟 Manual EXP Recorder Modal
  const openManualExpRecorderModal = useCallback(() => {
    setModal({ type: 'manualExpRecorder', data: null })
  }, [])

  // 關閉 Manual EXP Recorder Modal
  const closeManualExpRecorderModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
  }, [])

  // 開啟 EXP Tracker Modal（使用獨立狀態）
  const openExpTrackerModal = useCallback(() => {
    setIsExpTrackerFloatingOpen(true)
  }, [])

  // 關閉 EXP Tracker Modal（使用獨立狀態）
  const closeExpTrackerModal = useCallback(() => {
    setIsExpTrackerFloatingOpen(false)
  }, [])

  // 用於 URL 參數處理的 setters（向後相容）
  const setSelectedMonsterId = useCallback((mobId: number | null) => {
    if (mobId !== null && modal.type === 'monster') {
      const currentData = modal.data as MonsterModalData
      setModal({
        type: 'monster',
        data: { mobId, mobName: currentData.mobName }
      })
    }
  }, [modal])

  const setSelectedMonsterName = useCallback((mobName: string) => {
    if (modal.type === 'monster') {
      const currentData = modal.data as MonsterModalData
      setModal({
        type: 'monster',
        data: { mobId: currentData.mobId, mobName }
      })
    }
  }, [modal])

  const setIsMonsterModalOpen = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      closeMonsterModal()
    }
  }, [closeMonsterModal])

  const setSelectedItemId = useCallback((itemId: number | null) => {
    if (itemId !== null && modal.type === 'item') {
      const currentData = modal.data as ItemModalData
      setModal({
        type: 'item',
        data: { itemId, itemName: currentData.itemName }
      })
    }
  }, [modal])

  const setSelectedItemName = useCallback((itemName: string) => {
    if (modal.type === 'item') {
      const currentData = modal.data as ItemModalData
      setModal({
        type: 'item',
        data: { itemId: currentData.itemId, itemName }
      })
    }
  }, [modal])

  const setIsItemModalOpen = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      closeItemModal()
    }
  }, [closeItemModal])

  // 返回上一個 Modal
  const goBack = useCallback(() => {
    if (history.previous !== null) {
      setModal(history.previous)
      setHistory({ previous: null })
    }
  }, [history])

  // 提取當前 Modal 資料（帶型別安全）
  const monsterData = modal.type === 'monster' ? (modal.data as MonsterModalData) : null
  const itemData = modal.type === 'item' ? (modal.data as ItemModalData) : null
  const clearData = modal.type === 'clear' ? (modal.data as ClearModalData) : null
  const gachaData = modal.type === 'gacha' ? (modal.data as GachaModalData | null) : null
  // accuracyData 不再需要，AccuracyCalculator 使用獨立狀態
  const merchantData = modal.type === 'merchant' ? (modal.data as MerchantModalData | null) : null
  const listingDetailData = modal.type === 'listingDetail' ? (modal.data as ListingDetailModalData) : null

  return {
    // 核心 API（新的簡化介面）
    activeModal: modal.type,
    isOpen: (type: ModalType) => modal.type === type,

    // 導航歷史
    hasPreviousModal: history.previous !== null,
    goBack,

    // Monster Modal
    isMonsterModalOpen: modal.type === 'monster',
    selectedMonsterId: monsterData?.mobId ?? null,
    selectedMonsterName: monsterData?.mobName ?? '',
    openMonsterModal,
    closeMonsterModal,
    setSelectedMonsterId, // 向後相容
    setSelectedMonsterName, // 向後相容
    setIsMonsterModalOpen, // 向後相容

    // Item Modal
    isItemModalOpen: modal.type === 'item',
    selectedItemId: itemData?.itemId ?? null,
    selectedItemName: itemData?.itemName ?? '',
    openItemModal,
    closeItemModal,
    setSelectedItemId, // 向後相容
    setSelectedItemName, // 向後相容
    setIsItemModalOpen, // 向後相容

    // Bug Report Modal
    isBugReportModalOpen: modal.type === 'bug',
    openBugReportModal,
    closeBugReportModal,

    // Clear Confirm Modal
    isClearModalOpen: modal.type === 'clear',
    clearModalType: clearData?.type ?? 'monsters',
    openClearModal,
    closeClearModal,

    // Gacha Machine Modal
    isGachaModalOpen: modal.type === 'gacha',
    selectedGachaMachineId: gachaData?.machineId,
    openGachaModal,
    closeGachaModal,

    // Merchant Shop Modal
    isMerchantShopModalOpen: modal.type === 'merchant',
    selectedMerchantMapId: merchantData?.initialMapId,
    openMerchantShopModal,
    closeMerchantShopModal,

    // Accuracy Calculator 懸浮視窗（獨立狀態）
    isAccuracyCalculatorOpen: isAccuracyFloatingOpen,
    accuracyInitialMonsterId: accuracyFloatingMonsterId,
    openAccuracyCalculator,
    closeAccuracyCalculator,

    // Create Listing Modal
    isCreateListingModalOpen: modal.type === 'createListing',
    openCreateListingModal,
    closeCreateListingModal,

    // My Listings Modal
    isMyListingsModalOpen: modal.type === 'myListings',
    openMyListingsModal,
    closeMyListingsModal,

    // Interests Modal
    isInterestsModalOpen: modal.type === 'interests',
    openInterestsModal,
    closeInterestsModal,

    // Listing Detail Modal
    isListingDetailModalOpen: modal.type === 'listingDetail',
    selectedListingId: listingDetailData?.listingId ?? null,
    openListingDetailModal,
    closeListingDetailModal,

    // Screen Recorder Modal
    isScreenRecorderModalOpen: modal.type === 'screenRecorder',
    openScreenRecorderModal,
    closeScreenRecorderModal,

    // EXP Tracker Modal（使用獨立狀態，不受其他 Modal 影響）
    isExpTrackerModalOpen: isExpTrackerFloatingOpen,
    openExpTrackerModal,
    closeExpTrackerModal,

    // Manual EXP Recorder Modal
    isManualExpRecorderModalOpen: modal.type === 'manualExpRecorder',
    openManualExpRecorderModal,
    closeManualExpRecorderModal,

    // 暴露原始 modal 狀態（用於複雜條件判斷）
    modal,
  }
}
