'use client'

import { useState, useCallback, useRef } from 'react'
import type { Region, UseRegionSelectorReturn } from '@/types/exp-tracker'

/**
 * 區域選擇 Hook
 * 提供可拖曳的區域選擇功能
 */
export function useRegionSelector(): UseRegionSelectorReturn {
  const [region, setRegion] = useState<Region | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)

  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)

  // 開始選擇
  const startSelection = useCallback(() => {
    setIsSelecting(true)
    setRegion(null)
  }, [])

  // 清除選擇
  const clearSelection = useCallback(() => {
    setRegion(null)
    setIsSelecting(false)
    startPointRef.current = null
  }, [])

  // 取得相對座標
  const getRelativeCoords = useCallback(
    (e: React.MouseEvent, container: HTMLElement) => {
      const rect = container.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    },
    []
  )

  // 滑鼠按下
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting) return

      const container = e.currentTarget as HTMLElement
      containerRef.current = container
      const coords = getRelativeCoords(e, container)
      startPointRef.current = coords

      setRegion({
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
      })
    },
    [isSelecting, getRelativeCoords]
  )

  // 滑鼠移動
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !startPointRef.current || !containerRef.current)
        return

      const coords = getRelativeCoords(e, containerRef.current)
      const startX = startPointRef.current.x
      const startY = startPointRef.current.y

      // 計算區域（支援從任意方向拖曳）
      const x = Math.min(startX, coords.x)
      const y = Math.min(startY, coords.y)
      const width = Math.abs(coords.x - startX)
      const height = Math.abs(coords.y - startY)

      setRegion({ x, y, width, height })
    },
    [isSelecting, getRelativeCoords]
  )

  // 滑鼠放開
  const onMouseUp = useCallback(() => {
    if (!isSelecting) return

    setIsSelecting(false)
    startPointRef.current = null

    // 如果區域太小，清除
    if (region && (region.width < 10 || region.height < 10)) {
      setRegion(null)
    }
  }, [isSelecting, region])

  return {
    region,
    isSelecting,
    startSelection,
    clearSelection,
    setRegion,
    handlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
    },
  }
}
