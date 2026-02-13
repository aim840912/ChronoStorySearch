'use client'

import { useState, useCallback, useEffect } from 'react'
import type { TradeType, EquipmentStatsFilter } from '@/types/trade'

const TRADE_MODE_KEY = 'chronostory-trade-mode'

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
  // 轉蛋模式
  isGachaMode: boolean
  selectedGachaMachineId: number | null
  // 商人模式
  isMerchantMode: boolean
  selectedMerchantMapId: string | null
  // 交易模式
  isTradeMode: boolean
  tradeTypeFilter: TradeType | 'all'
  tradeSearchQuery: string
  tradeStatsFilter: EquipmentStatsFilter
  // 檢舉模式
  isReportMode: boolean
  // 捲軸兌換模式
  isScrollExchangeMode: boolean
}

export interface PageModesActions {
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
  // 檢舉模式
  toggleReportMode: () => void
  // 捲軸兌換模式
  toggleScrollExchange: () => void
  closeScrollExchange: () => void
  // 通用
  closeAllModes: () => void
}

export type UsePageModesReturn = PageModesState & PageModesActions

/**
 * 頁面模式管理 Hook
 * 將原本散落在 page.tsx 的 6 個 useState + 多個 useCallback 整合為單一 hook
 */
export function usePageModes(): UsePageModesReturn {
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

  // 檢舉模式狀態
  const [isReportMode, setIsReportMode] = useState(false)

  // 捲軸兌換模式狀態
  const [isScrollExchangeMode, setIsScrollExchangeMode] = useState(false)

  /**
   * 重置素質篩選
   */
  const resetTradeStatsFilter = useCallback(() => {
    setTradeStatsFilter({})
  }, [])

  // 從 localStorage 讀取交易模式初始狀態（避免 SSR hydration 不匹配）
  useEffect(() => {
    const saved = localStorage.getItem(TRADE_MODE_KEY)
    if (saved === 'true') {
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
    setIsReportMode(false)
    setIsScrollExchangeMode(false)
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
    setIsReportMode(false)
    setIsScrollExchangeMode(false)
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
    setIsReportMode(false)
    setIsScrollExchangeMode(false)
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
        setIsReportMode(false)
        setIsScrollExchangeMode(false)
        // 滾動到頂部
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return newValue
    })
  }, [])

  /**
   * 切換檢舉模式
   * 進入時會關閉其他模式（互斥）
   */
  const toggleReportMode = useCallback(() => {
    setIsReportMode(prev => {
      const newValue = !prev
      if (newValue) {
        // 進入檢舉模式時關閉其他模式
        setIsGachaMode(false)
        setSelectedGachaMachineId(null)
        setIsMerchantMode(false)
        setSelectedMerchantMapId(null)
        setIsTradeMode(false)
        setIsScrollExchangeMode(false)
        // 滾動到頂部
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return newValue
    })
  }, [])

  /**
   * 切換捲軸兌換模式
   * 進入時會關閉其他模式（互斥）
   */
  const toggleScrollExchange = useCallback(() => {
    setIsScrollExchangeMode(prev => {
      const newValue = !prev
      if (newValue) {
        // 進入捲軸兌換模式時關閉其他模式
        setIsGachaMode(false)
        setSelectedGachaMachineId(null)
        setIsMerchantMode(false)
        setSelectedMerchantMapId(null)
        setIsTradeMode(false)
        setIsReportMode(false)
        // 滾動到頂部
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return newValue
    })
  }, [])

  /**
   * 關閉捲軸兌換模式
   */
  const closeScrollExchange = useCallback(() => {
    setIsScrollExchangeMode(false)
  }, [])

  return {
    // 狀態
    isGachaMode,
    selectedGachaMachineId,
    isMerchantMode,
    selectedMerchantMapId,
    isTradeMode,
    tradeTypeFilter,
    tradeSearchQuery,
    tradeStatsFilter,
    isReportMode,
    isScrollExchangeMode,
    // 操作
    selectGacha,
    closeGacha,
    selectMerchant,
    closeMerchant,
    toggleTradeMode,
    setTradeTypeFilter,
    setTradeSearchQuery,
    setTradeStatsFilter,
    resetTradeStatsFilter,
    toggleReportMode,
    toggleScrollExchange,
    closeScrollExchange,
    closeAllModes,
  }
}
