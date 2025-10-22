'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { GachaMachine, GachaItem, EnhancedGachaItem } from '@/types'
import { clientLogger } from '@/lib/logger'
import { weightedRandomDraw } from '@/lib/gacha-utils'
import { MachineCard } from '@/components/gacha/MachineCard'
import { GachaItemCard } from '@/components/gacha/GachaItemCard'
import { GachaDrawControl } from '@/components/gacha/GachaDrawControl'
import { GachaResultsGrid } from '@/components/gacha/GachaResultsGrid'

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
 * 將 Enhanced JSON 的欄位映射到 GachaMachine 型別
 */
function normalizeGachaMachine(rawData: EnhancedGachaMachineRaw): GachaMachine {
  return {
    ...rawData,
    items: rawData.items.map((item) => ({
      // 先展開所有原始欄位
      ...item,

      // 然後覆蓋需要特殊處理的欄位（順序很重要！）
      // 轉蛋機特有欄位
      chineseName: item.chineseName,
      probability: item.probability,
      chance: item.chance,

      // itemId: string → number（關鍵轉換，必須在 ...item 之後）
      itemId: typeof item.itemId === 'string' ? parseInt(item.itemId, 10) : item.itemId,

      // 映射欄位以相容現有型別定義
      name: item.itemName || item.name,
      itemName: item.itemName,
      description: item.itemDescription || item.description || '',

      // 從 equipment.category 映射到 category（如果存在）
      category: item.equipment?.category || item.category,
      subcategory: item.subType || item.subcategory,
      overallCategory: item.type || item.overallCategory,
    } as GachaItem)),
  }
}

interface GachaMachineModalProps {
  isOpen: boolean
  onClose: () => void
  initialMachineId?: number
  onItemClick?: (itemId: number, itemName: string) => void
  // 導航相關 props
  hasPreviousModal?: boolean
  onGoBack?: () => void
}

type SortOption = 'probability-desc' | 'probability-asc' | 'level-desc' | 'level-asc' | 'name-asc'
type ViewMode = 'browse' | 'gacha'

/**
 * 轉蛋機圖鑑 Modal
 * 顯示 7 台轉蛋機及其內容物
 */
