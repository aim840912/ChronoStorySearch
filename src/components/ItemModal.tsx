'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import type { DropsEssential, GachaMachine, ItemAttributesEssential, ItemsOrganizedData, DropsByItemMonster } from '@/types'
import { MonsterDropCard } from './MonsterDropCard'
import { MonsterDropList } from './MonsterDropList'
import { ItemAttributesCard } from './ItemAttributesCard'
import { Toast } from './Toast'
import { BaseModal } from './common/BaseModal'
import { clientLogger } from '@/lib/logger'
import { getItemImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { useScreenshot } from '@/hooks/useScreenshot'
import { useLazyMobInfo, useLazyItemDetailed, useLazyDropsByItem } from '@/hooks/useLazyData'
import { findGachaItemOrganized } from '@/lib/gacha-utils'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useShowDevInfo } from '@/hooks/useShowDevInfo'
import { isUnwelcomeGuestItem, getMultiStageRecipe, getNextStageRecipe } from '@/lib/crafting-utils'
import { getScrollExchangeInfo } from '@/lib/scroll-exchange-utils'
import { CraftingRecipeCard } from './CraftingRecipeCard'
import { UpgradePathCard } from './UpgradePathCard'

// 商人販售地點資料結構
interface MerchantLocation {
  mapId: string
  mapName: string
  chineseMapName: string
  region: string
}

interface ItemModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: number | null
  itemName: string
  allDrops: DropsEssential[]  // 改為 Essential（只需基本資訊）
  gachaMachines: GachaMachine[]
  itemAttributesMap: Map<number, ItemAttributesEssential>
  merchantItemIndex: Map<string, MerchantLocation[]>
  isFavorite: boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
  // 怪物相關 props
  isMonsterFavorite: (mobId: number) => boolean
  onToggleMonsterFavorite: (mobId: number, mobName: string) => void
  onMonsterClick: (mobId: number, mobName: string) => void
  // 轉蛋機相關 props
  onGachaMachineClick: (machineId: number) => void
  // 物品跳轉（用於製作配方點擊前階武器）
  onItemClick?: (itemId: number, itemName: string) => void
  // 捲軸兌換跳轉
  onScrollExchangeClick?: () => void
  // 導航相關 props
  hasPreviousModal?: boolean
  onGoBack?: () => void
}

/**
 * 物品掉落 Modal 元件
 * 顯示掉落指定物品的所有怪物
 */
