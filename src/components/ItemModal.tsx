'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DropItem, ItemAttributes } from '@/types'
import { MonsterDropCard } from './MonsterDropCard'
import { ItemAttributesCard } from './ItemAttributesCard'
import { clientLogger } from '@/lib/logger'
import { getItemImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'
import itemAttributesData from '@/../public/data/item-attributes.json'

interface ItemModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: number | null
  itemName: string
  allDrops: DropItem[]
  isFavorite: boolean
  onToggleFavorite: (itemId: number, itemName: string) => void
  // 怪物相關 props
  isMonsterFavorite: (mobId: number) => boolean
  onToggleMonsterFavorite: (mobId: number, mobName: string) => void
  onMonsterClick: (mobId: number, mobName: string) => void
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
  isFavorite,
  onToggleFavorite,
  isMonsterFavorite,
  onToggleMonsterFavorite,
  onMonsterClick,
}: ItemModalProps) {
  const { t } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // 過濾該物品的所有掉落來源怪物
  const itemDrops = useMemo(() => {
    if (!itemId && itemId !== 0) return []
    return allDrops.filter((drop) => drop.itemId === itemId)
  }, [itemId, allDrops])

  // 查找物品屬性資料
  const itemAttributes = useMemo(() => {
    if (!itemId && itemId !== 0) return null
    return (
      (itemAttributesData as ItemAttributes[]).find(
        (attr) => attr.item_id === String(itemId)
      ) || null
    )
  }, [itemId])

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

  const itemIconUrl = itemId === 0 ? null : getItemImageUrl(itemId)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - GREEN GRADIENT */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {itemIconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={itemIconUrl}
                  alt={itemName}
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center">
                  <span className="text-5xl">💰</span>
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{itemName}</h2>
                <p className="text-green-100 text-sm">
                  {isDev && `${t('modal.itemId')}: ${itemId} · `}{t('modal.itemDropCount').replace('{count}', String(itemDrops.length))}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 最愛按鈕 */}
              <button
                onClick={() => itemId !== null && onToggleFavorite(itemId, itemName)}
                className={`p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
                  isFavorite
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                }`}
                aria-label={isFavorite ? t('modal.favoriteRemove') : t('modal.favoriteAdd')}
              >
                <svg
                  className="w-6 h-6"
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
                className="p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30"
                aria-label={t('modal.share')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label={t('modal.close')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="p-6 flex flex-col lg:flex-row gap-6">
          {/* 左側：物品屬性（桌面版固定位置） */}
          <div className="lg:w-1/3 lg:sticky lg:top-32 lg:self-start">
            <ItemAttributesCard attributes={itemAttributes} />
          </div>

          {/* 右側：掉落來源怪物列表（可滾動） */}
          <div className="lg:w-2/3">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              {t('card.droppedBy')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {itemDrops.map((drop, index) => (
                <MonsterDropCard
                  key={`${drop.mobId}-${index}`}
                  drop={drop}
                  isFavorite={isMonsterFavorite(drop.mobId)}
                  onToggleFavorite={onToggleMonsterFavorite}
                  onMonsterClick={onMonsterClick}
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
