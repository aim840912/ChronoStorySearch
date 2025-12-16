'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import type { DropsEssential, GachaMachine, ItemAttributesEssential, ItemsOrganizedData, DropsByItemMonster } from '@/types'
import { MonsterDropCard } from './MonsterDropCard'
import { MonsterDropList } from './MonsterDropList'
import { ItemAttributesCard } from './ItemAttributesCard'
import { Toast } from './Toast'
import { BaseModal } from './common/BaseModal'
import { AdSenseDisplay } from './adsense/AdSenseDisplay'
import { AdSenseAnchor } from './adsense/AdSenseAnchor'
import { clientLogger } from '@/lib/logger'
import { getItemImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { useScreenshot } from '@/hooks/useScreenshot'
import { useLazyMobInfo, useLazyItemDetailed, useLazyDropsByItem } from '@/hooks/useLazyData'
import { findGachaItemOrganized } from '@/lib/gacha-utils'
import { useLocalStorage } from '@/hooks/useLocalStorage'

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
  hasPreviousModal,
  onGoBack,
}: ItemModalProps) {
  const { t, language } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'
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
      floatingLeftAd={<AdSenseDisplay />}
      floatingRightAd={<AdSenseDisplay />}
      floatingTopAd={<AdSenseAnchor />}
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
        <div className="p-3 sm:p-6 flex flex-col lg:flex-row gap-3 sm:gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* 左側：物品屬性（桌面版顯示 / 手機版根據 Tab 顯示） */}
          <div className={`lg:w-[320px] lg:flex-shrink-0 space-y-4 lg:h-full lg:overflow-y-auto scrollbar-hide ${
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
              {isDev && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {t('modal.itemId')}: {itemId}
                </p>
              )}
            </div>

            {/* 物品屬性卡片 - 載入中顯示動畫 */}
            {isLoadingDetailed && !itemOrganizedData ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
                <p className="mt-4 text-white dark:text-gray-300">{t('loading')}</p>
              </div>
            ) : (
              <ItemAttributesCard itemData={itemOrganizedData} />
            )}
          </div>

          {/* 右側：轉蛋機來源 + 掉落來源怪物列表（桌面版顯示 / 手機版根據 Tab 顯示） */}
          <div className={`lg:w-2/3 lg:h-full lg:overflow-y-auto scrollbar-hide ${
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
                            </p>
                            {isDev && (
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

            {/* 怪物掉落區塊 */}
            {itemDrops.length > 0 && (
              <div>
                {/* 掉落來源標題和視圖切換 */}
                <div className="flex items-center justify-between mb-3 sm:mb-4 sticky top-0 bg-white dark:bg-gray-800 z-10 py-2 -mt-2">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 hidden lg:block">
                    {t('card.droppedBy')} ({itemDrops.length})
                  </h3>
                  {/* 視圖切換按鈕（桌面版放右邊，手機版放左邊） */}
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 lg:ml-auto"
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
                {/* 根據視圖模式渲染不同的佈局 */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-1">
                    {itemDrops.map((drop, index) => (
                      <MonsterDropCard
                        key={`${drop.mobId}-${index}`}
                        drop={drop}
                        monsterHPMap={monsterHPMap}
                        isFavorite={isMonsterFavorite(drop.mobId)}
                        onToggleFavorite={onToggleMonsterFavorite}
                        onMonsterClick={onMonsterClick}
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
            {itemDrops.length === 0 && itemGachaSources.length === 0 && itemMerchantSources.length === 0 && (
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
