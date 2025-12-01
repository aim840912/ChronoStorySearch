'use client'

import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface FavoriteButtonProps {
  isFavorite: boolean
  onToggle: () => void
  ariaLabel?: string
}

/**
 * 收藏按鈕組件
 *
 * 提供：
 * - 點擊時的縮放動畫
 * - 收藏時的心跳效果
 * - Reduced motion 無障礙支援
 */
export const FavoriteButton = memo(function FavoriteButton({
  isFavorite,
  onToggle,
  ariaLabel = 'Toggle favorite',
}: FavoriteButtonProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.85 }}
      animate={
        shouldReduceMotion
          ? undefined
          : isFavorite
            ? { scale: [1, 1.25, 1] }
            : {}
      }
      transition={{ duration: 0.25 }}
      className={`
        p-2 rounded-full
        transition-colors duration-200
        ${
          isFavorite
            ? 'text-red-500 hover:text-red-600'
            : 'text-gray-400 hover:text-red-400'
        }
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
    </motion.button>
  )
})
