'use client'

import { memo } from 'react'
import type { CardVariant } from './BaseCard'

interface TypeBadgeProps {
  variant: CardVariant
  level?: number | null
  className?: string
}

const variantConfig = {
  monster: {
    bg: 'bg-red-500',
    text: 'text-white',
  },
  item: {
    bg: 'bg-blue-500',
    text: 'text-white',
  },
}

/**
 * 類型標籤組件
 *
 * 用於顯示等級，並通過顏色區分怪物和物品：
 * - 怪物：紅色背景
 * - 物品：藍色背景
 */
export const TypeBadge = memo(function TypeBadge({
  variant,
  level,
  className = '',
}: TypeBadgeProps) {
  const config = variantConfig[variant]

  // 沒有等級時不顯示
  if (level === null || level === undefined) return null

  return (
    <span
      className={`
        inline-flex items-center
        px-2.5 py-1 rounded-full
        ${config.bg} ${config.text}
        text-xs font-bold
        ${className}
      `}
    >
      Lv. {level}
    </span>
  )
})
