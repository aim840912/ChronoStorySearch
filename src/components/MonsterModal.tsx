'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DropItem } from '@/types'
import { DropItemCard } from './DropItemCard'

interface MonsterModalProps {
  isOpen: boolean
  onClose: () => void
  monsterId: number | null
  monsterName: string
  allDrops: DropItem[]
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
  isFavorite,
  onToggleFavorite,
  isItemFavorite,
  onToggleItemFavorite,
  onItemClick,
}: MonsterModalProps) {
  const isDev = process.env.NODE_ENV === 'development'
  const [monsterImageError, setMonsterImageError] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // 過濾該怪物的所有掉落物品
  const monsterDrops = useMemo(() => {
    if (!monsterId) return []
    return allDrops.filter((drop) => drop.mobId === monsterId)
  }, [monsterId, allDrops])

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
      setToastMessage('連結已複製到剪貼簿')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (error) {
      setToastMessage('複製失敗，請手動複製')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  if (!isOpen || !monsterId) return null

  const monsterIconUrl = monsterImageError
    ? '/images/monsters/default.svg'
    : `/images/monsters/${monsterId}.png`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={monsterIconUrl}
                alt={monsterName}
                className="w-16 h-16 object-contain"
                onError={() => setMonsterImageError(true)}
              />
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{monsterName}</h2>
                <p className="text-blue-100 text-sm">
                  {isDev && `怪物 ID: ${monsterId} · `}共 {monsterDrops.length} 種掉落物品
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 最愛按鈕 */}
              <button
                onClick={() => monsterId && onToggleFavorite(monsterId, monsterName)}
                className={`p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
                  isFavorite
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                }`}
                aria-label={isFavorite ? '取消收藏' : '加入收藏'}
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
                aria-label="分享連結"
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
                aria-label="關閉"
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

        {/* Modal Content - 掉落物品列表 */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monsterDrops.map((drop, index) => (
              <DropItemCard
                key={`${drop.itemId}-${index}`}
                drop={drop}
                isFavorite={isItemFavorite(drop.itemId)}
                onToggleFavorite={onToggleItemFavorite}
                onItemClick={onItemClick}
              />
            ))}
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
