'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DropsEssential, Language, GachaMachine, ItemAttributes, ItemAttributesEssential } from '@/types'
import { MonsterDropCard } from './MonsterDropCard'
import { ItemAttributesCard } from './ItemAttributesCard'
import { clientLogger } from '@/lib/logger'
import { getItemImageUrl, getMonsterImageUrl, preloadImages } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLazyMobInfo, useLazyItemDetailed } from '@/hooks/useLazyData'
import { findGachaItemAttributes } from '@/lib/gacha-utils'

interface ItemModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: number | null
  itemName: string
  allDrops: DropsEssential[]  // 改為 Essential（只需基本資訊）
  gachaMachines: GachaMachine[]
  itemAttributesMap: Map<number, ItemAttributesEssential>
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
  isFavorite,
  onToggleFavorite,
  isMonsterFavorite,
  onToggleMonsterFavorite,
  onMonsterClick,
  onGachaMachineClick,
  hasPreviousModal,
  onGoBack,
}: ItemModalProps) {
  const { t, language, setLanguage } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  // 手機版 Tab 狀態（'info' = 物品資訊, 'sources' = 掉落來源）
  const [mobileTab, setMobileTab] = useState<'info' | 'sources'>('info')

  // 懶加載怪物資訊資料 (用於顯示怪物血量)
  const {
    monsterHPMap,
    loadData: loadMobInfo,
  } = useLazyMobInfo()

  // 懶加載物品詳細資料 (用於顯示完整物品屬性)
  // 只對存在於 itemAttributesMap 的物品載入 Detailed 資料
  // 純轉蛋物品會直接使用轉蛋機資料，無需載入 Detailed（避免 console 錯誤）
  const shouldLoadDetailed = itemId !== null && itemAttributesMap.has(itemId)

  const {
    data: itemDetailed,
    isLoading: isLoadingDetailed,
    error: detailedError,
  } = useLazyItemDetailed(shouldLoadDetailed ? itemId : null)

  // 語言切換函數
  const toggleLanguage = () => {
    const newLanguage: Language = language === 'zh-TW' ? 'en' : 'zh-TW'
    setLanguage(newLanguage)
  }

  // 過濾該物品的所有掉落來源怪物
  const itemDrops = useMemo(() => {
    if (!itemId && itemId !== 0) return []
    return allDrops.filter((drop) => drop.itemId === itemId)
  }, [itemId, allDrops])

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

  // 根據語言選擇顯示名稱
  const displayItemName = useMemo(() => {
    // 如果沒有找到 itemData，才回退到 prop
    if (!itemData) return itemName

    // 總是從 itemData 中取名稱（保證數據源一致）
    if (language === 'zh-TW') {
      // 中文模式：優先用中文，沒有就用英文
      return itemData.chineseItemName || itemData.itemName
    }
    // 英文模式：直接用英文名稱
    return itemData.itemName
  }, [language, itemData, itemName])

  // 查找物品屬性資料（組合 Essential + Detailed 資料）
  const itemAttributes = useMemo(() => {
    if (!itemId && itemId !== 0) return null

    // 1. 優先組合 Essential + Detailed 資料
    const essentialData = itemAttributesMap.get(itemId)
    if (essentialData && itemDetailed) {
      // 組合成完整的 ItemAttributes
      const combined: ItemAttributes = {
        item_id: essentialData.item_id,
        item_name: essentialData.item_name,
        type: essentialData.type,
        sub_type: essentialData.sub_type,
        // 從 Detailed 資料補充完整屬性
        item_type_id: itemDetailed.item_type_id,
        sale_price: itemDetailed.sale_price,
        max_stack_count: itemDetailed.max_stack_count,
        untradeable: itemDetailed.untradeable,
        item_description: itemDetailed.item_description,
        equipment: itemDetailed.equipment,
        scroll: itemDetailed.scroll,
        potion: itemDetailed.potion,
      }
      return combined
    }

    // 2. 如果 Detailed 資料還在載入中，僅使用 Essential 資料（部分顯示）
    if (essentialData && isLoadingDetailed) {
      clientLogger.info(`物品 ${itemId} Detailed 資料載入中，暫時使用 Essential 資料`)
      // 返回部分資料（只有基本資訊）
      return {
        item_id: essentialData.item_id,
        item_name: essentialData.item_name,
        type: essentialData.type,
        sub_type: essentialData.sub_type,
        item_type_id: 0,
        sale_price: null,
        max_stack_count: null,
        untradeable: null,
        item_description: null,
      } as ItemAttributes
    }

    // 3. 如果找不到，嘗試從轉蛋機資料中查找並轉換
    const attributesFromGacha = findGachaItemAttributes(itemId, gachaMachines)
    if (attributesFromGacha) {
      clientLogger.info(`物品 ${itemId} 使用轉蛋機資料作為屬性來源`)
      return attributesFromGacha
    }

    // 4. 如果載入失敗，記錄錯誤
    if (detailedError) {
      clientLogger.error(`物品 ${itemId} Detailed 資料載入失敗`, detailedError)
    }

    return null
  }, [itemId, itemAttributesMap, itemDetailed, isLoadingDetailed, detailedError, gachaMachines])

  // 當 Modal 開啟時載入物品屬性資料與怪物資訊資料，並預載入圖片
  useEffect(() => {
    if (isOpen) {
      loadMobInfo()

      // 預載入所有要顯示的圖片（背景執行，不阻塞 UI）
      const imagesToPreload: string[] = []

      // 1. 物品圖示
      if (itemId !== null) {
        imagesToPreload.push(getItemImageUrl(itemId, undefined, false))
      }

      // 2. 掉落怪物圖示
      itemDrops.forEach(drop => {
        imagesToPreload.push(getMonsterImageUrl(drop.mobId, undefined, false))
      })

      // 執行批次預載入
      if (imagesToPreload.length > 0) {
        preloadImages(imagesToPreload).catch(error => {
          clientLogger.warn('批次預載入圖片失敗', error)
        })
      }
    }
  }, [isOpen, loadMobInfo, itemId, itemDrops])

  // ESC 鍵關閉 modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // 分享功能 - 複製連結到剪貼簿
  const handleShare = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}?item=${itemId}`
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

  if (!isOpen || (itemId === null && itemId !== 0)) return null

  const itemIconUrl = getItemImageUrl(itemId)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow-2xl w-full max-w-6xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-green-500 dark:bg-green-600 p-4 sm:p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center">
              {hasPreviousModal && onGoBack && (
                <button
                  onClick={onGoBack}
                  className="p-3 min-h-[44px] rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30 flex items-center gap-2"
                  aria-label={t('modal.goBack')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm font-medium hidden sm:inline">{t('modal.goBack')}</span>
                </button>
              )}
            </div>
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{displayItemName}</h2>
              <p className="text-green-100 text-xs sm:text-sm">
                {isDev && `${t('modal.itemId')}: ${itemId} · `}{t('modal.itemDropCount').replace('{count}', String(itemDrops.length))}
              </p>
            </div>
            <div className="flex-1 flex items-center gap-2 justify-end">
              {/* 語言切換按鈕 */}
              <button
                onClick={toggleLanguage}
                className="p-3 min-h-[44px] min-w-[44px] rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30 flex items-center justify-center"
                aria-label={t('language.toggle')}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              {/* 最愛按鈕 */}
              <button
                onClick={() => itemId !== null && onToggleFavorite(itemId, itemName)}
                className={`p-3 min-h-[44px] min-w-[44px] rounded-full transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                  isFavorite
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
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
              {/* 分享按鈕 */}
              <button
                onClick={handleShare}
                className="p-3 min-h-[44px] min-w-[44px] rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30 flex items-center justify-center"
                aria-label={t('modal.share')}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                onClick={onClose}
                className="p-3 min-h-[44px] min-w-[44px] text-white hover:bg-white/20 rounded-full transition-colors flex items-center justify-center"
                aria-label={t('modal.close')}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

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
              {t('item.dropSources') || '掉落來源'} ({itemDrops.length + itemGachaSources.length})
            </button>
          </div>
        </div>

        {/* Modal Content - 左右分欄佈局（手機版上下堆疊） */}
        <div className="p-3 sm:p-6 flex flex-col lg:flex-row gap-3 sm:gap-6 flex-1 overflow-hidden">
          {/* 左側：物品屬性（桌面版顯示 / 手機版根據 Tab 顯示） */}
          <div className={`lg:w-1/3 space-y-4 overflow-y-auto scrollbar-hide ${
            mobileTab === 'sources' ? 'hidden lg:block' : ''
          }`}>
            {/* 物品圖示 */}
            <div className="flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={itemIconUrl}
                alt={displayItemName}
                className="w-24 h-24 sm:w-32 sm:h-32 object-contain"
              />
            </div>
            <ItemAttributesCard attributes={itemAttributes} />
          </div>

          {/* 右側：轉蛋機來源 + 掉落來源怪物列表（桌面版顯示 / 手機版根據 Tab 顯示） */}
          <div className={`lg:w-2/3 overflow-y-auto scrollbar-hide ${
            mobileTab === 'info' ? 'hidden lg:block' : ''
          }`}>
            {/* 轉蛋機來源區塊 */}
            {itemGachaSources.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4 flex items-center gap-2 hidden lg:flex">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {t('item.gachaSources')}
                </h3>
                <div className="space-y-3">
                  {itemGachaSources.map((source) => {
                    const displayMachineName = language === 'zh-TW' && source.chineseMachineName
                      ? source.chineseMachineName
                      : source.machineName

                    return (
                      <div
                        key={source.machineId}
                        onClick={() => onGachaMachineClick(source.machineId)}
                        className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-purple-500 text-white rounded-full p-3">
                              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                              </svg>
                            </div>
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

            {/* 怪物掉落區塊 */}
            {itemDrops.length > 0 && (
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4 hidden lg:block">
                  {t('card.droppedBy')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
              </div>
            )}

            {/* 當沒有任何來源時顯示提示 */}
            {itemDrops.length === 0 && itemGachaSources.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  {t('item.noSources')}
                </p>
              </div>
            )}
          </div>
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
