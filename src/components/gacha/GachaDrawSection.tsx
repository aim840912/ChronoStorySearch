'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { GachaMachine, GachaResult, GachaItem } from '@/types'
import { GachaDrawControl } from './GachaDrawControl'
import { GachaResultsGrid } from './GachaResultsGrid'
import { GachaResultsList } from './GachaResultsList'
import { GachaItemsGrid } from './GachaItemsGrid'
import { EquipmentDetailsModal } from './EquipmentDetailsModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { weightedRandomDraw } from '@/lib/gacha-utils'
import { calculateRandomStats } from '@/lib/random-equipment-stats'
import { clientLogger } from '@/lib/logger'
import { MultiplexAd } from '@/components/adsense'

type ViewMode = 'grid' | 'list'
type SectionMode = 'browse' | 'gacha'

interface GachaDrawSectionProps {
  machineId: number
  gachaMachines: GachaMachine[]
  onClose: () => void
  /** 點擊物品時的回調（瀏覽模式） */
  onItemClick?: (itemId: number, itemName: string) => void
}

/**
 * 轉蛋抽獎區域元件
 * 顯示在 SearchHeader 和 ContentDisplay 之間
 */
export function GachaDrawSection({
  machineId,
  gachaMachines,
  onClose,
  onItemClick,
}: GachaDrawSectionProps) {
  const { t, language } = useLanguage()
  const MAX_DRAWS = 100

  // 找到對應的轉蛋機
  const selectedMachine = useMemo(() => {
    return gachaMachines.find(m => m.machineId === machineId) || null
  }, [gachaMachines, machineId])

  // 抽獎狀態
  const [gachaResults, setGachaResults] = useState<GachaResult[]>([])
  const [drawCount, setDrawCount] = useState(0)

  // 區域模式（瀏覽 vs 抽獎）
  const [sectionMode, setSectionMode] = useState<SectionMode>('browse')

  // 視圖模式（抽獎結果的顯示方式）
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // 裝備詳情 Modal 狀態
  const [selectedEquipment, setSelectedEquipment] = useState<GachaResult | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  // 抽獎處理
  const handleDrawOnce = useCallback(() => {
    if (!selectedMachine || drawCount >= MAX_DRAWS) return

    const drawnItem = weightedRandomDraw(selectedMachine.items)
    const newDrawCount = drawCount + 1
    const randomStats = calculateRandomStats(drawnItem)

    const result: GachaResult = {
      ...drawnItem,
      drawId: Date.now(),
      randomStats: randomStats ?? undefined,
    }

    setGachaResults(prev => [result, ...prev])
    setDrawCount(newDrawCount)

    if (randomStats) {
      clientLogger.debug(`抽取裝備 ${drawnItem.chineseName}，隨機屬性已計算`, { randomStats })
    }
  }, [selectedMachine, drawCount])

  // 重置抽獎
  const handleReset = useCallback(() => {
    setGachaResults([])
    setDrawCount(0)
  }, [])

  // 顯示裝備詳情（抽獎結果）
  const handleShowDetails = useCallback((item: GachaResult) => {
    setSelectedEquipment(item)
    setIsDetailsModalOpen(true)
  }, [])

  // 顯示物品詳情（瀏覽模式 - 打開 ItemModal）
  const handleBrowseItemClick = useCallback((item: GachaItem) => {
    if (onItemClick) {
      const itemName = item.name || item.itemName || ''
      onItemClick(item.itemId, itemName)
    }
  }, [onItemClick])

  // 關閉裝備詳情
  const closeDetailsModal = useCallback(() => {
    setIsDetailsModalOpen(false)
  }, [])

  // 監聽空白鍵抽獎（僅在抽獎模式下）
  useEffect(() => {
    if (!selectedMachine || sectionMode !== 'gacha') return

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        e.stopPropagation()
        handleDrawOnce()
      }
    }

    document.addEventListener('keyup', handleKeyUp, { capture: true })
    return () => document.removeEventListener('keyup', handleKeyUp, { capture: true })
  }, [selectedMachine, handleDrawOnce, sectionMode])

  // 如果找不到轉蛋機
  if (!selectedMachine) {
    return (
      <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <p className="text-center text-gray-500 dark:text-gray-400">
          {t('gacha.machineNotFound')}
        </p>
      </div>
    )
  }

  const machineName = language === 'zh-TW'
    ? (selectedMachine.chineseMachineName || selectedMachine.machineName)
    : selectedMachine.machineName

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {machineName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedMachine.totalItems} {t('gacha.items')}
            </p>
        </div>

        {/* 關閉按鈕 */}
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label={t('common.close')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 模式切換按鈕 */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 p-1">
          <button
            onClick={() => setSectionMode('browse')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              sectionMode === 'browse'
                ? 'bg-purple-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t('gacha.browseMode')}
          </button>
          <button
            onClick={() => setSectionMode('gacha')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              sectionMode === 'gacha'
                ? 'bg-purple-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t('gacha.drawMode')}
          </button>
        </div>
      </div>

      {/* 內容區域 - 根據模式顯示不同內容 */}
      {sectionMode === 'browse' ? (
        /* 瀏覽模式：顯示所有物品 */
        <div className="px-6 py-4">
          <GachaItemsGrid
            items={selectedMachine.items}
            onItemClick={handleBrowseItemClick}
          />
          <MultiplexAd />
        </div>
      ) : (
        /* 抽獎模式：顯示抽獎控制和結果 */
        <>
          {/* 抽獎控制區 */}
          <div className="px-6 py-4">
            <GachaDrawControl
              drawCount={drawCount}
              maxDraws={MAX_DRAWS}
              onDrawOnce={handleDrawOnce}
              onReset={handleReset}
              t={t}
            />
          </div>

          {/* 視圖切換和結果區 */}
          <div className="px-6 pb-6">
            {/* 視圖切換按鈕 */}
            {gachaResults.length > 0 && (
              <div className="flex justify-end mb-4">
                <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-purple-500 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    aria-label={t('gacha.gridView')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-purple-500 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    aria-label={t('gacha.listView')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* 結果顯示 */}
            {viewMode === 'grid' ? (
              <GachaResultsGrid
                results={gachaResults}
                t={t}
                onShowDetails={handleShowDetails}
              />
            ) : (
              <GachaResultsList
                results={gachaResults}
                onShowDetails={handleShowDetails}
              />
            )}

            {/* 抽獎結果底部廣告 */}
            {gachaResults.length > 0 && <MultiplexAd />}
          </div>
        </>
      )}

      {/* 裝備詳情 Modal */}
      {selectedEquipment && (
        <EquipmentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={closeDetailsModal}
          equipment={selectedEquipment}
        />
      )}
    </div>
  )
}
