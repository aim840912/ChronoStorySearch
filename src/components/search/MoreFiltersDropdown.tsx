'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SearchTypeFilter, FilterMode } from '@/types'

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

interface MoreFiltersDropdownProps {
  // FilterTabs 相關
  searchType: SearchTypeFilter
  onSearchTypeChange: (type: SearchTypeFilter) => void
  filterMode: FilterMode
  onFilterChange: (mode: FilterMode) => void
  favoriteMonsterCount: number
  favoriteItemCount: number
  // 轉蛋相關
  isGachaMode: boolean
  selectedGachaMachineId: number | null
  onGachaSelect: (machineId: number | null) => void
  onGachaClose: () => void
  // 商人商店相關
  isMerchantMode: boolean
  selectedMerchantMapId: string | null
  onMerchantSelect: (mapId: string | null) => void
  onMerchantClose: () => void
}

/**
 * 更多篩選下拉選單元件
 * 在短螢幕高度時顯示，收納 FilterTabs、Gacha、Merchant Shop
 */
export function MoreFiltersDropdown({
  searchType,
  onSearchTypeChange,
  filterMode,
  onFilterChange,
  favoriteMonsterCount,
  favoriteItemCount,
  isGachaMode,
  selectedGachaMachineId,
  onGachaSelect,
  onGachaClose,
  isMerchantMode,
  selectedMerchantMapId,
  onMerchantSelect,
  onMerchantClose,
}: MoreFiltersDropdownProps) {
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

  // 獲取按鈕顯示文字
  const getButtonText = (): string => {
    if (isGachaMode) {
      if (selectedGachaMachineId === null) {
        return t('gacha.viewAll')
      }
      const machine = GACHA_MACHINES.find(m => m.id === selectedGachaMachineId)
      return language === 'zh-TW' ? machine?.zhName ?? '' : machine?.enName ?? ''
    }
    if (isMerchantMode) {
      if (selectedMerchantMapId === null) {
        return t('merchant.viewAll')
      }
      const map = MERCHANT_MAPS.find(m => m.id === selectedMerchantMapId)
      return language === 'zh-TW' ? map?.zhName ?? '' : map?.enName ?? ''
    }
    // 顯示當前篩選狀態
    if (filterMode === 'favorite-monsters') return t('filter.favoriteMonsters')
    if (filterMode === 'favorite-items') return t('filter.favoriteItems')
    return t(`search.type.${searchType}`)
  }

  const handleTypeChange = (type: SearchTypeFilter) => {
    onSearchTypeChange(type)
    onFilterChange('all')
    // 關閉特殊模式
    if (isGachaMode) onGachaClose()
    if (isMerchantMode) onMerchantClose()
    setIsOpen(false)
  }

  const handleFavoriteChange = (mode: FilterMode) => {
    onFilterChange(mode)
    // 關閉特殊模式
    if (isGachaMode) onGachaClose()
    if (isMerchantMode) onMerchantClose()
    setIsOpen(false)
  }

  const handleGachaSelect = (machineId: number | null) => {
    onGachaSelect(machineId)
    setIsOpen(false)
  }

  const handleMerchantSelect = (mapId: string | null) => {
    onMerchantSelect(mapId)
    setIsOpen(false)
  }

  // 判斷按鈕是否啟用特殊模式
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
          {getButtonText()}
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
          {/* 類型篩選 */}
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            {t('search.type.all')}
          </div>
          {(['all', 'monster', 'item'] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                searchType === type && filterMode === 'all' && !isSpecialMode
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
              }`}
            >
              {t(`search.type.${type}`)}
            </button>
          ))}

          {/* 分隔線 */}
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

          {/* 收藏 */}
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            {t('favorites.title')}
          </div>
          <button
            onClick={() => handleFavoriteChange('favorite-monsters')}
            className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
              filterMode === 'favorite-monsters' && !isSpecialMode
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {t('filter.favoriteMonsters')}
            {favoriteMonsterCount > 0 && (
              <span className="text-xs opacity-70">({favoriteMonsterCount})</span>
            )}
          </button>
          <button
            onClick={() => handleFavoriteChange('favorite-items')}
            className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
              filterMode === 'favorite-items' && !isSpecialMode
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {t('filter.favoriteItems')}
            {favoriteItemCount > 0 && (
              <span className="text-xs opacity-70">({favoriteItemCount})</span>
            )}
          </button>

          {/* 分隔線 */}
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

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
