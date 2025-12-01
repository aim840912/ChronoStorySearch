'use client'

import { memo } from 'react'

interface CardImageProps {
  src: string
  alt: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
}

/**
 * 卡片圖片容器組件
 *
 * 提供：
 * - 固定尺寸容器（sm/md/lg）
 * - 圖片置中和 object-contain
 */
export const CardImage = memo(function CardImage({
  src,
  alt,
  size = 'lg',
  className = '',
}: CardImageProps) {
  return (
    <div
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center
        flex-shrink-0
        rounded-lg
        ${className}
      `}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </div>
  )
})
