'use client'

import { memo, useRef, useState, useEffect, type ReactNode } from 'react'

interface PreviewIcon {
  id: number
  imageUrl: string
}

interface CardHeaderProps {
  /** 左側標籤群組 */
  badges?: ReactNode
  /** 所有預覽圖示（會根據可用空間動態顯示） */
  allIcons?: PreviewIcon[]
  /** 右側愛心按鈕 */
  favoriteButton: ReactNode
}

// 圖示尺寸常數
const ICON_SIZE = 28 // w-7 = 28px
const ICON_GAP = 4 // gap-1 = 4px
const PLUS_WIDTH = 28 // "+N" 預估寬度

/**
 * 卡片頂部區域組件
 *
 * 佈局：
 * - 左側：標籤群組（等級、轉蛋、商人）
 * - 中間：預覽圖示（怪物或卷軸）- 動態填滿可用空間
 * - 右側：愛心收藏按鈕
 */
export const CardHeader = memo(function CardHeader({
  badges,
  allIcons,
  favoriteButton,
}: CardHeaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(0)

  const totalCount = allIcons?.length || 0
  const hasIcons = totalCount > 0

  // 使用 ResizeObserver 動態計算可顯示的圖示數量
  useEffect(() => {
    const container = containerRef.current
    if (!container || !hasIcons) {
      setVisibleCount(0)
      return
    }

    const calculateVisibleCount = (width: number) => {
      if (width <= 0) {
        setVisibleCount(0)
        return
      }

      // 計算可容納的圖示數量
      // 如果總數超過可顯示數量，需要預留 +N 的空間
      const maxWithoutPlus = Math.floor((width + ICON_GAP) / (ICON_SIZE + ICON_GAP))

      if (maxWithoutPlus >= totalCount) {
        // 可以顯示全部，不需要 +N
        setVisibleCount(totalCount)
      } else {
        // 需要顯示 +N，預留空間
        const availableWidth = width - PLUS_WIDTH
        const maxIcons = Math.floor((availableWidth + ICON_GAP) / (ICON_SIZE + ICON_GAP))
        setVisibleCount(Math.max(0, maxIcons))
      }
    }

    const observer = new ResizeObserver(([entry]) => {
      calculateVisibleCount(entry.contentRect.width)
    })

    observer.observe(container)

    // 初始計算
    calculateVisibleCount(container.offsetWidth)

    return () => observer.disconnect()
  }, [hasIcons, totalCount])

  const displayIcons = allIcons?.slice(0, visibleCount) || []
  const extraCount = totalCount - visibleCount

  return (
    <div className="absolute top-3 left-3 right-3 flex items-center">
      {/* 左側：標籤群組 */}
      <div className="flex items-center gap-1.5 flex-shrink-0">{badges}</div>

      {/* 中間：預覽圖示 - 動態填滿 */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center gap-1 px-2 min-w-0 overflow-hidden"
      >
        {displayIcons.map((icon) => (
          <img
            key={icon.id}
            src={icon.imageUrl}
            alt=""
            className="w-7 h-7 object-contain flex-shrink-0"
            loading="lazy"
          />
        ))}
        {extraCount > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex-shrink-0">
            +{extraCount}
          </span>
        )}
      </div>

      {/* 右側：愛心按鈕 */}
      <div className="flex-shrink-0">{favoriteButton}</div>
    </div>
  )
})
