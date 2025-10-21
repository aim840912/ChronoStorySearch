'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DropItem, Language, ItemAttributes } from '@/types'
import { DropItemCard } from './DropItemCard'
import { MonsterStatsCard } from './MonsterStatsCard'
import { clientLogger } from '@/lib/logger'
import { getMonsterImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLazyMobInfo } from '@/hooks/useLazyData'

interface MonsterModalProps {
  isOpen: boolean
  onClose: () => void
  monsterId: number | null
  monsterName: string
  allDrops: DropItem[]
  itemAttributesMap: Map<number, ItemAttributes>
  isFavorite: boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
  // 物品相關 props
  isItemFavorite: (itemId: number) => boolean
  onToggleItemFavorite: (itemId: number, itemName: string) => void
  onItemClick: (itemId: number, itemName: string) => void
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
}: MonsterModalProps) {
  const { t, language, setLanguage } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // 懶加載怪物資訊資料
  const {
    data: mobInfoData,
    loadData: loadMobInfo,
  } = useLazyMobInfo()

  // 語言切換函數
  const toggleLanguage = () => {
    const newLanguage: Language = language === 'zh-TW' ? 'en' : 'zh-TW'
    setLanguage(newLanguage)
  }

  // 過濾該怪物的所有掉落物品
  const monsterDrops = useMemo(() => {
    if (!monsterId) return []
    return allDrops.filter((drop) => drop.mobId === monsterId)
  }, [monsterId, allDrops])

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

  // 當 Modal 開啟時載入怪物資訊資料
  useEffect(() => {
    if (isOpen) {
      loadMobInfo()
    }
  }, [isOpen, loadMobInfo])

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
      const url = `${window.location.origin}${window.location.pathname}?monster=${monsterId}`
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

  if (!isOpen || !monsterId) return null

  const monsterIconUrl = getMonsterImageUrl(monsterId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-blue-500 dark:bg-blue-600 p-4 sm:p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1"></div>
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
                className="p-2 sm:p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30"
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
                className={`p-2 sm:p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
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
                className="p-2 sm:p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30"
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
                className="text-white hover:bg-white/20 rounded-full p-2 sm:p-2 transition-colors"
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

        {/* Modal Content - 左右分欄佈局（手機版上下堆疊） */}
        <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* 左側：怪物屬性（桌面版固定位置） */}
          <div className="lg:w-1/3 lg:sticky lg:top-32 lg:self-start">
            {/* 怪物圖示 */}
            <div className="flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={monsterIconUrl}
                alt={displayMonsterName}
                className="w-24 h-24 sm:w-32 sm:h-32 object-contain"
              />
            </div>
            <MonsterStatsCard mobInfo={mobInfo} />
          </div>

          {/* 右側：掉落物品（可滾動） */}
          <div className="lg:w-2/3">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4">
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
                />
              ))}
            </div>
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
