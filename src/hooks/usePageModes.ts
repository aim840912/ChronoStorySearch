'use client'

import { useState, useCallback, useEffect } from 'react'
import type { TradeType, EquipmentStatsFilter } from '@/types/trade'

const TRADE_MODE_KEY = 'chronostory-trade-mode'
const GAME_MODE_KEY = 'chronostory-game-mode'

/**
 * 遊戲模式類型
 * - chronostory: ChronoStory 遊戲（預設）
 * - artale: Artale 遊戲
 */
export type GameMode = 'chronostory' | 'artale'

/**
 * 頁面模式狀態管理 Hook
 * 整合轉蛋模式、商人模式、交易模式的狀態和切換邏輯
 *
 * 設計原則：
 * - 三種模式互斥（同時只能啟用一種）
 * - 每種模式都有對應的子狀態（如選中的 ID、篩選條件）
 * - 提供統一的切換和關閉方法
 */

export interface PageModesState {
  // 遊戲模式（ChronoStory / Artale）
  gameMode: GameMode
  // 轉蛋模式（僅 ChronoStory）
  isGachaMode: boolean
  selectedGachaMachineId: number | null
  // 商人模式（僅 ChronoStory）
  isMerchantMode: boolean
  selectedMerchantMapId: string | null
  // 交易模式（僅 ChronoStory）
  isTradeMode: boolean
  tradeTypeFilter: TradeType | 'all'
  tradeSearchQuery: string
  tradeStatsFilter: EquipmentStatsFilter
}

export interface PageModesActions {
  // 遊戲模式
  setGameMode: (mode: GameMode) => void
  // 轉蛋模式
  selectGacha: (machineId: number | null) => void
  closeGacha: () => void
  // 商人模式
  selectMerchant: (mapId: string | null) => void
  closeMerchant: () => void
  // 交易模式
  toggleTradeMode: () => void
  setTradeTypeFilter: (filter: TradeType | 'all') => void
  setTradeSearchQuery: (query: string) => void
  setTradeStatsFilter: (filter: EquipmentStatsFilter) => void
  resetTradeStatsFilter: () => void
  // 通用
  closeAllModes: () => void
}

export type UsePageModesReturn = PageModesState & PageModesActions

/**
 * 頁面模式管理 Hook
 * 將原本散落在 page.tsx 的 6 個 useState + 多個 useCallback 整合為單一 hook
 */
export function usePageModes(): UsePageModesReturn {
  // 遊戲模式狀態（ChronoStory / Artale）
  const [gameMode, setGameModeState] = useState<GameMode>('chronostory')

  // 轉蛋模式狀態
  const [isGachaMode, setIsGachaMode] = useState(false)
  const [selectedGachaMachineId, setSelectedGachaMachineId] = useState<number | null>(null)

  // 商人模式狀態
  const [isMerchantMode, setIsMerchantMode] = useState(false)
  const [selectedMerchantMapId, setSelectedMerchantMapId] = useState<string | null>(null)

  // 交易模式狀態
  const [isTradeMode, setIsTradeMode] = useState(false)
  const [tradeTypeFilter, setTradeTypeFilter] = useState<TradeType | 'all'>('all')
  const [tradeSearchQuery, setTradeSearchQuery] = useState('')
  const [tradeStatsFilter, setTradeStatsFilter] = useState<EquipmentStatsFilter>({})

  /**
   * 重置素質篩選
   */
  const resetTradeStatsFilter = useCallback(() => {
    setTradeStatsFilter({})
  }, [])

  // 從 localStorage 讀取初始狀態（避免 SSR hydration 不匹配）
  useEffect(() => {
    // 讀取遊戲模式
    const savedGameMode = localStorage.getItem(GAME_MODE_KEY)
    if (savedGameMode === 'artale' || savedGameMode === 'chronostory') {
      setGameModeState(savedGameMode)
    }

    // 讀取交易模式
    const savedTradeMode = localStorage.getItem(TRADE_MODE_KEY)
    if (savedTradeMode === 'true') {
      setIsTradeMode(true)
    }
  }, [])

  /**
   * 關閉所有模式（內部使用）
   */
  const closeAllModes = useCallback(() => {
    setIsGachaMode(false)
    setSelectedGachaMachineId(null)
    setIsMerchantMode(false)
    setSelectedMerchantMapId(null)
    setIsTradeMode(false)
  }, [])

  /**
   * 切換遊戲模式
   * 切換時會關閉所有特殊模式（轉蛋、商人、交易）
   * 同步狀態到 localStorage
   */
  const setGameMode = useCallback((mode: GameMode) => {
    setGameModeState(mode)
    // 同步到 localStorage
    localStorage.setItem(GAME_MODE_KEY, mode)
    // 切換遊戲時關閉所有特殊模式
    setIsGachaMode(false)
    setSelectedGachaMachineId(null)
    setIsMerchantMode(false)
    setSelectedMerchantMapId(null)
    setIsTradeMode(false)
    localStorage.setItem(TRADE_MODE_KEY, 'false')
    // 滾動到頂部
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  /**
   * 選擇轉蛋機並進入轉蛋模式
   * 會自動關閉其他模式（互斥）
   */
  const selectGacha = useCallback((machineId: number | null) => {
    // 關閉其他模式
    setIsMerchantMode(false)
    setSelectedMerchantMapId(null)
    setIsTradeMode(false)
    // 開啟轉蛋模式
    setIsGachaMode(true)
    setSelectedGachaMachineId(machineId)
    // 滾動到頂部
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  /**
   * 關閉轉蛋模式
   */
  const closeGacha = useCallback(() => {
    setIsGachaMode(false)
    setSelectedGachaMachineId(null)
  }, [])

  /**
   * 選擇商人地圖並進入商人模式
   * 會自動關閉其他模式（互斥）
   */
  const selectMerchant = useCallback((mapId: string | null) => {
    // 關閉其他模式
    setIsGachaMode(false)
    setSelectedGachaMachineId(null)
    setIsTradeMode(false)
    // 開啟商人模式
    setIsMerchantMode(true)
    setSelectedMerchantMapId(mapId)
    // 滾動到頂部
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  /**
   * 關閉商人模式
   */
  const closeMerchant = useCallback(() => {
    setIsMerchantMode(false)
    setSelectedMerchantMapId(null)
  }, [])

  /**
   * 切換交易模式
   * 進入時會關閉其他模式（互斥）
   * 同步狀態到 localStorage
   */
  const toggleTradeMode = useCallback(() => {
    setIsTradeMode(prev => {
      const newValue = !prev
      // 同步到 localStorage
      localStorage.setItem(TRADE_MODE_KEY, String(newValue))
      if (newValue) {
        // 進入交易模式時關閉其他模式
        setIsGachaMode(false)
        setSelectedGachaMachineId(null)
        setIsMerchantMode(false)
        setSelectedMerchantMapId(null)
        // 滾動到頂部
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return newValue
    })
  }, [])

  return {
    // 狀態
    gameMode,
    isGachaMode,
    selectedGachaMachineId,
    isMerchantMode,
    selectedMerchantMapId,
    isTradeMode,
    tradeTypeFilter,
    tradeSearchQuery,
    tradeStatsFilter,
    // 操作
    setGameMode,
    selectGacha,
    closeGacha,
    selectMerchant,
    closeMerchant,
    toggleTradeMode,
    setTradeTypeFilter,
    setTradeSearchQuery,
    setTradeStatsFilter,
    resetTradeStatsFilter,
    closeAllModes,
  }
}
