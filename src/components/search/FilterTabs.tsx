'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { FilterMode } from '@/types'

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
  { id: 8, zhName: '地球防衛本部', enName: 'Omega Sector' },
] as const

/**
 * 商人商店地圖靜態資料 - 暫時停用
 */
// const MERCHANT_MAPS = [
//   { id: 'kerning-swamp-2', zhName: '墮落城市：沼澤地<2>', enName: 'Kerning City Swamp', region: 'Kerning City' },
//   { id: 'ellinia-forest-3', zhName: '魔法森林：大木林<3>', enName: 'Ellinia Forest', region: 'Ellinia' },
//   { id: 'orbis-tower-4', zhName: '天空之城塔<4層>', enName: 'Orbis Tower 4F', region: 'Orbis' },
// ] as const

interface FilterTabsProps {
  filterMode: FilterMode
  onFilterChange: (mode: FilterMode) => void
  favoriteMonsterCount: number
  favoriteItemCount: number
  /** 是否處於轉蛋模式 */
  isGachaMode?: boolean
  /** 是否處於商人模式 */
  isMerchantMode?: boolean
  // 轉蛋相關
  selectedGachaMachineId?: number | null
  onGachaSelect?: (machineId: number | null) => void
  onGachaClose?: () => void
  // 商人相關
  selectedMerchantMapId?: string | null
  onMerchantSelect?: (mapId: string | null) => void
  onMerchantClose?: () => void
  // 捲軸兌換相關
  isScrollExchangeMode?: boolean
  onScrollExchangeToggle?: () => void
  onScrollExchangeClose?: () => void
  // SEO 頁面模式
  isSeoPageMode?: boolean
  onSeoPageModeToggle?: () => void
}

/**
 * 篩選按鈕群組元件
 * 包含收藏篩選和轉蛋下拉選單
 */