export function ItemModal({
  isOpen,
  onClose,
  itemId,
  itemName,
  allDrops,
  gachaMachines,
  itemAttributesMap,
  merchantItemIndex,
  isFavorite,
  onToggleFavorite,
  isMonsterFavorite,
  onToggleMonsterFavorite,
  onMonsterClick,
  onGachaMachineClick,
  onItemClick,
  onScrollExchangeClick,
  hasPreviousModal,
  onGoBack,
}: ItemModalProps) {
  const { t, language } = useLanguage()
  const showDevInfo = useShowDevInfo()
  const toast = useToast()

  // 截圖功能
  const screenshotRef = useRef<HTMLDivElement>(null)
  const { downloadPng, copyToClipboard, isCapturing } = useScreenshot({
    filename: `item-${itemId}-${itemName}`,
  })
  // 手機版 Tab 狀態（'info' = 物品資訊, 'sources' = 掉落來源）
  const [mobileTab, setMobileTab] = useState<'info' | 'sources'>('info')

  // 視圖模式切換狀態（'grid' = 卡片視圖, 'list' = 列表視圖）
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>('item-sources-view', 'grid')

  // 是否顯示掉落來源圖示（預設隱藏）
  const [showDropIcons, setShowDropIconsLocal] = useLocalStorage<boolean>('item-sources-show-icons', false)

  // 包裝 setter 函數以觸發雲端同步
  const setViewModeWithSync = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'itemSourcesViewMode', value: mode }
    }))
  }

  const setShowDropIconsWithSync = (show: boolean) => {
    setShowDropIconsLocal(show)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'itemSourcesShowIcons', value: show }
    }))
  }

  // 懶加載怪物資訊資料 (用於顯示怪物血量)
  const {
    monsterHPMap,
    loadData: loadMobInfo,
  } = useLazyMobInfo()

  // 懶加載該物品的詳細掉落資料（包含 chance）
  const { data: dropsByItemData } = useLazyDropsByItem(itemId)

  // 懶加載物品詳細資料 (用於顯示完整物品屬性)
  // 只對存在於 itemAttributesMap 的物品載入 Detailed 資料
  // 純轉蛋物品會直接使用轉蛋機資料，無需載入 Detailed（避免 console 錯誤）
  const shouldLoadDetailed = itemId !== null && itemAttributesMap.has(itemId)

  const {
    data: itemDetailed,
    isLoading: isLoadingDetailed,
    error: detailedError,
  } = useLazyItemDetailed(shouldLoadDetailed ? itemId : null)

  // 過濾該物品的所有掉落來源怪物
  // 優先使用懶加載的 dropsByItemData（包含正確的 chance），fallback 到 allDrops
  const itemDrops = useMemo((): DropsEssential[] => {
    if (!itemId && itemId !== 0) return []

    // 如果有懶加載的詳細資料，使用它（包含正確的 chance）
    if (dropsByItemData && dropsByItemData.monsters.length > 0) {
      // 從 allDrops 找到物品名稱資訊
      const dropItem = allDrops.find((drop) => drop.itemId === itemId)
      const itemName = dropItem?.itemName ?? dropsByItemData.itemName
      const chineseItemName = dropItem?.chineseItemName ?? dropsByItemData.chineseItemName

      return dropsByItemData.monsters.map((monster: DropsByItemMonster) => ({
        mobId: monster.mobId,
        mobName: monster.mobName,
        chineseMobName: monster.chineseMobName,
        itemId,
        itemName,
        chineseItemName,
        chance: monster.chance,
        minQty: monster.minQty,
        maxQty: monster.maxQty,
      }))
    }

    // Fallback: 使用 allDrops（chance 可能是 0）
    return allDrops.filter((drop) => drop.itemId === itemId)
  }, [itemId, allDrops, dropsByItemData])

  // 計算該物品來自哪些轉蛋機
  const itemGachaSources = useMemo(() => {
    if (!itemId && itemId !== 0) return []

    const sources: Array<{
      machineId: number
      machineName: string
      chineseMachineName?: string
      probability: string
    }> = []

    gachaMachines.forEach((machine) => {
      const gachaItem = machine.items.find((item) => item.itemId === itemId)
      if (gachaItem) {
        sources.push({
          machineId: machine.machineId,
          machineName: machine.machineName,
          chineseMachineName: machine.chineseMachineName,
          probability: gachaItem.probability,
        })
      }
    })

    return sources
  }, [itemId, gachaMachines])

  // 從 allDrops 或 gachaMachines 查找物品數據（用於獲取中英文名稱）
  const itemData = useMemo(() => {
    if (!itemId && itemId !== 0) return null

    // 1. 優先從 allDrops 查找（怪物掉落物品）
    const dropItem = allDrops.find((drop) => drop.itemId === itemId)
    if (dropItem) return dropItem

    // 2. 從 gachaMachines 查找（純轉蛋物品）
    for (const machine of gachaMachines) {
      const gachaItem = machine.items.find((item) => item.itemId === itemId)
      if (gachaItem) {
        // 轉換為 DropItem 格式（用於統一介面）
        return {
          itemId: gachaItem.itemId,
          itemName: gachaItem.name || gachaItem.itemName || '',
          chineseItemName: gachaItem.chineseName || null,
          // 純轉蛋物品沒有怪物相關資料
          mobId: 0,
          mobName: '',
          chineseMobName: null,
          chance: 0,
          minQty: 0,
          maxQty: 0,
        }
      }
    }

    return null
  }, [itemId, allDrops, gachaMachines])

  // 計算該物品的商人販售來源（透過物品英文名稱查詢）
  const itemMerchantSources = useMemo(() => {
    if (!itemId && itemId !== 0) return []

    // 從 allDrops 或 gachaMachines 查找物品的英文名稱
    let englishItemName: string | null = null

    // 1. 先從 allDrops 查找
    const dropItem = allDrops.find(drop => drop.itemId === itemId)
    if (dropItem) {
      englishItemName = dropItem.itemName
    }

    // 2. 如果 allDrops 沒有，從 gachaMachines 查找
    if (!englishItemName) {
      for (const machine of gachaMachines) {
        const gachaItem = machine.items.find(item => item.itemId === itemId)
        if (gachaItem) {
          englishItemName = gachaItem.name || gachaItem.itemName || ''
          break
        }
      }
    }

    // 3. 用英文名稱查詢 merchantItemIndex
    if (englishItemName) {
      const sources = merchantItemIndex.get(englishItemName.toLowerCase())
      if (sources && sources.length > 0) {
        return sources
      }
    }

    // Fallback: 用傳入的 itemName 嘗試（可能是英文）
    if (itemName) {
      const sources = merchantItemIndex.get(itemName.toLowerCase())
      if (sources && sources.length > 0) {
        return sources
      }
    }

    return []
  }, [itemId, itemName, allDrops, gachaMachines, merchantItemIndex])

  // 計算 Unwelcome Guest 製作配方（如果適用）
  const craftingRecipe = useMemo(() => {
    if (!itemId && itemId !== 0) return null
    if (!isUnwelcomeGuestItem(itemId)) return null
    return getMultiStageRecipe(itemId)
  }, [itemId])

  // 計算升級到下一階段的配方（如果適用）
  const upgradeRecipe = useMemo(() => {
    if (!itemId && itemId !== 0) return null
    if (!isUnwelcomeGuestItem(itemId)) return null
    return getNextStageRecipe(itemId)
  }, [itemId])

  // 查詢捲軸兌換資訊（O(1) Map 查詢）
  const scrollExchangeInfo = useMemo(() => {
    if (!itemId && itemId !== 0) return null
    return getScrollExchangeInfo(itemId)
  }, [itemId])

  // 查找物品屬性資料（直接使用 ItemsOrganizedData 格式）
  const itemOrganizedData = useMemo((): ItemsOrganizedData | null => {
    if (!itemId && itemId !== 0) return null

    // 1. 優先使用 itemDetailed（來自 items-organized JSON）
    if (itemDetailed) {
      return itemDetailed
    }

    // 2. 如果 Detailed 資料還在載入中，返回 null 以顯示載入動畫
    if (shouldLoadDetailed && isLoadingDetailed) {
      clientLogger.info(`物品 ${itemId} Detailed 資料載入中，等待完整資料`)
      return null
    }

    // 3. 如果找不到，嘗試從轉蛋機資料中查找並轉換為 ItemsOrganizedData
    const organizedFromGacha = findGachaItemOrganized(itemId, gachaMachines)
    if (organizedFromGacha) {
      clientLogger.info(`物品 ${itemId} 使用轉蛋機資料作為屬性來源`)
      return organizedFromGacha
    }

    // 4. 如果載入失敗，記錄錯誤
    if (detailedError) {
      clientLogger.error(`物品 ${itemId} Detailed 資料載入失敗`, detailedError)
    }

    return null
  }, [itemId, itemDetailed, shouldLoadDetailed, isLoadingDetailed, detailedError, gachaMachines])

  // 根據語言選擇顯示名稱（優先從 items-organized 取）
  const displayItemName = useMemo(() => {
    if (language === 'zh-TW') {
      // 中文模式：優先從 items-organized 取中文名稱
      const organizedChineseName = itemOrganizedData?.description?.chineseItemName
      if (organizedChineseName) return organizedChineseName
      // 再從 itemData 取（fallback）
      if (itemData?.chineseItemName) return itemData.chineseItemName
    }
    // 英文名稱：優先從 items-organized 取
    return itemOrganizedData?.description?.name || itemData?.itemName || itemName
  }, [language, itemOrganizedData, itemData, itemName])

  // 當 Modal 開啟時載入物品屬性資料與怪物資訊資料
  useEffect(() => {
    if (isOpen) {
      loadMobInfo()
    }
  }, [isOpen, loadMobInfo])

  if (itemId === null && itemId !== 0) return null

  // 傳入 itemName 以支援卷軸圖示
  const itemIconUrl = getItemImageUrl(itemId, { itemName })

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      zIndex="z-[60]"
      maxWidth="max-w-[85vw]"
      floatingLeft={
        hasPreviousModal && onGoBack && (
          <button
            onClick={onGoBack}
            className="p-2 min-h-[44px] transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1 text-white dark:text-gray-300 hover:text-green-500"
            aria-label={t('modal.goBack')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
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
          {/* 複製截圖按鈕 */}
          <button
            onClick={() => copyToClipboard(screenshotRef.current)}
            disabled={isCapturing}
            className="p-3 min-h-[44px] min-w-[44px] transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center text-white dark:text-gray-300 hover:text-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('screenshot.copy')}
            title={t('screenshot.copy')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
          {/* 下載截圖按鈕 */}
          <button
            onClick={() => downloadPng(screenshotRef.current)}
            disabled={isCapturing}
            className="p-3 min-h-[44px] min-w-[44px] transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center text-white dark:text-gray-300 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('screenshot.download')}
            title={t('screenshot.download')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </>
      }
    >
      {/* 截圖區域包裹 */}
      <div ref={screenshotRef} className="bg-white dark:bg-gray-800 rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* 手機版 Tab 切換（只在手機版顯示） */}
        <div className="lg:hidden border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex">
            <button
              onClick={() => setMobileTab('info')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                mobileTab === 'info'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {t('item.info') || '物品資訊'}
            </button>
            <button
              onClick={() => setMobileTab('sources')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                mobileTab === 'sources'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {t('item.dropSources') || '掉落來源'} ({itemDrops.length + itemGachaSources.length + itemMerchantSources.length})
            </button>
          </div>
        </div>

        {/* Modal Content - 左右分欄佈局（手機版上下堆疊） */}
        {/* 手機版移除上方 padding，讓按鈕列貼齊 Tab */}
        <div className="px-3 pb-3 lg:p-6 flex flex-col lg:flex-row gap-3 sm:gap-6 flex-1 min-h-0 overflow-hidden">
          {/* 左側：物品屬性（桌面版顯示 / 手機版根據 Tab 顯示） */}
          {/* 手機版需要上方 padding，因為內容區域沒有 */}
          <div className={`pt-3 lg:pt-0 lg:w-[320px] lg:flex-shrink-0 space-y-4 flex-1 lg:flex-none h-full overflow-y-auto scrollbar-hide ${
            mobileTab === 'sources' ? 'hidden lg:block' : ''
          }`}>
            {/* 物品圖示與收藏按鈕 */}
            <div className="relative mb-4">
              {/* 收藏按鈕 - 左上角 */}
              <button
                onClick={() => itemId !== null && onToggleFavorite(itemId, itemName)}
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
              {/* 物品圖片 - 置中 */}
              <div className="flex justify-center">
                <img
                  src={itemIconUrl}
                  alt={displayItemName}
                  className="w-24 h-24 sm:w-32 sm:h-32 object-contain"
                />
              </div>
              {/* 物品名稱 */}
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white text-center mt-2">
                {displayItemName}
              </h2>
              {showDevInfo && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-0.5">
                  <p>{t('modal.itemId')}: {itemId}</p>
                  {itemOrganizedData?.externalIds && Object.entries(itemOrganizedData.externalIds).map(([key, value]) => (
                    <p key={key} className="text-purple-600 dark:text-purple-400">
                      {key}: {value}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* 物品屬性卡片 - 改進載入狀態判斷 */}
            {isLoadingDetailed ? (
              // 狀態 1: 載入中 - 顯示 spinner
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">{t('loading')}</p>
              </div>
            ) : detailedError && !itemOrganizedData ? (
              // 狀態 2: 載入失敗且無 fallback - 顯示重試按鈕
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-8 shadow-sm text-center border border-yellow-200 dark:border-yellow-800">
                <svg className="mx-auto h-12 w-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="mt-4 text-yellow-700 dark:text-yellow-300">
                  {detailedError.message === 'CHUNK_LOAD_ERROR'
                    ? t('error.versionMismatch')
                    : t('item.loadFailed')}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
                >
                  {t('error.refreshPage')}
                </button>
              </div>
            ) : (
              // 狀態 3: 有資料或無屬性 - 顯示屬性卡片
              <ItemAttributesCard itemData={itemOrganizedData} enableSettings />
            )}
          </div>

          {/* 右側：轉蛋機來源 + 掉落來源怪物列表（桌面版顯示 / 手機版根據 Tab 顯示） */}
          <div className={`flex-1 lg:w-2/3 h-full overflow-y-auto scrollbar-hide ${
            mobileTab === 'info' ? 'hidden lg:block' : ''
          }`}>
            {/* 轉蛋機來源區塊 */}
            {itemGachaSources.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4 hidden lg:block">
                  {t('item.gachaSources')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-1">
                  {itemGachaSources.map((source) => {
                    const displayMachineName = language === 'zh-TW' && source.chineseMachineName
                      ? source.chineseMachineName
                      : source.machineName

                    return (
                      <div
                        key={source.machineId}
                        onClick={() => onGachaMachineClick(source.machineId)}
                        className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow-lg hover:shadow-xl p-5 border border-purple-200 dark:border-purple-700 cursor-pointer hover:scale-[1.02] transition-all duration-300 active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {displayMachineName}
                              {source.machineId === 7 && (
                                <span className="text-red-500 dark:text-red-400 ml-1">
                                  {t('gacha.closed')}
                                </span>
                              )}
                            </p>
                            {showDevInfo && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t('modal.machineId')}: {source.machineId}
                              </p>
                            )}
                          </div>
                          <div className="bg-purple-100 dark:bg-purple-800 px-3 py-1 rounded-full">
                            <span className="text-sm font-bold text-purple-700 dark:text-purple-200">
                              {source.probability}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 商人販售區塊 */}
            {itemMerchantSources.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4 hidden lg:block">
                  {t('item.merchantSources')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-1">
                  {itemMerchantSources.map((source) => {
                    const displayMapName = language === 'zh-TW'
                      ? source.chineseMapName || source.mapName
                      : source.mapName

                    return (
                      <div
                        key={source.mapId}
                        className="bg-stone-50 dark:bg-stone-900/20 rounded-lg shadow-lg p-5 border border-stone-200 dark:border-stone-700"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {displayMapName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {source.region}
                            </p>
                          </div>
                          <div className="bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full">
                            <span className="text-sm font-bold text-stone-700 dark:text-stone-200">
                              100%
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 捲軸兌換資訊區塊（與轉蛋機來源卡片同格式） */}
            {scrollExchangeInfo && (
              <div className="mb-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4 hidden lg:block">
                  {t('scrollExchange.title')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-1">
                  <div
                    onClick={() => {
                      onClose()
                      onScrollExchangeClick?.()
                    }}
                    className="bg-amber-50 dark:bg-amber-900/20 rounded-lg shadow-lg hover:shadow-xl p-5 border border-amber-200 dark:border-amber-700 cursor-pointer hover:scale-[1.02] transition-all duration-300 active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {t('scrollExchange.col.rate')}: {scrollExchangeInfo.ExchangeRate}
                        </p>
                        {scrollExchangeInfo.ScrollVoucherReq > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('scrollExchange.col.voucher')}: {scrollExchangeInfo.ScrollVoucherReq}
                          </p>
                        )}
                      </div>
                      <div className="bg-amber-100 dark:bg-amber-800 px-3 py-1 rounded-full">
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-200">
                          {scrollExchangeInfo.ScrollPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 製作配方區塊（Unwelcome Guest 系列） */}
            {craftingRecipe && (
              <div className="mb-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4 hidden lg:block">
                  {language === 'zh-TW' ? '製作方法' : 'Crafting Recipe'}
                </h3>
                <CraftingRecipeCard
                  recipe={craftingRecipe}
                  onItemClick={(itemId) => {
                    // 跳轉到前階武器詳情（使用空字串作為名稱，Modal 會自動獲取）
                    onItemClick?.(itemId, '')
                  }}
                />
                {/* 升級路徑（1st/2nd/3rd 階段顯示） */}
                {upgradeRecipe && (
                  <div className="mt-4">
                    <UpgradePathCard
                      recipe={upgradeRecipe}
                      onItemClick={(itemId) => onItemClick?.(itemId, '')}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 怪物掉落區塊 */}
            {itemDrops.length > 0 && (
              <div>
                {/* 掉落來源標題和視圖切換 */}
                <div className="flex items-center justify-between mb-3 sm:mb-4 sticky top-0 bg-white dark:bg-gray-800 z-10 py-2">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 hidden lg:block">
                    {t('card.droppedBy')} ({itemDrops.length})
                  </h3>
                  {/* 切換按鈕區域 */}
                  <div className="flex gap-2 lg:ml-auto">
                    {/* 顯示圖示切換按鈕 */}
                    <button
                      onClick={() => setShowDropIconsWithSync(!showDropIcons)}
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
                    {/* 視圖切換按鈕 */}
                    <button
                      onClick={() => setViewModeWithSync(viewMode === 'grid' ? 'list' : 'grid')}
                      className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      aria-label={viewMode === 'grid' ? '切換為列表視圖' : '切換為卡片視圖'}
                      title={viewMode === 'grid' ? '切換為列表視圖' : '切換為卡片視圖'}
                    >
                      {viewMode === 'grid' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {/* 根據視圖模式渲染不同的佈局 */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-1">
                    {itemDrops.map((drop, idx) => (
                      <MonsterDropCard
                        key={`${drop.mobId}-${idx}`}
                        drop={drop}
                        monsterHPMap={monsterHPMap}
                        isFavorite={isMonsterFavorite(drop.mobId)}
                        onToggleFavorite={onToggleMonsterFavorite}
                        onMonsterClick={onMonsterClick}
                        showIcons={showDropIcons}
                      />
                    ))}
                  </div>
                ) : (
                  <MonsterDropList
                    drops={itemDrops}
                    monsterHPMap={monsterHPMap}
                    isMonsterFavorite={isMonsterFavorite}
                    onToggleFavorite={onToggleMonsterFavorite}
                    onMonsterClick={onMonsterClick}
                  />
                )}
              </div>
            )}

            {/* 當沒有任何來源時顯示提示 */}
            {itemDrops.length === 0 && itemGachaSources.length === 0 && itemMerchantSources.length === 0 && !scrollExchangeInfo && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  {t('item.noSources')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

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
