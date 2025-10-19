'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { GachaMachine, GachaItem } from '@/types'
import { getItemImageUrl } from '@/lib/image-utils'
import { clientLogger } from '@/lib/logger'

interface GachaMachineModalProps {
  isOpen: boolean
  onClose: () => void
  initialMachineId?: number
}

type SortOption = 'probability-desc' | 'probability-asc' | 'level-desc' | 'level-asc' | 'name-asc'

/**
 * 轉蛋機圖鑑 Modal
 * 顯示 7 台轉蛋機及其內容物
 */
export function GachaMachineModal({ isOpen, onClose, initialMachineId }: GachaMachineModalProps) {
  const { language, t, setLanguage } = useLanguage()
  const [machines, setMachines] = useState<GachaMachine[]>([])
  const [selectedMachine, setSelectedMachine] = useState<GachaMachine | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('probability-desc')
  const [isLoading, setIsLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

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
        clientLogger.info('載入轉蛋機資料（靜態 import）...')

        // 使用動態 import 載入所有轉蛋機資料（不產生 API 請求）
        const [m1, m2, m3, m4, m5, m6, m7] = await Promise.all([
          import('@/../data/gacha/machine-1.json'),
          import('@/../data/gacha/machine-2.json'),
          import('@/../data/gacha/machine-3.json'),
          import('@/../data/gacha/machine-4.json'),
          import('@/../data/gacha/machine-5.json'),
          import('@/../data/gacha/machine-6.json'),
          import('@/../data/gacha/machine-7.json'),
        ])

        const loadedMachines: GachaMachine[] = [
          m1.default as unknown as GachaMachine,
          m2.default as unknown as GachaMachine,
          m3.default as unknown as GachaMachine,
          m4.default as unknown as GachaMachine,
          m5.default as unknown as GachaMachine,
          m6.default as unknown as GachaMachine,
          m7.default as unknown as GachaMachine,
        ]

        setMachines(loadedMachines)
        clientLogger.info(`成功載入 ${loadedMachines.length} 台轉蛋機（靜態資料）`)
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
    }
  }, [isOpen])

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
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 p-6 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedMachine
                    ? (language === 'zh-TW' && selectedMachine.chineseMachineName
                        ? selectedMachine.chineseMachineName
                        : selectedMachine.machineName)
                    : t('gacha.title')}
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {selectedMachine
                    ? `${t('gacha.total')} ${selectedMachine.totalItems} ${t('gacha.itemCount')}`
                    : `${t('gacha.total')} ${machines.length} ${t('gacha.machineCount')}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 語言切換按鈕 */}
              <button
                onClick={toggleLanguage}
                className="p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30"
                aria-label={t('language.toggle')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30"
                aria-label={t('modal.share')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label={initialMachineId !== undefined ? t('gacha.close') : (selectedMachine ? t('gacha.back') : t('gacha.close'))}
              >
              {selectedMachine && initialMachineId === undefined ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading')}</p>
            </div>
          ) : selectedMachine ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAndSortedItems.map((item, index) => (
                    <ItemCard key={`${item.itemId}-${index}`} item={item} language={language} />
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
            /* 轉蛋機列表 */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

/**
 * 轉蛋機卡片元件
 */
function MachineCard({
  machine,
  onClick,
  language,
}: {
  machine: GachaMachine
  onClick: () => void
  language: 'zh-TW' | 'en'
}) {
  // 根據語言選擇顯示名稱
  const displayName = language === 'zh-TW' && machine.chineseMachineName
    ? machine.chineseMachineName
    : machine.machineName

  return (
    <button
      onClick={onClick}
      className="group p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-purple-400 hover:shadow-lg transition-all duration-300 text-left w-full"
    >
      <div className="flex-1">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-purple-400 transition-colors">
          {displayName}
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
            {machine.totalItems} {language === 'zh-TW' ? '件' : 'items'}
          </span>
        </div>
      </div>
    </button>
  )
}

/**
 * 物品卡片元件
 */
function ItemCard({ item, language }: { item: GachaItem; language: 'zh-TW' | 'en' }) {
  // 根據語言選擇顯示名稱
  const displayName = language === 'zh-TW' ? item.chineseName : (item.name || item.itemName || item.chineseName)

  // 物品圖示 URL
  const itemIconUrl = getItemImageUrl(item.itemId)

  return (
    <div className="p-4 bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all">
      <div className="flex gap-3">
        {/* 物品圖示 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={itemIconUrl}
          alt={displayName}
          className="w-12 h-12 object-contain flex-shrink-0"
        />

        <div className="flex justify-between items-start flex-1">
          {/* 物品名稱 */}
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 dark:text-white">{displayName}</h4>
          </div>

          {/* 機率 */}
          <div className="text-right ml-2">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {item.probability}
            </div>
          </div>
        </div>
      </div>

      {/* 等級標籤 */}
      {item.requiredStats?.level && item.requiredStats.level > 0 && (
        <div className="mt-2">
          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
            Lv.{item.requiredStats.level}
          </span>
        </div>
      )}
    </div>
  )
}
