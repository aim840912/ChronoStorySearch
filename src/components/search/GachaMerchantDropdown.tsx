'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 轉蛋機靜態資料
 */
const GACHA_MACHINES = [
  { id: 1, zhName: '維多利亞港', enName: 'Lith Harbor' },
  { id: 2, zhName: '弓箭手村', enName: 'Henesys' },
  { id: 3, zhName: '勇士部落', enName: 'Perion' },
  { id: 4, zhName: '墮落城市', enName: 'Kerning City' },
  { id: 5, zhName: '魔法森林', enName: 'Ellinia' },
  { id: 6, zhName: '鯨魚號', enName: 'Nautilus' },
  { id: 7, zhName: '卷軸轉蛋', enName: 'All Towns' },
] as const

/**
 * 商人商店地圖靜態資料
 */
const MERCHANT_MAPS = [
  { id: 'kerning-swamp-2', zhName: '墮落城市：沼澤地<2>', enName: 'Kerning City Swamp', region: 'Kerning City' },
  { id: 'ellinia-forest-3', zhName: '魔法森林：大木林<3>', enName: 'Ellinia Forest', region: 'Ellinia' },
  { id: 'orbis-tower-4', zhName: '天空之城塔<4層>', enName: 'Orbis Tower 4F', region: 'Orbis' },
] as const

interface GachaMerchantDropdownProps {
  isGachaMode: boolean
  selectedGachaMachineId: number | null
  onGachaSelect: (machineId: number | null) => void
  onGachaClose: () => void
  isMerchantMode: boolean
  selectedMerchantMapId: string | null
  onMerchantSelect: (mapId: string | null) => void
  onMerchantClose: () => void
}

/**
 * 轉蛋+商人合併下拉選單
 * 用於 <768px 時替代獨立的 GachaDropdown 和 MerchantShopDropdown
 */
export function GachaMerchantDropdown({
  isGachaMode,
  selectedGachaMachineId,
  onGachaSelect,
  onGachaClose,
  isMerchantMode,
  selectedMerchantMapId,
  onMerchantSelect,
  onMerchantClose,
}: GachaMerchantDropdownProps) {
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

  // 獲取按鈕顯示文字（>=462px 用，中文取前兩字）
  const getShortName = (): string => {
    if (isGachaMode && selectedGachaMachineId !== null) {
      const machine = GACHA_MACHINES.find(m => m.id === selectedGachaMachineId)
      const name = language === 'zh-TW' ? machine?.zhName ?? '' : machine?.enName ?? ''
      return language === 'zh-TW' ? name.slice(0, 2) : name
    }
    if (isMerchantMode && selectedMerchantMapId !== null) {
      const map = MERCHANT_MAPS.find(m => m.id === selectedMerchantMapId)
      const name = language === 'zh-TW' ? map?.zhName ?? '' : map?.enName ?? ''
      return language === 'zh-TW' ? name.slice(0, 2) : name
    }
    return ''
  }

  // 獲取按鈕顯示文字（<=461px 用，中文取第一字）
  const getSingleChar = (): string => {
    if (isGachaMode && selectedGachaMachineId !== null) {
      const machine = GACHA_MACHINES.find(m => m.id === selectedGachaMachineId)
      return language === 'zh-TW' ? (machine?.zhName ?? '').charAt(0) : (machine?.enName ?? '').charAt(0)
    }
    if (isMerchantMode && selectedMerchantMapId !== null) {
      const map = MERCHANT_MAPS.find(m => m.id === selectedMerchantMapId)
      return language === 'zh-TW' ? (map?.zhName ?? '').charAt(0) : (map?.enName ?? '').charAt(0)
    }
    return ''
  }

  // 渲染按鈕文字（響應式）
  const renderButtonText = () => {
    if (isGachaMode) {
      return selectedGachaMachineId === null ? (
        <>
          <span className="hidden min-[462px]:inline">{t('gacha.viewAll')}</span>
          <span className="min-[462px]:hidden">轉</span>
        </>
      ) : (
        <>
          <span className="hidden min-[462px]:inline">{getShortName()}</span>
          <span className="min-[462px]:hidden">{getSingleChar()}</span>
        </>
      )
    }
    if (isMerchantMode) {
      return selectedMerchantMapId === null ? (
        <>
          <span className="hidden min-[462px]:inline">{t('merchant.viewAll')}</span>
          <span className="min-[462px]:hidden">商</span>
        </>
      ) : (
        <>
          <span className="hidden min-[462px]:inline">{getShortName()}</span>
          <span className="min-[462px]:hidden">{getSingleChar()}</span>
        </>
      )
    }
    // 預設模式
    return (
      <>
        <span className="hidden min-[462px]:inline">
          {language === 'zh-TW' ? '轉蛋/商人' : 'Gacha/Shop'}
        </span>
        <span className="min-[462px]:hidden">轉/商</span>
      </>
    )
  }

  const handleGachaSelect = (machineId: number | null) => {
    onGachaSelect(machineId)
    setIsOpen(false)
  }

  const handleMerchantSelect = (mapId: string | null) => {
    onMerchantSelect(mapId)
    setIsOpen(false)
  }

  const isSpecialMode = isGachaMode || isMerchantMode

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="rounded-xl bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm p-1.5">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
            isSpecialMode
              ? isGachaMode
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-stone-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
        >
          {renderButtonText()}
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
        <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1 max-h-[70vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* 轉蛋 */}
          <div className="px-3 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">
            {t('search.type.gacha')}
          </div>
          <button
            onClick={() => handleGachaSelect(null)}
            className={`w-full px-4 py-2 text-left text-sm transition-colors ${
              isGachaMode && selectedGachaMachineId === null
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('gacha.viewAll')}
          </button>
          {GACHA_MACHINES.map((machine) => (
            <button
              key={machine.id}
              onClick={() => handleGachaSelect(machine.id)}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                isGachaMode && selectedGachaMachineId === machine.id
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300'
              }`}
            >
              {language === 'zh-TW' ? machine.zhName : machine.enName}
            </button>
          ))}

          {/* 分隔線 */}
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

          {/* 商人專賣 */}
          <div className="px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase">
            {t('merchant.button')}
          </div>
          <button
            onClick={() => handleMerchantSelect(null)}
            className={`w-full px-4 py-2 text-left text-sm transition-colors ${
              isMerchantMode && selectedMerchantMapId === null
                ? 'bg-stone-100 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300'
                : 'hover:bg-stone-50 dark:hover:bg-stone-900/20 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('merchant.viewAll')}
          </button>
          {MERCHANT_MAPS.map((map) => (
            <button
              key={map.id}
              onClick={() => handleMerchantSelect(map.id)}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                isMerchantMode && selectedMerchantMapId === map.id
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

          {/* 關閉特殊模式（只在啟用時顯示） */}
          {isSpecialMode && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button
                onClick={() => {
                  if (isGachaMode) onGachaClose()
                  if (isMerchantMode) onMerchantClose()
                  setIsOpen(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                {isGachaMode ? t('gacha.close') : t('merchant.close')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
