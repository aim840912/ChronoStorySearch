'use client'

import { memo, ReactNode } from 'react'

export type CardVariant = 'monster' | 'item'

interface BaseCardProps {
  children: ReactNode
  onClick?: () => void
  variant: CardVariant
  index?: number
  className?: string
}

const variantStyles = {
  monster: {
    hoverBorder: 'hover:border-red-500/50 dark:hover:border-red-400/50',
    hoverShadow: 'hover:shadow-red-500/10 dark:hover:shadow-red-400/10',
  },
  item: {
    hoverBorder: 'hover:border-blue-500/50 dark:hover:border-blue-400/50',
    hoverShadow: 'hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10',
  },
}

/**
 * 基礎卡片容器組件（CSS 動畫版本）
 *
 * 提供：
 * - 玻璃擬態效果（backdrop-blur）
 * - CSS 入場動畫（fadeInUp）
 * - Hover/Active 互動效果
 * - 怪物/物品變體樣式區分
 * - prefers-reduced-motion 無障礙支援
 */
export const BaseCard = memo(function BaseCard({
  children,
  onClick,
  variant,
  index = 0,
  className = '',
}: BaseCardProps) {
  const styles = variantStyles[variant]

  // 計算 staggered 延遲，上限 300ms
  const animationDelay = `${Math.min(index * 30, 300)}ms`

  return (
    <div
      onClick={onClick}
      style={{ animationDelay }}
      className={`
        group
        relative cursor-pointer
        bg-white/80 dark:bg-gray-800/80
        backdrop-blur-xl
        rounded-xl
        border border-gray-200/50 dark:border-gray-700/50
        ${styles.hoverBorder}
        shadow-lg shadow-gray-200/30 dark:shadow-gray-900/30
        hover:shadow-xl ${styles.hoverShadow}
        p-5 min-h-[140px]

        /* CSS 入場動畫 */
        animate-card-fade-in

        /* Hover/Active 效果 */
        transition-all duration-200 ease-out
        hover:scale-[1.02] hover:-translate-y-1
        active:scale-[0.98]

        /* 減少動畫偏好支援 */
        motion-reduce:animate-none
        motion-reduce:opacity-100
        motion-reduce:hover:scale-100
        motion-reduce:hover:translate-y-0
        motion-reduce:active:scale-100

        ${className}
      `}
    >
      {children}
    </div>
  )
})
