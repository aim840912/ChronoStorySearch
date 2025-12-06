'use client'

import { memo, useState } from 'react'

interface FavoriteButtonProps {
  isFavorite: boolean
  onToggle: () => void
  ariaLabel?: string
}

/**
 * 收藏按鈕組件（CSS 動畫版本）
 *
 * 提供：
 * - 點擊時的縮放動畫
 * - 收藏時的心跳效果
 * - prefers-reduced-motion 無障礙支援
 */
export const FavoriteButton = memo(function FavoriteButton({
  isFavorite,
  onToggle,
  ariaLabel = 'Toggle favorite',
}: FavoriteButtonProps) {
  // 用於觸發心跳動畫
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    // 如果即將收藏（目前未收藏），觸發心跳動畫
    if (!isFavorite) {
      setIsAnimating(true)
      // 動畫結束後重置
      setTimeout(() => setIsAnimating(false), 300)
    }

    onToggle()
  }

  return (
    <button
      onClick={handleClick}
      className={`
        p-2 rounded-full
        transition-all duration-200

        /* 顏色 */
        ${isFavorite
          ? 'text-red-500 hover:text-red-600'
          : 'text-gray-400 hover:text-red-400'
        }

        /* 點擊效果 */
        active:scale-[0.85]

        /* 心跳動畫 */
        ${isAnimating ? 'animate-heartbeat' : ''}

        /* 減少動畫偏好支援 */
        motion-reduce:active:scale-100
        motion-reduce:animate-none
      `}
      aria-label={ariaLabel}
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
  )
})
