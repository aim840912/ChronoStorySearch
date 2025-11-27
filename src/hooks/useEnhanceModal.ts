/**
 * 強化 Modal 管理 Hook
 *
 * 功能：
 * - 管理強化 Modal 的開關狀態
 * - 處理從轉蛋機切換到強化 Modal 的邏輯
 * - 處理從強化 Modal 返回轉蛋機的邏輯
 */

import { useState, useCallback } from 'react'

interface EnhanceModalConfig {
  /** 是否有前一個 Modal（用於顯示返回按鈕） */
  hasPreviousModal: boolean
  /** 預選的裝備 ID（從轉蛋機帶入） */
  preSelectedEquipmentId?: number
}

interface UseEnhanceModalOptions {
  /** 關閉轉蛋機 Modal 的函數 */
  closeGachaModal: () => void
  /** 開啟轉蛋機 Modal 的函數 */
  openGachaModal: (machineId?: number, saveHistory?: boolean) => void
}

interface UseEnhanceModalReturn {
  /** Modal 是否開啟 */
  isOpen: boolean
  /** Modal 配置 */
  config: EnhanceModalConfig
  /** 開啟 Modal（從 FilterButtons） */
  open: () => void
  /** 關閉 Modal */
  close: () => void
  /** 從轉蛋機切換到強化 Modal */
  switchFromGacha: (equipmentId?: number) => void
  /** 返回轉蛋機 */
  goBackToGacha: () => void
}

export function useEnhanceModal({
  closeGachaModal,
  openGachaModal,
}: UseEnhanceModalOptions): UseEnhanceModalReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<EnhanceModalConfig>({
    hasPreviousModal: false,
    preSelectedEquipmentId: undefined,
  })

  // 開啟強化 Modal（從 FilterButtons）
  const open = useCallback(() => {
    setConfig({
      hasPreviousModal: false,
      preSelectedEquipmentId: undefined,
    })
    setIsOpen(true)
  }, [])

  // 關閉 Modal
  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  // 從轉蛋機切換到強化 Modal
  const switchFromGacha = useCallback((equipmentId?: number) => {
    closeGachaModal()
    setTimeout(() => {
      setConfig({
        hasPreviousModal: true,
        preSelectedEquipmentId: equipmentId,
      })
      setIsOpen(true)
    }, 150) // 等待轉蛋機 Modal 關閉動畫
  }, [closeGachaModal])

  // 從強化 Modal 返回轉蛋機
  const goBackToGacha = useCallback(() => {
    setIsOpen(false)
    setTimeout(() => {
      openGachaModal()
    }, 150)
  }, [openGachaModal])

  return {
    isOpen,
    config,
    open,
    close,
    switchFromGacha,
    goBackToGacha,
  }
}
