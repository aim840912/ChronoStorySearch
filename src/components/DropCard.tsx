'use client'

import { useState } from 'react'
import type { DropItem } from '@/types'

interface DropCardProps {
  drop: DropItem
  onCardClick: (mobId: number, mobName: string) => void
  isFavorite: boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
}

/**
 * 掉落資料卡片元件（用於全部模式）
 * 顯示怪物及其掉落物品的完整資訊
 */
export function DropCard({ drop, onCardClick, isFavorite, onToggleFavorite }: DropCardProps) {
  const isDev = process.env.NODE_ENV === 'development'
  const [imageError, setImageError] = useState(false)
  const [itemImageError, setItemImageError] = useState(false)
  const chancePercent = (drop.chance * 100).toFixed(4)
  const qtyRange =
    drop.minQty === drop.maxQty ? `${drop.minQty}` : `${drop.minQty}-${drop.maxQty}`

  // 使用本地圖片，錯誤時使用預設圖示
  const monsterIconUrl = imageError
    ? '/images/monsters/default.svg'
    : `/images/monsters/${drop.mobId}.png`

  // 物品圖示 URL（itemId = 0 是 Meso，不顯示圖示）
  const itemIconUrl =
    drop.itemId === 0
      ? null
      : itemImageError
        ? '/images/items/default.svg'
        : `/images/items/${drop.itemId}.png`

  return (
    <div
      onClick={() => onCardClick(drop.mobId, drop.mobName)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative"
    >
      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(drop.mobId, drop.mobName)
        }}
        className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
          isFavorite
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600'
        }`}
        aria-label={isFavorite ? '取消收藏' : '加入收藏'}
      >
        <svg
          className="w-5 h-5"
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

      {/* 怪物資訊 */}
      <div className="flex items-center gap-3 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={monsterIconUrl}
          alt={drop.mobName}
          className="w-12 h-12 object-contain flex-shrink-0"
          onError={() => setImageError(true)}
        />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{drop.mobName}</h3>
          {isDev && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              怪物 ID: {drop.mobId}
            </p>
          )}
        </div>
      </div>

      {/* 掉落物品資訊 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          {/* 物品圖示 */}
          {itemIconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={itemIconUrl}
              alt={drop.itemName}
              className="w-8 h-8 object-contain flex-shrink-0"
              onError={() => setItemImageError(true)}
            />
          ) : (
            <span className="text-lg">💰</span>
          )}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">掉落:</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {drop.itemName}
            </span>
          </div>
        </div>

        {/* 機率和數量 */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">掉落機率</div>
            <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded">
              <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                {chancePercent}%
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">掉落數量</div>
            <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded">
              <span className="text-sm font-bold text-green-700 dark:text-green-300">
                {qtyRange}
              </span>
            </div>
          </div>
        </div>

        {/* 物品 ID */}
        {isDev && (
          <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            物品 ID: {drop.itemId}
          </div>
        )}
      </div>
    </div>
  )
}
