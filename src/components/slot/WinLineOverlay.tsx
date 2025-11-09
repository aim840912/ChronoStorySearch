'use client'

import { useEffect, useState } from 'react'
import type { WinLine, WinLineAnimationStatus } from '@/types/slot'
import {
  getLineEndpoints,
  getSVGContainerSize,
  GRID_CONFIG,
} from '@/lib/win-line-utils'

interface WinLineOverlayProps {
  /** 獲勝的線條 */
  winLines: WinLine[]
  /** 動畫狀態 */
  animationStatus: WinLineAnimationStatus
  /** 是否為 mobile 尺寸 */
  isMobile?: boolean
}

/**
 * 獲勝線條 SVG Overlay 元件
 * 在 3x3 網格上方繪製獲勝線條，支援逐條閃爍動畫
 */
export function WinLineOverlay({
  winLines,
  animationStatus,
  isMobile = true,
}: WinLineOverlayProps) {
  const [currentFlashingIndex, setCurrentFlashingIndex] = useState(-1)

  // 選擇適當的符號框尺寸
  const boxSize = isMobile
    ? GRID_CONFIG.boxSize.mobile
    : GRID_CONFIG.boxSize.desktop
  const gap = GRID_CONFIG.gap

  // 計算 SVG 容器尺寸
  const { width, height } = getSVGContainerSize(boxSize, gap)

  // 逐條閃爍動畫控制
  useEffect(() => {
    if (animationStatus !== 'flashing' || winLines.length === 0) {
      setCurrentFlashingIndex(-1)
      return
    }

    // 逐條閃爍，每條 0.8 秒
    const flashDuration = 800 // ms
    let currentIndex = 0

    const flashNext = () => {
      if (currentIndex < winLines.length) {
        setCurrentFlashingIndex(currentIndex)
        currentIndex++
        setTimeout(flashNext, flashDuration)
      } else {
        // 所有線條閃爍完成
        setCurrentFlashingIndex(-1)
      }
    }

    flashNext()

    // Cleanup
    return () => {
      setCurrentFlashingIndex(-1)
    }
  }, [animationStatus, winLines.length])

  // 不顯示線條的情況
  if (animationStatus === 'idle' || winLines.length === 0) {
    return null
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ zIndex: 10 }}
    >
      {winLines.map((line, index) => {
        const { start, end } = getLineEndpoints(line, boxSize, gap)

        // 決定是否顯示此線條
        const isCurrentFlashing = currentFlashingIndex === index
        const isShowing = animationStatus === 'showing'

        // 只在以下情況顯示：
        // 1. 正在閃爍且是當前閃爍的線條
        // 2. 閃爍完成，持續顯示模式
        const shouldShow = isCurrentFlashing || isShowing

        if (!shouldShow) {
          return null
        }

        return (
          <line
            key={line.id}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`
              text-amber-500 dark:text-amber-400
              ${isCurrentFlashing ? 'animate-win-line-flash' : ''}
              ${isShowing ? 'opacity-100' : ''}
            `}
            style={{
              filter: 'drop-shadow(0 0 4px currentColor)',
            }}
          />
        )
      })}
    </svg>
  )
}
