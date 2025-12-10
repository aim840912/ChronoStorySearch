'use client'

/**
 * 轉蛋機邏輯 Hook
 *
 * 職責：
 * - 管理轉蛋機資料載入
 * - 處理轉蛋機選擇邏輯
 * - 處理抽獎邏輯和結果
 * - 管理搜尋和排序
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { GachaMachine, GachaItem, GachaResult, EnhancedGachaItem } from '@/types'
import { clientLogger } from '@/lib/logger'
import { weightedRandomDraw } from '@/lib/gacha-utils'
import { calculateRandomStats } from '@/lib/random-equipment-stats'

type SortOption = 'probability-desc' | 'probability-asc' | 'level-desc' | 'level-asc' | 'name-asc'
type ViewMode = 'browse' | 'gacha'

/**
 * Enhanced JSON 的轉蛋機格式
 */
interface EnhancedGachaMachineRaw {
  machineId: number
  machineName: string
  chineseMachineName?: string
  description: string
  totalItems: number
  items: EnhancedGachaItem[]
}

/**
 * 正規化 Enhanced JSON 格式的轉蛋機資料
 */
function normalizeGachaMachine(rawData: EnhancedGachaMachineRaw): GachaMachine {
  return {
    ...rawData,
    items: rawData.items.map((item) => ({
      ...item,
      chineseName: item.chineseName,
      probability: item.probability,
      chance: item.chance,
      itemId: typeof item.itemId === 'string' ? parseInt(item.itemId, 10) : item.itemId,
      name: item.itemName || item.name,
      itemName: item.itemName,
      description: item.itemDescription || item.description || '',
      category: item.equipment?.category || item.category,
      subcategory: item.subType || item.subcategory,
      overallCategory: item.type || item.overallCategory,
    } as GachaItem)),
  }
}

interface UseGachaMachineParams {
  isOpen: boolean
  initialMachineId?: number
}

interface UseGachaMachineReturn {
  // 資料狀態
  machines: GachaMachine[]
  selectedMachine: GachaMachine | null
  isLoading: boolean

  // 搜尋和排序
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortOption: SortOption
  setSortOption: (option: SortOption) => void
  filteredAndSortedItems: GachaItem[]

  // 抽獎模式
  viewMode: ViewMode
  toggleViewMode: () => void
  gachaResults: GachaResult[]
  drawCount: number
  maxDraws: number
  handleDrawOnce: () => void
  handleReset: () => void

  // 選擇和導航
  setSelectedMachine: (machine: GachaMachine | null) => void
  handleEscape: () => void
  handleBackdropClick: () => void

  // 裝備詳情
  selectedEquipment: GachaResult | null
  isDetailsModalOpen: boolean
  handleShowDetails: (item: GachaResult) => void
  closeDetailsModal: () => void
}

