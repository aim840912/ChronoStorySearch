'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

export type PageMode = 'search' | 'trade' | 'report'

interface ModeOption {
  id: PageMode
  labelKey: string
  icon: React.ReactNode
  activeColor: string
}

interface ModeDropdownProps {
  currentMode: PageMode
  onModeChange: (mode: PageMode) => void
  isAdmin: boolean
  isLoggedIn: boolean
}

/**
 * 模式切換下拉選單
 * 整合搜尋、交易、檢舉三種模式的切換
 */
export function ModeDropdown({
  currentMode,
  onModeChange,
  isAdmin,
  isLoggedIn,
}: ModeDropdownProps) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 模式配置
  const modes: ModeOption[] = [
    {
      id: 'search',
      labelKey: 'mode.search',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      activeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    },
    {
      id: 'trade',
      labelKey: 'mode.trade',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      activeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    },
    {
      id: 'report',
      labelKey: 'mode.report',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      ),
      activeColor: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    },
  ]

  // 根據權限過濾可見的模式
  const visibleModes = modes.filter((mode) => {
    if (mode.id === 'search') return true
    if (mode.id === 'trade') return isLoggedIn
    if (mode.id === 'report') return isAdmin
    return false
  })

  // 取得當前模式資訊
  const currentModeInfo = modes.find((m) => m.id === currentMode) || modes[0]

  // 點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // 選擇模式
  const handleSelect = useCallback((mode: PageMode) => {
    if (mode !== currentMode) {
      onModeChange(mode)
    }
    setIsOpen(false)
  }, [currentMode, onModeChange])

  // 如果只有一個選項（未登入），不顯示下拉功能
  if (visibleModes.length <= 1) {
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg ${currentModeInfo.activeColor}`}>
        {currentModeInfo.icon}
        <span>{t(currentModeInfo.labelKey)}</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 觸發按鈕 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${currentModeInfo.activeColor}`}
      >
        {currentModeInfo.icon}
        <span>{t(currentModeInfo.labelKey)}</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[120px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {visibleModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleSelect(mode.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
                ${mode.id === currentMode
                  ? mode.activeColor
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              {mode.icon}
              <span>{t(mode.labelKey)}</span>
              {mode.id === currentMode && (
                <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