export function GachaMachineModal({ isOpen, onClose, initialMachineId, onItemClick, hasPreviousModal, onGoBack }: GachaMachineModalProps) {
  const { language, t, setLanguage } = useLanguage()
  const [machines, setMachines] = useState<GachaMachine[]>([])
  const [selectedMachine, setSelectedMachine] = useState<GachaMachine | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('probability-desc')
  const [isLoading, setIsLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // 抽獎模式相關狀態
  const [viewMode, setViewMode] = useState<ViewMode>('browse')
  // 為每次抽取添加唯一 ID，避免相同物品的圖片重複載入
  const [gachaResults, setGachaResults] = useState<Array<GachaItem & { drawId: number }>>([])
  const [drawCount, setDrawCount] = useState(0)
  const MAX_DRAWS = 100

  // 語言切換函數
  const toggleLanguage = () => {
    const newLanguage: 'zh-TW' | 'en' = language === 'zh-TW' ? 'en' : 'zh-TW'
    setLanguage(newLanguage)
  }

  // 分享功能 - 複製連結到剪貼簿
  const handleShare = async () => {
    try {
      // 根據當前狀態生成 URL
      const machineId = selectedMachine?.machineId || initialMachineId
      const urlParam = machineId !== undefined ? `gacha=${machineId}` : 'gacha=list'
      const url = `${window.location.origin}${window.location.pathname}?${urlParam}`

      await navigator.clipboard.writeText(url)
      setToastMessage(t('modal.linkCopied'))
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (error) {
      clientLogger.error('複製連結失敗', error)
      setToastMessage(t('modal.copyFailed'))
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  // 載入所有轉蛋機資料
  // 優化：使用動態 import 而非 API 呼叫，完全消除 Edge Requests
  useEffect(() => {
    if (!isOpen || machines.length > 0) return

    async function loadMachines() {
      setIsLoading(true)
      try {
        clientLogger.info('載入轉蛋機資料（Enhanced JSON）...')

        // 使用動態 import 載入所有轉蛋機資料（Enhanced 版本，包含完整物品資料）
        const [m1, m2, m3, m4, m5, m6, m7] = await Promise.all([
          import('@/../data/gacha/machine-1-enhanced.json'),
          import('@/../data/gacha/machine-2-enhanced.json'),
          import('@/../data/gacha/machine-3-enhanced.json'),
          import('@/../data/gacha/machine-4-enhanced.json'),
          import('@/../data/gacha/machine-5-enhanced.json'),
          import('@/../data/gacha/machine-6-enhanced.json'),
          import('@/../data/gacha/machine-7-enhanced.json'),
        ])

        // 正規化資料格式以符合 GachaMachine 型別
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

  // 關閉 Modal 時重置狀態
  useEffect(() => {
    if (!isOpen) {
      setSelectedMachine(null)
      setSearchTerm('')
      setSortOption('probability-desc')
      // 重置抽獎狀態
      setViewMode('browse')
      setGachaResults([])
      setDrawCount(0)
    }
  }, [isOpen])

  // 抽獎處理函數
  const handleDrawOnce = () => {
    if (!selectedMachine || drawCount >= MAX_DRAWS) return

    const drawnItem = weightedRandomDraw(selectedMachine.items)
    const newDrawCount = drawCount + 1
    // 為每次抽取添加唯一 ID，確保 React 不會重新創建相同物品的 DOM 元素
    setGachaResults(prev => [{ ...drawnItem, drawId: newDrawCount }, ...prev]) // 新結果添加到頂部
    setDrawCount(newDrawCount)
  }

  // 重置抽獎結果
  const handleReset = () => {
    setGachaResults([])
    setDrawCount(0)
  }

  // 切換查看/抽獎模式
  const toggleViewMode = () => {
    if (viewMode === 'gacha') {
      // 切換回查看模式時，重置抽獎結果
      handleReset()
    }
    setViewMode(prev => prev === 'browse' ? 'gacha' : 'browse')
  }

  // 當有 initialMachineId 時，自動選擇對應的轉蛋機
  useEffect(() => {
    if (isOpen && initialMachineId !== undefined && machines.length > 0 && !selectedMachine) {
      const targetMachine = machines.find((m) => m.machineId === initialMachineId)
      if (targetMachine) {
        setSelectedMachine(targetMachine)
        clientLogger.info(`自動選擇轉蛋機: ${targetMachine.machineName} (ID: ${initialMachineId})`)
      }
    }
  }, [isOpen, initialMachineId, machines, selectedMachine])

  // ESC 鍵關閉 Modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 如果是通過 initialMachineId 自動選擇的，直接關閉整個 modal
        if (initialMachineId !== undefined) {
          onClose()
        } else if (selectedMachine) {
          // 手動選擇的情況：返回轉蛋機列表
          setSelectedMachine(null)
        } else {
          onClose()
        }
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, selectedMachine, onClose, initialMachineId])

  // 篩選和排序物品
  const filteredAndSortedItems = useMemo(() => {
    if (!selectedMachine) return []

    let items = selectedMachine.items

    // 搜尋過濾
    if (searchTerm.trim()) {
      const keywords = searchTerm.toLowerCase().trim().split(/\s+/)
      items = items.filter((item) => {
        const searchText = `${item.chineseName} ${item.name}`.toLowerCase()
        return keywords.every((keyword) => searchText.includes(keyword))
      })
    }

    // 排序
    const sorted = [...items]
    switch (sortOption) {
      case 'probability-desc':
        sorted.sort((a, b) => b.chance - a.chance)
        break
      case 'probability-asc':
        sorted.sort((a, b) => a.chance - b.chance)
        break
      case 'level-desc':
        sorted.sort(
          (a, b) => (b.requiredStats?.level || 0) - (a.requiredStats?.level || 0)
        )
        break
      case 'level-asc':
        sorted.sort(
          (a, b) => (a.requiredStats?.level || 0) - (b.requiredStats?.level || 0)
        )
        break
      case 'name-asc':
        sorted.sort((a, b) => a.chineseName.localeCompare(b.chineseName, 'zh-TW'))
        break
    }

    return sorted
  }, [selectedMachine, searchTerm, sortOption])

  if (!isOpen) return null

  const handleBackdropClick = () => {
    // 如果是通過 initialMachineId 自動選擇的，直接關閉整個 modal
    if (initialMachineId !== undefined) {
      onClose()
    } else if (selectedMachine) {
      // 手動選擇的情況：返回轉蛋機列表
      setSelectedMachine(null)
    } else {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-purple-500 dark:bg-purple-600 p-4 sm:p-6 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center">
              {hasPreviousModal && onGoBack && (
                <button
                  onClick={onGoBack}
                  className="p-3 min-h-[44px] rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30 flex items-center gap-2"
                  aria-label={t('modal.goBack')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm font-medium hidden sm:inline">{t('modal.goBack')}</span>
                </button>
              )}
            </div>
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {selectedMachine
                  ? (language === 'zh-TW' && selectedMachine.chineseMachineName
                      ? selectedMachine.chineseMachineName
                      : selectedMachine.machineName)
                  : t('gacha.title')}
              </h2>
              <p className="text-purple-100 text-xs sm:text-sm mt-1">
                {selectedMachine
                  ? `${t('gacha.total')} ${selectedMachine.totalItems} ${t('gacha.itemCount')}`
                  : `${t('gacha.total')} ${machines.length} ${t('gacha.machineCount')}`}
              </p>
            </div>
            <div className="flex-1 flex items-center gap-2 justify-end">
              {/* 模式切換按鈕（只在選中轉蛋機時顯示） */}
              {selectedMachine && (
                <button
                  onClick={toggleViewMode}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-all duration-200 bg-white/20 hover:bg-white/30 text-white border border-white/30 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2"
                  aria-label={viewMode === 'browse' ? t('gacha.gachaMode') : t('gacha.browseMode')}
                >
                  {viewMode === 'browse' ? (
                    <>
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      {t('gacha.gachaMode')}
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      {t('gacha.browseMode')}
                    </>
                  )}
                </button>
              )}
              {/* 語言切換按鈕 */}
              <button
                onClick={toggleLanguage}
                className="p-2 sm:p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30"
                aria-label={t('language.toggle')}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              {/* 分享按鈕 */}
              <button
                onClick={handleShare}
                className="p-2 sm:p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30"
                aria-label={t('modal.share')}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
              {/* 關閉按鈕 */}
              <button
                onClick={() => {
                  // 如果是通過 initialMachineId 自動選擇的，直接關閉整個 modal
                  if (initialMachineId !== undefined) {
                    onClose()
                  } else if (selectedMachine) {
                    // 手動選擇的情況：返回轉蛋機列表
                    setSelectedMachine(null)
                  } else {
                    onClose()
                  }
                }}
                className="text-white hover:bg-white/20 rounded-full p-2 sm:p-2 transition-colors"
                aria-label={initialMachineId !== undefined ? t('gacha.close') : (selectedMachine ? t('gacha.back') : t('gacha.close'))}
              >
              {selectedMachine && initialMachineId === undefined ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading')}</p>
            </div>
          ) : selectedMachine ? (
            <>
              {viewMode === 'browse' ? (
                <>
                  {/* 搜尋和排序控制 */}
                  <div className="mb-6 space-y-4">
                    {/* 搜尋框 */}
                    <input
                      type="text"
                      placeholder={t('gacha.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* 排序選項 */}
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as SortOption)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="probability-desc">{t('gacha.sortProbabilityDesc')}</option>
                        <option value="probability-asc">{t('gacha.sortProbabilityAsc')}</option>
                        <option value="level-desc">{t('gacha.sortLevelDesc')}</option>
                        <option value="level-asc">{t('gacha.sortLevelAsc')}</option>
                        <option value="name-asc">{t('gacha.sortNameAsc')}</option>
                      </select>

                      <div className="flex-1 text-right text-sm text-gray-500 dark:text-gray-400 flex items-center justify-end">
                        {t('gacha.showing')} {filteredAndSortedItems.length} {t('gacha.of')} {selectedMachine.totalItems} {t('gacha.items')}
                      </div>
                    </div>
                  </div>

                  {/* 物品列表 */}
                  {filteredAndSortedItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {filteredAndSortedItems.map((item, index) => (
                        <GachaItemCard
                          key={`${item.itemId}-${index}`}
                          item={item}
                          language={language}
                          onItemClick={onItemClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🔍</div>
                      <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                        {t('gacha.noResults')}
                      </p>
                      <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                        {t('gacha.tryOtherKeywords')}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* 抽獎模式 */
                <div className="space-y-6">
                  {/* 抽獎控制區 */}
                  <GachaDrawControl
                    drawCount={drawCount}
                    maxDraws={MAX_DRAWS}
                    onDrawOnce={handleDrawOnce}
                    onReset={handleReset}
                    t={t}
                  />

                  {/* 抽獎結果列表 */}
                  <GachaResultsGrid results={gachaResults} t={t} />
                </div>
              )}
            </>
          ) : (
            /* 轉蛋機列表 */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {machines.map((machine) => (
                <MachineCard
                  key={machine.machineId}
                  machine={machine}
                  onClick={() => setSelectedMachine(machine)}
                  language={language}
                />
              ))}
            </div>
          )}
        </div>

        {/* Toast 通知 */}
        {showToast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-60 animate-fade-in">
            <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-medium">{toastMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
