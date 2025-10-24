import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ClearModalType } from '@/types'

/**
 * Modal 類型定義
 */
type ModalType = 'monster' | 'item' | 'gacha' | 'bug' | 'clear' | 'merchant'

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
 * Modal 狀態的聯合類型
 */
type ModalData = MonsterModalData | ItemModalData | ClearModalData | GachaModalData | null

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
 * Modal 管理 Hook
 *
 * 職責：
 * - 統一管理所有 Modal 的開啟/關閉狀態
 * - 簡化 Modal 相關資料的儲存和存取
 * - 提供一致的 API 介面
 *
 * 優化：
 * - 從 13 個 state 變數減少為 1 個統一狀態
 * - 從 19 個 return 值減少為 8 個核心方法
 * - 使用 TypeScript 泛型確保型別安全
 */
export function useModalManager() {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>({ type: null, data: null })
  const [history, setHistory] = useState<ModalHistoryState>({ previous: null })

  // 通用的關閉處理（清理 URL 參數）
  const closeWithRouter = useCallback(() => {
    router.replace('/', { scroll: false })
  }, [router])

  // 開啟 Monster Modal
  const openMonsterModal = useCallback((mobId: number, mobName: string, saveHistory = false) => {
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
  }, [])

  // 關閉 Monster Modal
  const closeMonsterModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
    closeWithRouter()
  }, [closeWithRouter])

  // 開啟 Item Modal
  const openItemModal = useCallback((itemId: number, itemName: string, saveHistory = false) => {
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
  }, [])

  // 關閉 Item Modal
  const closeItemModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
    closeWithRouter()
  }, [closeWithRouter])

  // 開啟 Gacha Modal
  const openGachaModal = useCallback((machineId?: number, saveHistory = false) => {
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
  }, [])

  // 關閉 Gacha Modal
  const closeGachaModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
    // 延遲清除 URL，確保 React 狀態更新完成後再執行
    setTimeout(() => {
      closeWithRouter()
    }, 0)
  }, [closeWithRouter])

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
  const openMerchantShopModal = useCallback(() => {
    setModal({ type: 'merchant', data: null })
  }, [])

  // 關閉 Merchant Shop Modal
  const closeMerchantShopModal = useCallback(() => {
    setModal({ type: null, data: null })
    setHistory({ previous: null })
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
    openMerchantShopModal,
    closeMerchantShopModal,
  }
}
