'use client'

import { memo, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

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
 * 基礎卡片容器組件
 *
 * 提供：
 * - 玻璃擬態效果（backdrop-blur）
 * - Framer Motion 入場動畫（staggered）
 * - Hover/Tap 互動效果
 * - 怪物/物品變體樣式區分
 * - Reduced motion 無障礙支援
 */
export const BaseCard = memo(function BaseCard({
  children,
  onClick,
  variant,
  index = 0,
  className = '',
}: BaseCardProps) {
  const shouldReduceMotion = useReducedMotion()
  const styles = variantStyles[variant]

  // 動畫變體：考慮用戶的動畫偏好設定
  const cardVariants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            delay: Math.min(index * 0.03, 0.3), // 延遲上限 300ms
            duration: 0.25,
            ease: 'easeOut' as const,
          },
        },
      }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      whileHover={shouldReduceMotion ? undefined : { scale: 1.02, y: -4 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
      onClick={onClick}
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
        transition-colors duration-200
        p-5 min-h-[140px]
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
})
