'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import type {
  Region,
  NormalizedRegion,
  UseRegionSelectorReturn,
} from '@/types/exp-tracker'

/**
 * 區域選擇 Hook
 * 提供可拖曳的區域選擇功能
 * 使用正規化座標（0-1 比例）確保視窗大小改變時區域仍正確
 */
export function useRegionSelector(): UseRegionSelectorReturn {
  // 正規化座標（持久化用）
  const [normalizedRegion, setNormalizedRegion] =
    useState<NormalizedRegion | null>(null)
  // 像素座標（拖曳預覽用）
  const [pixelRegion, setPixelRegion] = useState<Region | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)

  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)

  // 開始選擇
  const startSelection = useCallback(() => {
    setIsSelecting(true)
    setPixelRegion(null)
    setNormalizedRegion(null)
  }, [])

  // 清除選擇
  const clearSelection = useCallback(() => {
    setPixelRegion(null)
    setNormalizedRegion(null)
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

  // 將像素座標正規化為 0-1 比例
  const normalizeRegion = useCallback(
    (region: Region, containerWidth: number, containerHeight: number): NormalizedRegion => {
      return {
        x: region.x / containerWidth,
        y: region.y / containerHeight,
        width: region.width / containerWidth,
        height: region.height / containerHeight,
      }
    },
    []
  )

  // 將正規化座標轉換為像素座標
  const getPixelRegion = useCallback(
    (containerWidth: number, containerHeight: number): Region | null => {
      if (!normalizedRegion) return null
      return {
        x: normalizedRegion.x * containerWidth,
        y: normalizedRegion.y * containerHeight,
        width: normalizedRegion.width * containerWidth,
        height: normalizedRegion.height * containerHeight,
      }
    },
    [normalizedRegion]
  )

  // 滑鼠按下
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting) return

      const container = e.currentTarget as HTMLElement
      containerRef.current = container
      const coords = getRelativeCoords(e, container)
      startPointRef.current = coords

      setPixelRegion({
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

      setPixelRegion({ x, y, width, height })
    },
    [isSelecting, getRelativeCoords]
  )

  // 滑鼠放開 - 將像素座標正規化
  const onMouseUp = useCallback(() => {
    if (!isSelecting) return

    setIsSelecting(false)
    startPointRef.current = null

    // 如果區域太小，清除
    if (pixelRegion && (pixelRegion.width < 10 || pixelRegion.height < 10)) {
      setPixelRegion(null)
      setNormalizedRegion(null)
      return
    }

    // 正規化座標
    if (pixelRegion && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth
      const containerHeight = containerRef.current.clientHeight
      const normalized = normalizeRegion(pixelRegion, containerWidth, containerHeight)
      setNormalizedRegion(normalized)
    }
  }, [isSelecting, pixelRegion, normalizeRegion])

  // 使用 useMemo 確保回傳值穩定，避免每次渲染都產生新物件導致無限迴圈
  return useMemo(
    () => ({
      normalizedRegion,
      pixelRegion,
      isSelecting,
      startSelection,
      clearSelection,
      setNormalizedRegion,
      getPixelRegion,
      handlers: {
        onMouseDown,
        onMouseMove,
        onMouseUp,
      },
    }),
    [
      normalizedRegion,
      pixelRegion,
      isSelecting,
      startSelection,
      clearSelection,
      setNormalizedRegion,
      getPixelRegion,
      onMouseDown,
      onMouseMove,
      onMouseUp,
    ]
  )
}