export function FilterTabs({
  filterMode,
  onFilterChange,
  favoriteMonsterCount,
  favoriteItemCount,
  isGachaMode = false,
  isMerchantMode = false,
  selectedGachaMachineId,
  onGachaSelect,
  onGachaClose,
  // 商人 - 暫時停用
  selectedMerchantMapId: _selectedMerchantMapId,
  onMerchantSelect: _onMerchantSelect,
  onMerchantClose: _onMerchantClose,
  // 捲軸兌換
  isScrollExchangeMode = false,
  onScrollExchangeToggle,
  onScrollExchangeClose,
  // SEO 頁面模式
  isSeoPageMode = false,
  onSeoPageModeToggle,
}: FilterTabsProps) {
  // 暫時抑制 unused variable 警告
  void _selectedMerchantMapId
  void _onMerchantSelect
  void _onMerchantClose
  const { t, language } = useLanguage()
  const [gachaOpen, setGachaOpen] = useState(false)
  // 商人 - 暫時停用
  // const [merchantOpen, setMerchantOpen] = useState(false)
  const gachaRef = useRef<HTMLDivElement>(null)
  // const merchantRef = useRef<HTMLDivElement>(null)

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gachaRef.current && !gachaRef.current.contains(event.target as Node)) {
        setGachaOpen(false)
      }
      // 商人 - 暫時停用
      // if (merchantRef.current && !merchantRef.current.contains(event.target as Node)) {
      //   setMerchantOpen(false)
      // }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 轉蛋按鈕文字
  const getGachaButtonText = () => {
    if (!isGachaMode) {
      return (
        <>
          <span className="hidden min-[518px]:inline">{t('search.type.gacha')}</span>
          <span className="min-[518px]:hidden">{language === 'zh-TW' ? '轉' : 'G'}</span>
        </>
      )
    }
    if (selectedGachaMachineId === null) {
      return (
        <>
          <span className="hidden min-[518px]:inline">{t('gacha.viewAll')}</span>
          <span className="min-[518px]:hidden">{language === 'zh-TW' ? '轉' : 'G'}</span>
        </>
      )
    }
    const machine = GACHA_MACHINES.find(m => m.id === selectedGachaMachineId)
    const name = language === 'zh-TW' ? machine?.zhName ?? '' : machine?.enName ?? ''
    return (
      <>
        <span className="hidden min-[518px]:inline">{language === 'zh-TW' ? name.slice(0, 2) : name}</span>
        <span className="min-[518px]:hidden">{name.charAt(0)}</span>
      </>
    )
  }

  // 商人按鈕文字 - 暫時停用
  // const getMerchantButtonText = () => {
  //   if (!isMerchantMode) {
  //     return (
  //       <>
  //         <span className="hidden min-[518px]:inline">{t('merchant.button')}</span>
  //         <span className="min-[518px]:hidden">商</span>
  //       </>
  //     )
  //   }
  //   if (selectedMerchantMapId === null) {
  //     return (
  //       <>
  //         <span className="hidden min-[518px]:inline">{t('merchant.viewAll')}</span>
  //         <span className="min-[518px]:hidden">商</span>
  //       </>
  //     )
  //   }
  //   const map = MERCHANT_MAPS.find(m => m.id === selectedMerchantMapId)
  //   const name = language === 'zh-TW' ? map?.zhName ?? '' : map?.enName ?? ''
  //   return (
  //     <>
  //       <span className="hidden min-[518px]:inline">{language === 'zh-TW' ? name.slice(0, 2) : name}</span>
  //       <span className="min-[518px]:hidden">{name.charAt(0)}</span>
  //     </>
  //   )
  // }

  const handleGachaSelectAll = () => {
    onGachaSelect?.(null)
    setGachaOpen(false)
  }

  const handleGachaSelectMachine = (machineId: number) => {
    onGachaSelect?.(machineId)
    setGachaOpen(false)
  }

  const handleGachaCloseMode = () => {
    onGachaClose?.()
    setGachaOpen(false)
  }

  // 商人 handlers - 暫時停用
  // const handleMerchantSelectAll = () => {
  //   onMerchantSelect?.(null)
  //   setMerchantOpen(false)
  // }

  // const handleMerchantSelectMap = (mapId: string) => {
  //   onMerchantSelect?.(mapId)
  //   setMerchantOpen(false)
  // }

  // const handleMerchantCloseMode = () => {
  //   onMerchantClose?.()
  //   setMerchantOpen(false)
  // }

  // 處理「全部」按鈕點擊
  const handleShowAll = () => {
    onFilterChange('all')
    onGachaClose?.()  // 同時關閉轉蛋模式
    onScrollExchangeClose?.()  // 同時關閉捲軸兌換模式
  }

  return (
    <div className="flex flex-wrap w-full lg:w-fit justify-evenly lg:justify-start rounded-xl bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm p-1.5 gap-1">
      {/* 全部按鈕 */}
      <button
        onClick={handleShowAll}
        className={`flex-1 lg:flex-initial px-2 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
          filterMode === 'all' && !isGachaMode && !isMerchantMode && !isScrollExchangeMode
            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        <span className="hidden min-[518px]:inline">{t('filter.all')}</span>
        <span className="min-[518px]:hidden">{language === 'zh-TW' ? '全' : 'A'}</span>
      </button>

      {/* 收藏怪物按鈕 */}
      <button
        onClick={() => onFilterChange('favorite-monsters')}
        className={`flex-1 lg:flex-initial px-2 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
          filterMode === 'favorite-monsters' && !isGachaMode && !isMerchantMode && !isScrollExchangeMode
            ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
            : favoriteMonsterCount > 0
            ? 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
        }`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span className="hidden min-[537px]:inline">{t('filter.favoriteMonsters')}</span>
        <span className="hidden min-[518px]:inline min-[537px]:hidden">
          {language === 'zh-TW' ? t('filter.favoriteMonsters') : 'Mon'}
        </span>
        <span className="min-[518px]:hidden">{language === 'zh-TW' ? '怪' : 'M'}</span>
      </button>
      <button
        onClick={() => onFilterChange('favorite-items')}
        className={`flex-1 lg:flex-initial px-2 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
          filterMode === 'favorite-items' && !isGachaMode && !isMerchantMode && !isScrollExchangeMode
            ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
            : favoriteItemCount > 0
            ? 'text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
        }`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span className="hidden min-[537px]:inline">{t('filter.favoriteItems')}</span>
        <span className="hidden min-[518px]:inline min-[537px]:hidden">
          {language === 'zh-TW' ? t('filter.favoriteItems') : 'Itm'}
        </span>
        <span className="min-[518px]:hidden">{language === 'zh-TW' ? '物' : 'I'}</span>
      </button>

      {/* 分隔線 */}
      {onGachaSelect && (
        <div className="hidden min-[460px]:block w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />
      )}

      {/* 轉蛋下拉選單 */}
      {onGachaSelect && onGachaClose && (
        <div className="relative flex-1 lg:flex-initial" ref={gachaRef}>
          <button
            onClick={() => setGachaOpen(!gachaOpen)}
            className={`w-full px-2 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center justify-center lg:justify-start gap-1.5 ${
              isGachaMode
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            {getGachaButtonText()}
          </button>

          {gachaOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <button
                onClick={handleGachaSelectAll}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  isGachaMode && selectedGachaMachineId === null
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('gacha.viewAll')}
              </button>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              {GACHA_MACHINES.map((machine) => (
                <button
                  key={machine.id}
                  onClick={() => handleGachaSelectMachine(machine.id)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    isGachaMode && selectedGachaMachineId === machine.id
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {language === 'zh-TW' ? machine.zhName : machine.enName}
                </button>
              ))}
              {isGachaMode && (
                <>
                  <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                  <button
                    onClick={handleGachaCloseMode}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    {t('gacha.close')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 捲軸兌換按鈕 */}
      {onScrollExchangeToggle && (
        <button
          onClick={onScrollExchangeToggle}
          className={`flex-1 lg:flex-initial px-2 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center justify-center lg:justify-start gap-1.5 ${
            isScrollExchangeMode
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          <span className="hidden min-[518px]:inline">{t('scrollExchange.button')}</span>
          <span className="min-[518px]:hidden">{language === 'zh-TW' ? '兌' : 'Ex'}</span>
        </button>
      )}

      {/* SEO 頁面模式切換 */}
      {onSeoPageModeToggle && (
        <>
          <div className="hidden min-[460px]:block w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />
          <button
            onClick={onSeoPageModeToggle}
            className={`flex-1 lg:flex-initial px-2 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center justify-center lg:justify-start gap-1.5 ${
              isSeoPageMode
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
            title={isSeoPageMode ? t('seoPageMode.tooltip.on') : t('seoPageMode.tooltip.off')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="hidden min-[518px]:inline">{t('seoPageMode.button')}</span>
            <span className="min-[518px]:hidden">{language === 'zh-TW' ? '頁' : 'P'}</span>
          </button>
        </>
      )}

      {/* 商人下拉選單 - 暫時停用
      {onMerchantSelect && onMerchantClose && (
        <div className="relative" ref={merchantRef}>
          <button
            onClick={() => setMerchantOpen(!merchantOpen)}
            className={`px-2 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              isMerchantMode
                ? 'bg-stone-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            {getMerchantButtonText()}
            <svg
              className={`w-4 h-4 transition-transform ${merchantOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {merchantOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <button
                onClick={handleMerchantSelectAll}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  isMerchantMode && selectedMerchantMapId === null
                    ? 'bg-stone-100 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300'
                    : 'hover:bg-stone-50 dark:hover:bg-stone-900/20 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('merchant.viewAll')}
              </button>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              {MERCHANT_MAPS.map((map) => (
                <button
                  key={map.id}
                  onClick={() => handleMerchantSelectMap(map.id)}
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
              {isMerchantMode && (
                <>
                  <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                  <button
                    onClick={handleMerchantCloseMode}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    {t('merchant.close')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
      */}
    </div>
  )
}
