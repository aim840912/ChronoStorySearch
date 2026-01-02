'use client'

import { useState, useCallback } from 'react'

/**
 * 工具類 Modal 狀態管理 Hook
 * 整合所有獨立的工具 Modal 狀態（非核心業務 Modal）
 *
 * 這些 Modal 與 ModalManager 中的 Modal 不同：
 * - ModalManager 管理核心業務 Modal（怪物、物品、轉蛋）
 * - 此 Hook 管理輔助工具 Modal（設定、關於、遊戲指令等）
 */

export interface ToolModalsState {
  isAccuracyCalcOpen: boolean
  isGameCommandsOpen: boolean
  isPrivacyModalOpen: boolean
  isAboutModalOpen: boolean
  isGlobalSettingsOpen: boolean
  isApiTesterOpen: boolean
  isReportModalOpen: boolean
}

export interface ToolModalsActions {
  // 命中率計算器
  openAccuracyCalc: () => void
  closeAccuracyCalc: () => void
  setAccuracyCalcOpen: (open: boolean) => void
  // 遊戲指令
  openGameCommands: () => void
  closeGameCommands: () => void
  setGameCommandsOpen: (open: boolean) => void
  // 隱私設定
  openPrivacyModal: () => void
  closePrivacyModal: () => void
  // 關於本站
  openAboutModal: () => void
  closeAboutModal: () => void
  // 全域設定
  openGlobalSettings: () => void
  closeGlobalSettings: () => void
  // API 測試工具（開發環境）
  openApiTester: () => void
  closeApiTester: () => void
  // 檢舉系統
  openReportModal: () => void
  closeReportModal: () => void
}

export type UseToolModalsReturn = ToolModalsState & ToolModalsActions

/**
 * 工具 Modal 管理 Hook
 * 將原本散落在 page.tsx 的 6 個 useState 整合為單一 hook
 */
export function useToolModals(): UseToolModalsReturn {
  const [isAccuracyCalcOpen, setIsAccuracyCalcOpen] = useState(false)
  const [isGameCommandsOpen, setIsGameCommandsOpen] = useState(false)
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false)
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false)
  const [isApiTesterOpen, setIsApiTesterOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  // 命中率計算器
  const openAccuracyCalc = useCallback(() => setIsAccuracyCalcOpen(true), [])
  const closeAccuracyCalc = useCallback(() => setIsAccuracyCalcOpen(false), [])
  const setAccuracyCalcOpen = useCallback((open: boolean) => setIsAccuracyCalcOpen(open), [])

  // 遊戲指令
  const openGameCommands = useCallback(() => setIsGameCommandsOpen(true), [])
  const closeGameCommands = useCallback(() => setIsGameCommandsOpen(false), [])
  const setGameCommandsOpen = useCallback((open: boolean) => setIsGameCommandsOpen(open), [])

  // 隱私設定
  const openPrivacyModal = useCallback(() => setIsPrivacyModalOpen(true), [])
  const closePrivacyModal = useCallback(() => setIsPrivacyModalOpen(false), [])

  // 關於本站
  const openAboutModal = useCallback(() => setIsAboutModalOpen(true), [])
  const closeAboutModal = useCallback(() => setIsAboutModalOpen(false), [])

  // 全域設定
  const openGlobalSettings = useCallback(() => setIsGlobalSettingsOpen(true), [])
  const closeGlobalSettings = useCallback(() => setIsGlobalSettingsOpen(false), [])

  // API 測試工具
  const openApiTester = useCallback(() => setIsApiTesterOpen(true), [])
  const closeApiTester = useCallback(() => setIsApiTesterOpen(false), [])

  // 檢舉系統
  const openReportModal = useCallback(() => setIsReportModalOpen(true), [])
  const closeReportModal = useCallback(() => setIsReportModalOpen(false), [])

  return {
    // 狀態
    isAccuracyCalcOpen,
    isGameCommandsOpen,
    isPrivacyModalOpen,
    isAboutModalOpen,
    isGlobalSettingsOpen,
    isApiTesterOpen,
    // 操作
    openAccuracyCalc,
    closeAccuracyCalc,
    setAccuracyCalcOpen,
    openGameCommands,
    closeGameCommands,
    setGameCommandsOpen,
    openPrivacyModal,
    closePrivacyModal,
    openAboutModal,
    closeAboutModal,
    openGlobalSettings,
    closeGlobalSettings,
    openApiTester,
    closeApiTester,
    isReportModalOpen,
    openReportModal,
    closeReportModal,
  }
}
