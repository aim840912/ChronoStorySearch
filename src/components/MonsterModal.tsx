'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DropsEssential, ItemAttributesEssential, MobMapMonster } from '@/types'
import { DropItemCard } from './DropItemCard'
import { MonsterStatsCard } from './MonsterStatsCard'
import { MonsterLocationsCard } from './MonsterLocationsCard'
import { Toast } from './Toast'
import { BaseModal } from './common/BaseModal'
import { ItemAttributesTooltip } from './ItemAttributesTooltip'
import { getMonsterImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { useLanguageToggle } from '@/hooks/useLanguageToggle'
import { useShare } from '@/hooks/useShare'
import { useLazyMobInfo, useLazyDropsDetailed, useLazyMobMaps } from '@/hooks/useLazyData'

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
}: MonsterModalProps) {
  const { t, language } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'
  const toast = useToast()
  const toggleLanguage = useLanguageToggle()
  const handleShare = useShare(() => `${window.location.origin}${window.location.pathname}#monster=${monsterId}`)
  // 手機版 Tab 狀態（'info' = 怪物資訊, 'drops' = 掉落物品）
  const [mobileTab, setMobileTab] = useState<'info' | 'drops'>('info')

  // Tooltip 狀態（hover 物品時顯示）
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null)
  const [hoveredItemName, setHoveredItemName] = useState<string>('')
  const [hoveredItemRect, setHoveredItemRect] = useState<DOMRect | null>(null)

  // 懶加載怪物資訊資料
  const {
    data: mobInfoData,
    loadData: loadMobInfo,
  } = useLazyMobInfo()

  // 懶加載地圖怪物映射資料
  const {
    mapIdToDataMap: mobMapsData,
    loadData: loadMobMaps,
  } = useLazyMobMaps()

  // 懶加載該怪物的 Detailed 掉落資料（包含機率、數量等完整資訊）
  const {
    data: monsterDropsDetailed,
  } = useLazyDropsDetailed(monsterId)

  // 使用 Detailed 資料（包含完整掉落資訊）
  // 用 useMemo 包裹以避免 useEffect 依賴變化
  const monsterDrops = useMemo(() => {
    return monsterDropsDetailed || []
  }, [monsterDropsDetailed])

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
      mobInfoData.find((info) => info.mob.mob_id === String(monsterId)) || null
    )
  }, [monsterId, mobInfoData])

  // 查找怪物出沒地圖（結合 mobInfo.maps 和 mobMapsData）
  const monsterLocations = useMemo(() => {
    if (!mobInfo?.maps || mobInfo.maps.length === 0) return undefined

    return mobInfo.maps.map(map => {
      const mapId = map.map_id

      // 從 mobMapsData 找到該地圖的所有怪物
      const mapData = mobMapsData?.get(mapId)
      const mapMonsters = mapData?.monsters || []

      // 組裝 MonsterSpawn[] 資料
      const monsters = mapMonsters
        .filter((monster: MobMapMonster) => monster.mob_name !== monsterName) // 過濾掉當前怪物
        .map((monster: MobMapMonster) => {
          // 從 mobInfoData 找到該怪物的詳細資訊（level, baseXP）
          const mobDetail = mobInfoData?.find(info => info.mob.mob_id === monster.mob_id)

          return {
            name: monster.mob_name,
            level: mobDetail?.mob.level || null,
            baseXP: mobDetail?.mob.exp || null,
          }
        })

      return {
        name: map.map_name,
        chineseName: map.chinese_map_name || undefined,
        npcs: [],
        monsters,
        links: [],
        regionName: '',
        regionCode: ''
      }
    })
  }, [mobInfo, mobMapsData, mobInfoData, monsterName])

  // 當 Modal 開啟時載入怪物資訊資料
  useEffect(() => {
    if (isOpen) {
      loadMobInfo()
      loadMobMaps()
    }
  }, [isOpen, loadMobInfo, loadMobMaps])

  // Hover 物品事件處理
  const handleItemHover = (itemId: number | null, itemName: string, rect: DOMRect | null) => {
    setHoveredItemId(itemId)
    setHoveredItemName(itemName)
    setHoveredItemRect(rect)
  }

  if (!monsterId) return null

  const monsterIconUrl = getMonsterImageUrl(monsterId)

  return (
    <>
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
    >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-blue-500 dark:bg-blue-600 p-4 sm:p-6 rounded-t-xl">
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
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{displayMonsterName}</h2>
              <p className="text-blue-100 text-xs sm:text-sm">
                {isDev && `${t('modal.monsterId')}: ${monsterId} · `}{t('modal.monsterDropCount').replace('{count}', String(monsterDrops.length))}
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
                onClick={() => monsterId && onToggleFavorite(monsterId, monsterName)}
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
              {t('monster.drops') || '掉落物品'} ({monsterDrops.length})
            </button>
          </div>
        </div>

        {/* Modal Content - 左右分欄佈局（手機版上下堆疊） */}
        <div className="p-3 sm:p-6 flex flex-col lg:flex-row gap-3 sm:gap-6 flex-1 overflow-hidden">
          {/* 左側：怪物屬性（桌面版顯示 / 手機版根據 Tab 顯示） */}
          <div className={`lg:w-1/3 space-y-4 overflow-y-auto scrollbar-hide ${
            mobileTab === 'drops' ? 'hidden lg:block' : ''
          }`}>
            {/* 怪物圖示 */}
            <div className="flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={monsterIconUrl}
                alt={displayMonsterName}
                className="w-24 h-24 sm:w-32 sm:h-32 object-contain"
              />
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
            {/* 出沒地圖卡片 */}
            <MonsterLocationsCard
              monsterName={monsterData?.mobName || monsterName}
              locations={monsterLocations}
              mobInfoData={mobInfoData}
            />
          </div>

          {/* 右側：掉落物品（桌面版顯示 / 手機版根據 Tab 顯示） */}
          <div className={`lg:w-2/3 overflow-y-auto scrollbar-hide ${
            mobileTab === 'info' ? 'hidden lg:block' : ''
          }`}>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4 hidden lg:block">
              {t('monster.drops')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {monsterDrops.map((drop, index) => (
                <DropItemCard
                  key={`${drop.itemId}-${index}`}
                  drop={drop}
                  itemAttributesMap={itemAttributesMap}
                  isFavorite={isItemFavorite(drop.itemId)}
                  onToggleFavorite={onToggleItemFavorite}
                  onItemClick={onItemClick}
                  onItemHover={handleItemHover}
                />
              ))}
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

    {/* Hover 物品提示框（桌面版） */}
    <ItemAttributesTooltip
      isOpen={hoveredItemId !== null}
      itemId={hoveredItemId}
      itemName={hoveredItemName}
      triggerRect={hoveredItemRect}
      allDrops={allDrops}
      itemAttributesMap={itemAttributesMap}
    />
    </>
  )
}