export function useGachaMachine({
  isOpen,
  initialMachineId,
}: UseGachaMachineParams): UseGachaMachineReturn {
  const MAX_DRAWS = 100

  // 基本狀態
  const [machines, setMachines] = useState<GachaMachine[]>([])
  const [selectedMachine, setSelectedMachine] = useState<GachaMachine | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('probability-desc')
  const [isLoading, setIsLoading] = useState(false)

  // 抽獎模式狀態
  const [viewMode, setViewMode] = useState<ViewMode>('browse')
  const [gachaResults, setGachaResults] = useState<GachaResult[]>([])
  const [drawCount, setDrawCount] = useState(0)

  // 裝備詳情狀態
  const [selectedEquipment, setSelectedEquipment] = useState<GachaResult | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  // 載入轉蛋機資料
  useEffect(() => {
    if (!isOpen || machines.length > 0) return

    async function loadMachines() {
      setIsLoading(true)
      try {
        clientLogger.info('載入轉蛋機資料（Enhanced JSON）...')

        const [m1, m2, m3, m4, m5, m6, m7] = await Promise.all([
          import('@/../chronostoryData/gacha/machine-1-enhanced.json'),
          import('@/../chronostoryData/gacha/machine-2-enhanced.json'),
          import('@/../chronostoryData/gacha/machine-3-enhanced.json'),
          import('@/../chronostoryData/gacha/machine-4-enhanced.json'),
          import('@/../chronostoryData/gacha/machine-5-enhanced.json'),
          import('@/../chronostoryData/gacha/machine-6-enhanced.json'),
          import('@/../chronostoryData/gacha/machine-7-enhanced.json'),
        ])

        const loadedMachines: GachaMachine[] = [
          normalizeGachaMachine(m1.default),
          normalizeGachaMachine(m2.default),
          normalizeGachaMachine(m3.default),
          normalizeGachaMachine(m4.default),
          normalizeGachaMachine(m5.default),
          normalizeGachaMachine(m6.default),
          normalizeGachaMachine(m7.default),
        ]

        setMachines(loadedMachines)
        clientLogger.info(`成功載入 ${loadedMachines.length} 台轉蛋機（Enhanced 資料）`)
      } catch (error) {
        clientLogger.error('載入轉蛋機資料失敗', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMachines()
  }, [isOpen, machines.length])

  // 關閉時重置狀態
  useEffect(() => {
    if (!isOpen) {
      setSelectedMachine(null)
      setSearchTerm('')
      setSortOption('probability-desc')
      setViewMode('browse')
      setGachaResults([])
      setDrawCount(0)
    }
  }, [isOpen])

  // 自動選擇轉蛋機
  useEffect(() => {
    if (isOpen && initialMachineId !== undefined && machines.length > 0 && !selectedMachine) {
      const targetMachine = machines.find((m) => m.machineId === initialMachineId)
      if (targetMachine) {
        setSelectedMachine(targetMachine)
        clientLogger.info(`自動選擇轉蛋機: ${targetMachine.machineName} (ID: ${initialMachineId})`)
      }
    }
  }, [isOpen, initialMachineId, machines, selectedMachine])

  // 顯示詳情
  const handleShowDetails = useCallback((item: GachaResult) => {
    setSelectedEquipment(item)
    setIsDetailsModalOpen(true)
  }, [])

  const closeDetailsModal = useCallback(() => {
    setIsDetailsModalOpen(false)
  }, [])

  // 抽獎處理
  const handleDrawOnce = useCallback(() => {
    if (!selectedMachine || drawCount >= MAX_DRAWS) return

    const drawnItem = weightedRandomDraw(selectedMachine.items)
    const newDrawCount = drawCount + 1
    const randomStats = calculateRandomStats(drawnItem)

    const result: GachaResult = {
      ...drawnItem,
      drawId: Date.now(),
      randomStats: randomStats ?? undefined
    }

    setGachaResults(prev => [result, ...prev])
    setDrawCount(newDrawCount)

    if (randomStats) {
      clientLogger.debug(`抽取裝備 ${drawnItem.chineseName}，隨機屬性已計算`, { randomStats })
    }
  }, [selectedMachine, drawCount])

  const handleReset = useCallback(() => {
    setGachaResults([])
    setDrawCount(0)
  }, [])

  const toggleViewMode = useCallback(() => {
    if (viewMode === 'gacha') {
      handleReset()
    }
    setViewMode(prev => prev === 'browse' ? 'gacha' : 'browse')
  }, [viewMode, handleReset])

  // 導航處理
  const handleEscape = useCallback(() => {
    if (initialMachineId !== undefined) {
      // 由外部 onClose 處理
    } else if (selectedMachine) {
      setSelectedMachine(null)
    }
    // 由外部 onClose 處理
  }, [initialMachineId, selectedMachine])

  const handleBackdropClick = useCallback(() => {
    if (initialMachineId !== undefined) {
      // 由外部 onClose 處理
    } else if (selectedMachine) {
      setSelectedMachine(null)
    }
    // 由外部 onClose 處理
  }, [initialMachineId, selectedMachine])

  // 篩選和排序
  const filteredAndSortedItems = useMemo(() => {
    if (!selectedMachine) return []

    let items = selectedMachine.items

    if (searchTerm.trim()) {
      const keywords = searchTerm.toLowerCase().trim().split(/\s+/)
      items = items.filter((item) => {
        const searchText = `${item.chineseName} ${item.name}`.toLowerCase()
        return keywords.every((keyword) => searchText.includes(keyword))
      })
    }

    const sorted = [...items]
    switch (sortOption) {
      case 'probability-desc':
        sorted.sort((a, b) => b.chance - a.chance)
        break
      case 'probability-asc':
        sorted.sort((a, b) => a.chance - b.chance)
        break
      case 'level-desc':
        sorted.sort((a, b) => (b.requiredStats?.level || 0) - (a.requiredStats?.level || 0))
        break
      case 'level-asc':
        sorted.sort((a, b) => (a.requiredStats?.level || 0) - (b.requiredStats?.level || 0))
        break
      case 'name-asc':
        sorted.sort((a, b) => a.chineseName.localeCompare(b.chineseName, 'zh-TW'))
        break
    }

    return sorted
  }, [selectedMachine, searchTerm, sortOption])

  // 監聽空白鍵抽獎
  useEffect(() => {
    if (!isOpen || viewMode !== 'gacha' || !selectedMachine) return

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        e.stopPropagation()
        handleDrawOnce()
      }
    }

    document.addEventListener('keyup', handleKeyUp, { capture: true })
    return () => document.removeEventListener('keyup', handleKeyUp, { capture: true })
  }, [isOpen, viewMode, selectedMachine, handleDrawOnce])

  return {
    machines,
    selectedMachine,
    isLoading,
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    filteredAndSortedItems,
    viewMode,
    toggleViewMode,
    gachaResults,
    drawCount,
    maxDraws: MAX_DRAWS,
    handleDrawOnce,
    handleReset,
    setSelectedMachine,
    handleEscape,
    handleBackdropClick,
    selectedEquipment,
    isDetailsModalOpen,
    handleShowDetails,
    closeDetailsModal,
  }
}
