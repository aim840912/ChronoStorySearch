'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 轉蛋機靜態資料（來自 chronostoryData/gacha/）
 */
const GACHA_MACHINES = [
  { id: 1, zhName: '維多利亞港', enName: 'Lith Harbor' },
  { id: 2, zhName: '弓箭手村', enName: 'Henesys' },
  { id: 3, zhName: '勇士部落', enName: 'Perion' },
  { id: 4, zhName: '墮落城市', enName: 'Kerning City' },
  { id: 5, zhName: '魔法森林', enName: 'Ellinia' },
  { id: 6, zhName: '鯨魚號', enName: 'Nautilus' },
  { id: 7, zhName: '卷軸轉蛋', enName: 'All Towns' },
  { id: 8, zhName: '地球防衛本部', enName: 'Omega Sector' },
] as const

interface GachaDropdownProps {
  /** 是否處於轉蛋模式 */
  isGachaMode: boolean
  /** 選中的轉蛋機 ID（null = 全部） */
  selectedMachineId: number | null
  /** 選擇轉蛋機的回調 */
  onSelect: (machineId: number | null) => void
  /** 關閉轉蛋模式的回調 */
  onClose: () => void
}

/**
 * 轉蛋下拉選單元件
 * 用於選擇轉蛋機地圖，選擇後在主頁面卡片區域顯示內容
 */
export function GachaDropdown({
  isGachaMode,
  selectedMachineId,
  onSelect,
  onClose,
}: GachaDropdownProps) {
  const { t, language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 獲取當前顯示的按鈕文字
  const getButtonText = (): string => {
    if (!isGachaMode) {
      return t('search.type.gacha')
    }
    if (selectedMachineId === null) {
      return t('gacha.viewAll')
    }
    const machine = GACHA_MACHINES.find(m => m.id === selectedMachineId)
    return language === 'zh-TW' ? machine?.zhName ?? '' : machine?.enName ?? ''
  }

  const handleSelectAll = () => {
    onSelect(null)
    setIsOpen(false)
  }

  const handleSelectMachine = (machineId: number) => {
    onSelect(machineId)
    setIsOpen(false)
  }

  const handleClose = () => {
    onClose()
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 容器樣式與 FilterTabs 一致 */}
      <div className="rounded-xl bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm p-1.5">
        {/* 主按鈕 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
            isGachaMode
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
        >
        {getButtonText()}
        {/* 下拉箭頭 */}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        </button>
      </div>

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* 全部轉蛋機選項 */}
          <button
            onClick={handleSelectAll}
            className={`w-full px-4 py-2 text-left text-sm transition-colors ${
              isGachaMode && selectedMachineId === null
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('gacha.viewAll')}
          </button>

          {/* 分隔線 */}
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

          {/* 轉蛋機列表 */}
          {GACHA_MACHINES.map((machine) => (
            <button
              key={machine.id}
              onClick={() => handleSelectMachine(machine.id)}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                isGachaMode && selectedMachineId === machine.id
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300'
              }`}
            >
              {language === 'zh-TW' ? machine.zhName : machine.enName}
            </button>
          ))}

          {/* 關閉轉蛋選項（只在轉蛋模式啟用時顯示） */}
          {isGachaMode && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                {t('gacha.close')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
