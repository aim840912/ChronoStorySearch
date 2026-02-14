'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import type { DropsEssential, ItemAttributesEssential, JobClass } from '@/types'
import { DropItemCard } from './DropItemCard'
import { DropItemList } from './DropItemList'
import { MonsterStatsCard } from './MonsterStatsCard'
import { MonsterSpawnsCard } from './MonsterSpawnsCard'
import { Toast } from './Toast'
import { BaseModal } from './common/BaseModal'
import { TipBubble } from '@/components/TipBubble'
import { getMonsterImageUrl, getItemImageUrl } from '@/lib/image-utils'
import { getItemDisplayName } from '@/lib/display-name'
import { useLanguage } from '@/contexts/LanguageContext'
import { useImageFormat } from '@/contexts/ImageFormatContext'
import { useToast } from '@/hooks/useToast'
import { useLazyMobInfo, useLazyDropsDetailed } from '@/hooks/useLazyData'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useShowDevInfo } from '@/hooks/useShowDevInfo'
import { LanguageToggle } from './LanguageToggle'

interface MonsterModalProps {
  isOpen: boolean
  onClose: () => void
  monsterId: number | null
  monsterName: string
  allDrops: DropsEssential[]  // 改為 Essential 資料（用於基本資訊）
  itemAttributesMap: Map<number, ItemAttributesEssential>
  isFavorite: boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
  // 物品相關 props
  isItemFavorite: (itemId: number) => boolean
  onToggleItemFavorite: (itemId: number, itemName: string) => void
  onItemClick: (itemId: number, itemName: string) => void
  // 導航相關 props
  hasPreviousModal?: boolean
  onGoBack?: () => void
  // 命中率計算器相關 props
  onOpenAccuracyCalculator?: (monsterId: number) => void
  // 怪物導航（從 DropItemDetailModal 點擊怪物圖片觸發）
  onMonsterClick?: (mobId: number, mobName: string) => void
}

/**
 * 怪物掉落 Modal 元件
 * 顯示指定怪物的所有掉落物品
 */
