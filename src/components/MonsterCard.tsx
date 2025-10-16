'use client'

import { useState } from 'react'

interface MonsterCardProps {
  mobId: number
  mobName: string
  dropCount: number
  onCardClick: (mobId: number, mobName: string) => void
  isFavorite: boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
}

/**
 * 怪物卡片元件（用於最愛怪物模式）
 * 顯示怪物基本資訊和掉落物數量
 */
export function MonsterCard({
  mobId,
  mobName,
  dropCount,
  onCardClick,
  isFavorite,
  onToggleFavorite,
}: MonsterCardProps) {
  const isDev = process.env.NODE_ENV === 'development'
  const [imageError, setImageError] = useState(false)

  const monsterIconUrl = imageError
    ? '/images/monsters/default.svg'
    : `/images/monsters/${mobId}.png`

  return (
    <div
      onClick={() => onCardClick(mobId, mobName)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative"
    >
      {/* 最愛按鈕 - 右上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(mobId, mobName)
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
      <div className="flex items-center gap-3 mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={monsterIconUrl}
          alt={mobName}
          className="w-16 h-16 object-contain flex-shrink-0"
          onError={() => setImageError(true)}
        />
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {mobName}
          </h3>
          {isDev && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              怪物 ID: {mobId}
            </p>
          )}
        </div>
      </div>

      {/* 掉落物數量資訊 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
            </svg>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              掉落物品
            </span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {dropCount} 種
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          點擊查看所有掉落物品
        </p>
      </div>
    </div>
  )
}
