'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 商人商店地圖靜態資料（來自 data/drops-100-percent.json）
 */
const MERCHANT_MAPS = [
  { id: 'kerning-swamp-2', zhName: '墮落城市：沼澤地<2>', enName: 'Kerning City Swamp', region: 'Kerning City' },
  { id: 'ellinia-forest-3', zhName: '魔法森林：大木林<3>', enName: 'Ellinia Forest', region: 'Ellinia' },
  { id: 'orbis-tower-4', zhName: '天空之城塔<4層>', enName: 'Orbis Tower 4F', region: 'Orbis' },
] as const

interface MerchantShopDropdownProps {
  /** 是否處於商人商店模式 */
  isMerchantMode: boolean
  /** 選中的地圖 ID（null = 全部） */
  selectedMapId: string | null
  /** 選擇地圖的回調 */
  onSelect: (mapId: string | null) => void
  /** 關閉商人商店模式的回調 */
  onClose: () => void
}

/**
 * 商人商店下拉選單元件
 * 用於選擇商人商店地圖，選擇後在主頁面顯示該地圖的 100% 掉落物品
 */
export function MerchantShopDropdown({
  isMerchantMode,
  selectedMapId,
  onSelect,
  onClose,
}: MerchantShopDropdownProps) {
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
    if (!isMerchantMode) {
      return t('merchant.button')
    }
    if (selectedMapId === null) {
      return t('merchant.viewAll')
    }
    const map = MERCHANT_MAPS.find(m => m.id === selectedMapId)
    return language === 'zh-TW' ? map?.zhName ?? '' : map?.enName ?? ''
  }

  const handleSelectAll = () => {
    onSelect(null)
    setIsOpen(false)
  }

  const handleSelectMap = (mapId: string) => {
    onSelect(mapId)
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
            isMerchantMode
              ? 'bg-stone-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
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
        <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* 全部商人商店選項 */}
          <button
            onClick={handleSelectAll}
            className={`w-full px-4 py-2 text-left text-sm transition-colors ${
              isMerchantMode && selectedMapId === null
                ? 'bg-stone-100 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300'
                : 'hover:bg-stone-50 dark:hover:bg-stone-900/20 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('merchant.viewAll')}
          </button>

          {/* 分隔線 */}
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

          {/* 地圖列表 */}
          {MERCHANT_MAPS.map((map) => (
            <button
              key={map.id}
              onClick={() => handleSelectMap(map.id)}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                isMerchantMode && selectedMapId === map.id
                  ? 'bg-stone-100 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300'
                  : 'hover:bg-stone-50 dark:hover:bg-stone-900/20 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex flex-col">
                <span>{language === 'zh-TW' ? map.zhName : map.enName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{map.region}</span>
              </div>
            </button>
          ))}

          {/* 關閉商人商店選項（只在商人模式啟用時顯示） */}
          {isMerchantMode && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                {t('merchant.close')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
