'use client'

import { useState } from 'react'
import { clientLogger } from '@/lib/logger'

interface ImageWithFallbackProps {
  src: string
  alt: string
  fallbackSrc?: string
  className?: string
  width?: number
  height?: number
}

/**
 * 圖片元件 with Fallback 機制
 * 當圖片載入失敗時，自動顯示 fallback 圖片或佔位符
 */
export function ImageWithFallback({
  src,
  alt,
  fallbackSrc,
  className = '',
  width,
  height,
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (!hasError) {
      clientLogger.debug(`圖片載入失敗: ${src}`)

      if (fallbackSrc) {
        setImgSrc(fallbackSrc)
      }

      setHasError(true)
    }
  }

  // 如果沒有 fallback 且出錯，顯示佔位符
  if (hasError && !fallbackSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${className}`}
        style={{ width, height }}
      >
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onError={handleError}
      loading="lazy"
    />
  )
}