export function MonsterModal({
  isOpen,
  onClose,
  monsterId,
  monsterName,
  allDrops,
  itemAttributesMap,
  isFavorite,
  onToggleFavorite,
  isItemFavorite,
  onToggleItemFavorite,
  onItemClick,
  hasPreviousModal,
  onGoBack,
  onOpenAccuracyCalculator,
  onMonsterClick,
}: MonsterModalProps) {
  const { t, language } = useLanguage()
  const { format } = useImageFormat()
  const showDevInfo = useShowDevInfo()
  const toast = useToast()

  // 手機版 Tab 狀態（'info' = 怪物資訊, 'drops' = 掉落物品）
  const [mobileTab, setMobileTab] = useState<'info' | 'drops'>('info')

  // 視圖模式切換狀態（'grid' = 卡片視圖, 'list' = 列表視圖, 'icons' = 圖示視圖）
  const [viewMode, setViewModeLocal] = useLocalStorage<'grid' | 'list' | 'icons'>('monster-drops-view', 'grid')

  // 顯示掉落來源圖示狀態（預設隱藏）
  const [showDropIcons, setShowDropIconsLocal] = useLocalStorage<boolean>('monster-drops-show-icons', false)

  // 只顯示最大屬性狀態
  const [showMaxOnly, setShowMaxOnlyLocal] = useLocalStorage<boolean>('monster-drops-show-max-only', false)

  // 包裝 setter 函數以觸發雲端同步
  const setViewMode = (mode: 'grid' | 'list' | 'icons') => {
    setViewModeLocal(mode)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'monsterDropsViewMode', value: mode }
    }))
  }

  const setShowDropIcons = (show: boolean) => {
    setShowDropIconsLocal(show)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'monsterDropsShowIcons', value: show }
    }))
  }

  const setShowMaxOnly = (show: boolean) => {
    setShowMaxOnlyLocal(show)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'monsterDropsShowMaxOnly', value: show }
    }))
  }

  // 掉落物品篩選狀態
  const [dropFilter, setDropFilter] = useState<'all' | 'equipment' | 'scroll' | 'other'>('all')
  const [isDropFilterOpen, setIsDropFilterOpen] = useState(false)

  // 職業篩選狀態（僅在裝備模式下啟用）
  const [jobFilter, setJobFilter] = useState<'all' | JobClass>('all')
  const [isJobFilterOpen, setIsJobFilterOpen] = useState(false)

  // 懶加載怪物資訊資料
  const {
    data: mobInfoData,
    loadData: loadMobInfo,
  } = useLazyMobInfo()

  // 懶加載該怪物的 Detailed 掉落資料（包含機率、數量等完整資訊）
  const {
    data: monsterDropsDetailed,
  } = useLazyDropsDetailed(monsterId)

  // 使用 Detailed 資料（包含完整掉落資訊）
  // 用 useMemo 包裹以避免 useEffect 依賴變化
  const monsterDrops = useMemo(() => {
    return monsterDropsDetailed || []
  }, [monsterDropsDetailed])

  // 根據 itemAttributesMap 判斷物品類別
  const getItemCategory = useCallback((itemId: number): 'equipment' | 'scroll' | 'other' => {
    const attrs = itemAttributesMap.get(itemId)
    if (!attrs) return 'other'
    if (attrs.equipment_category || attrs.type === 'Eqp') return 'equipment'
    if (attrs.scroll_category) return 'scroll'
    return 'other'
  }, [itemAttributesMap])

  // 過濾後的掉落物品
  const filteredDrops = useMemo(() => {
    let result = monsterDrops

    // 類別篩選
    if (dropFilter !== 'all') {
      result = result.filter(drop => getItemCategory(drop.itemId) === dropFilter)
    }

    // 職業篩選（僅在裝備模式下啟用）
    if (dropFilter === 'equipment' && jobFilter !== 'all') {
      result = result.filter(drop => {
        const attrs = itemAttributesMap.get(drop.itemId)
        if (!attrs?.equipment_classes) return false
        return attrs.equipment_classes[jobFilter] === true
      })
    }

    // 按類別排序（卷軸 → 裝備 → 其他）
    const categoryOrder: Record<'scroll' | 'equipment' | 'other', number> = {
      scroll: 0,
      equipment: 1,
      other: 2
    }

    return result.sort((a, b) => {
      const categoryA = getItemCategory(a.itemId)
      const categoryB = getItemCategory(b.itemId)
      return categoryOrder[categoryA] - categoryOrder[categoryB]
    })
  }, [monsterDrops, dropFilter, jobFilter, itemAttributesMap, getItemCategory])

  // 從 allDrops 查找怪物數據（用於獲取中英文名稱）
  const monsterData = useMemo(() => {
    if (!monsterId) return null
    return allDrops.find((drop) => drop.mobId === monsterId) || null
  }, [monsterId, allDrops])

  // 根據語言選擇顯示名稱
  const displayMonsterName = useMemo(() => {
    // 如果沒有找到 monsterData，才回退到 prop
    if (!monsterData) return monsterName

    // 總是從 monsterData 中取名稱（保證數據源一致）
    if (language === 'zh-TW') {
      // 中文模式：優先用中文，沒有就用英文
      return monsterData.chineseMobName || monsterData.mobName
    }
    // 英文模式：直接用英文名稱
    return monsterData.mobName
  }, [language, monsterData, monsterName])

  // 查找怪物詳細資訊
  const mobInfo = useMemo(() => {
    if (!monsterId || !mobInfoData) return null
    return (
      mobInfoData.find((info) => info.mob.id === String(monsterId)) || null
    )
  }, [monsterId, mobInfoData])

  // 當 Modal 開啟時載入怪物資訊資料
  useEffect(() => {
    if (isOpen) {
      loadMobInfo()
    }
  }, [isOpen, loadMobInfo])

  // 從 DropItemDetailModal 點擊怪物圖片：解析名稱後導航
  const handleMonsterClickFromDetail = useCallback((mobId: number) => {
    if (!onMonsterClick) return
    const mob = allDrops.find(d => d.mobId === mobId)
    const name = mob?.mobName || String(mobId)
    onMonsterClick(mobId, name)
  }, [onMonsterClick, allDrops])

  if (!monsterId) return null

  const monsterIconUrl = getMonsterImageUrl(monsterId, { format })

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-[85vw]"
      floatingLeft={
        hasPreviousModal && onGoBack && (
          <button
            onClick={onGoBack}
            className="px-3 py-2 min-h-[44px] rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 transition-all duration-200 hover:scale-105 hover:bg-white/25 active:scale-95 flex items-center gap-1.5 text-white dark:text-gray-200"
            aria-label={t('modal.goBack')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium hidden sm:inline">{t('modal.goBack')}</span>
          </button>
        )
      }
      floatingRight={
        <>
          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="p-3 min-h-[44px] min-w-[44px] transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center text-white dark:text-gray-300 hover:text-red-500"
            aria-label={t('modal.close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* 分享按鈕 */}
          <button
            onClick={async () => {
              if (!monsterId) return
              const url = `${window.location.origin}/#monster=${monsterId}`
              try {
                await navigator.clipboard.writeText(url)
                toast.showToast(t('share.success'), 'success')
              } catch {
                toast.showToast(t('share.error'), 'error')
              }
            }}
            className="p-3 min-h-[44px] min-w-[44px] transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center text-white dark:text-gray-300 hover:text-blue-500"
            aria-label={t('share.button')}
            title={t('share.button')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          {/* 語言切換按鈕 */}
          <LanguageToggle />
        </>
      }
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* 手機版 Tab 切換（只在 < 1120px 顯示） */}
        <div className="min-[1120px]:hidden border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex">
            <button
              onClick={() => setMobileTab('info')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                mobileTab === 'info'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {t('monster.info') || '怪物資訊'}
            </button>
            <button
              onClick={() => setMobileTab('drops')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                mobileTab === 'drops'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {t('monster.drops') || '掉落物品'} ({filteredDrops.length})
            </button>
          </div>
        </div>

        {/* Modal Content - 左右分欄佈局（< 1120px 時上下堆疊） */}
        {/* 手機版移除上方 padding，讓按鈕列貼齊 Tab */}
        <div className="px-3 pb-3 min-[1120px]:p-6 flex flex-col min-[1120px]:flex-row min-[1120px]:items-start gap-3 sm:gap-6 flex-1 min-h-0 overflow-hidden">
          {/* 左側：怪物屬性（>= 1120px 顯示 / < 1120px 根據 Tab 顯示） */}
          {/* 手機版需要上方 padding，因為內容區域沒有 */}
          <div className={`pt-3 min-[1120px]:pt-0 min-[1120px]:w-[320px] min-[1120px]:flex-shrink-0 space-y-4 flex-1 min-[1120px]:flex-none h-full overflow-y-auto scrollbar-hide ${
            mobileTab === 'drops' ? 'hidden min-[1120px]:block' : ''
          }`}>
            {/* 怪物圖示與收藏按鈕 */}
            <div className="relative mb-4">
              {/* 收藏按鈕 - 左上角 */}
              <button
                onClick={() => monsterId && onToggleFavorite(monsterId, monsterName)}
                className={`absolute -top-1 -left-1 p-3 min-h-[44px] min-w-[44px] transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                  isFavorite
                    ? 'text-red-500 hover:text-red-600'
                    : 'text-gray-400 hover:text-red-400'
                }`}
                aria-label={isFavorite ? t('modal.favoriteRemove') : t('modal.favoriteAdd')}
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  fill={isFavorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
              {/* 怪物圖片 - 置中 */}
              <div className="flex justify-center">
                <img
                  src={monsterIconUrl}
                  alt={displayMonsterName}
                  className="w-24 h-24 sm:w-32 sm:h-32 monster-image"
                />
              </div>
              {/* 怪物名稱 */}
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white text-center mt-2">
                {displayMonsterName}
              </h2>
              {showDevInfo && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {t('modal.monsterId')}: {monsterId}
                </p>
              )}
            </div>
            {/* 怪物屬性卡片 */}
            <MonsterStatsCard
              mobInfo={mobInfo}
              onAccuracyClick={
                monsterId && onOpenAccuracyCalculator
                  ? () => onOpenAccuracyCalculator(monsterId)
                  : undefined
              }
            />
            {/* 出沒地點卡片 */}
            {monsterData?.mobName && (
              <MonsterSpawnsCard monsterName={monsterData.mobName} />
            )}
          </div>

          {/* 右側：掉落物品（>= 1120px 顯示 / < 1120px 根據 Tab 顯示） */}
          <div className={`flex-1 min-[1120px]:w-2/3 h-full overflow-y-auto scrollbar-hide ${
            mobileTab === 'info' ? 'hidden min-[1120px]:block' : ''
          }`}>
            {/* 掉落標題和視圖切換 */}
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2 sticky top-0 bg-white dark:bg-gray-800 z-10 py-2">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 hidden min-[1120px]:block">
                {t('monster.drops')} ({filteredDrops.length})
              </h3>
              {/* 下拉選單 + 視圖切換按鈕群組 */}
              <div className="flex items-center gap-2 min-[1120px]:ml-auto">
                {/* 掉落物品篩選下拉選單 */}
                <div className="relative">
                  <button
                    onClick={() => setIsDropFilterOpen(!isDropFilterOpen)}
                    className="px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
                  >
                    {t(`monster.dropFilter.${dropFilter}`)}
                    <svg
                      className={`w-4 h-4 transition-transform ${isDropFilterOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isDropFilterOpen && (
                    <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
                      {(['all', 'equipment', 'scroll', 'other'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => {
                            setDropFilter(filter)
                            // 當離開裝備模式時重置職業篩選
                            if (filter !== 'equipment') {
                              setJobFilter('all')
                            }
                            setIsDropFilterOpen(false)
                          }}
                          className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                            dropFilter === filter
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {t(`monster.dropFilter.${filter}`)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* 職業篩選下拉選單 - 僅在裝備模式時顯示 */}
                {dropFilter === 'equipment' && (
                  <div className="relative">
                    <button
                      onClick={() => setIsJobFilterOpen(!isJobFilterOpen)}
                      className="px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
                    >
                      {t(`filter.jobClass.${jobFilter}`)}
                      <svg
                        className={`w-4 h-4 transition-transform ${isJobFilterOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isJobFilterOpen && (
                      <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
                        {(['all', 'warrior', 'magician', 'bowman', 'thief', 'pirate', 'beginner'] as const).map((job) => (
                          <button
                            key={job}
                            onClick={() => {
                              setJobFilter(job)
                              setIsJobFilterOpen(false)
                            }}
                            className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                              jobFilter === job
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {t(`filter.jobClass.${job}`)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* 圖示顯示切換按鈕（僅卡片/列表視圖顯示） */}
                {viewMode !== 'icons' && (
                  <button
                    onClick={() => setShowDropIcons(!showDropIcons)}
                    className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                      showDropIcons
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label={showDropIcons ? t('card.hideDropIcons') : t('card.showDropIcons')}
                    title={showDropIcons ? t('card.hideDropIcons') : t('card.showDropIcons')}
                  >
                    {showDropIcons ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                )}
                {/* 視圖切換按鈕（grid → list → icons 循環） */}
                <button
                  onClick={() => {
                    const next = viewMode === 'grid' ? 'list' : viewMode === 'list' ? 'icons' : 'grid'
                    setViewMode(next)
                  }}
                  className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  aria-label={t(viewMode === 'grid' ? 'item.switchToList' : viewMode === 'list' ? 'item.switchToIcons' : 'item.switchToGrid')}
                  title={t(viewMode === 'grid' ? 'item.switchToList' : viewMode === 'list' ? 'item.switchToIcons' : 'item.switchToGrid')}
                >
                  {viewMode === 'grid' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  ) : viewMode === 'list' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="4.5" height="4.5" rx="1" />
                      <rect x="9.75" y="3" width="4.5" height="4.5" rx="1" />
                      <rect x="16.5" y="3" width="4.5" height="4.5" rx="1" />
                      <rect x="3" y="9.75" width="4.5" height="4.5" rx="1" />
                      <rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1" />
                      <rect x="16.5" y="9.75" width="4.5" height="4.5" rx="1" />
                      <rect x="3" y="16.5" width="4.5" height="4.5" rx="1" />
                      <rect x="9.75" y="16.5" width="4.5" height="4.5" rx="1" />
                      <rect x="16.5" y="16.5" width="4.5" height="4.5" rx="1" />
                    </svg>
                  )}
                </button>
                {/* 只顯示最大屬性按鈕 */}
                <div className="relative">
                  <button
                    onClick={() => setShowMaxOnly(!showMaxOnly)}
                    className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                      showMaxOnly
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label={showMaxOnly ? t('monster.showAllStats') : t('monster.showMaxOnly')}
                    title={showMaxOnly ? t('monster.showAllStats') : t('monster.showMaxOnly')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </button>
                  <TipBubble
                    tipId="monster-show-max-only"
                    message={t('tip.showMaxOnly')}
                    position="right"
                  />
                </div>
              </div>
            </div>
            {/* 根據視圖模式渲染不同的佈局 */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-1">
                {filteredDrops.map((drop, index) => (
                  <DropItemCard
                    key={`${drop.itemId}-${index}`}
                    drop={drop}
                    itemAttributesMap={itemAttributesMap}
                    isFavorite={isItemFavorite(drop.itemId)}
                    onToggleFavorite={onToggleItemFavorite}
                    onItemClick={onItemClick}
                    showIcons={showDropIcons}
                    showMaxOnly={showMaxOnly}
                    onMonsterClick={handleMonsterClickFromDetail}
                    showTip={index === 0}
                  />
                ))}
              </div>
            ) : viewMode === 'list' ? (
              <DropItemList
                drops={filteredDrops}
                itemAttributesMap={itemAttributesMap}
                isItemFavorite={isItemFavorite}
                onToggleFavorite={onToggleItemFavorite}
                onItemClick={onItemClick}
              />
            ) : (
              /* Icons-only view: 緊湊物品圖示網格（捲軸顯示名稱） */
              <div className="flex flex-wrap gap-2 p-1">
                {filteredDrops.map((drop, idx) => {
                  const displayName = getItemDisplayName(drop.itemName, drop.chineseItemName, language)
                  const iconUrl = getItemImageUrl(drop.itemId, { itemName: drop.itemName })
                  const isScroll = drop.itemName.toLowerCase().includes('scroll')

                  if (isScroll) {
                    // 捲軸：顯示圖示 + 名稱 + 掉落率
                    return (
                      <div
                        key={`${drop.itemId}-${idx}`}
                        onClick={() => onItemClick(drop.itemId, displayName)}
                        className="h-[72px] rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-600 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 px-3"
                        title={displayName}
                      >
                        <img
                          src={iconUrl}
                          alt={displayName}
                          className="w-10 h-10 object-contain flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                            {displayName}
                          </p>
                          <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                            {drop.chance.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )
                  }

                  // 非捲軸：正方形圖示 + 掉落率
                  return (
                    <div
                      key={`${drop.itemId}-${idx}`}
                      onClick={() => onItemClick(drop.itemId, displayName)}
                      className="w-[72px] h-[72px] rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-600 cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex flex-col items-center justify-center gap-0.5"
                      title={displayName}
                    >
                      <img
                        src={iconUrl}
                        alt={displayName}
                        className="w-11 h-11 object-contain"
                        loading="lazy"
                      />
                      <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 leading-tight">
                        {drop.chance.toFixed(2)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* 截圖範圍結束 */}

      {/* Toast 通知 */}
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={toast.hideToast}
        type={toast.type}
      />
    </BaseModal>
  )
}
