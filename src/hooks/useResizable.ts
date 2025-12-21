'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export interface Size {
  width: number
  height: number
}

export interface UseResizableOptions {
  /** 初始尺寸 */
  initialSize?: Size
  /** 最小尺寸 */
  minSize?: Size
  /** 最大尺寸 */
  maxSize?: Size
  /** 尺寸變更回調 */
  onSizeChange?: (size: Size) => void
  /** 位置變更回調（拖曳左/上邊時需要） */
  onPositionChange?: (delta: { dx: number; dy: number }) => void
  /** 是否啟用（可用於切換最小化狀態） */
  enabled?: boolean
  /** 邊緣偵測寬度 */
  edgeWidth?: number
}

export type ResizeEdge = 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null

export interface UseResizableReturn {
  /** 當前尺寸 */
  size: Size
  /** 設定尺寸 */
  setSize: (size: Size) => void
  /** 是否正在調整大小 */
  isResizing: boolean
  /** 當前懸停的邊緣 */
  activeEdge: ResizeEdge
  /** 綁定到容器元素的 callback ref */
  containerRef: (node: HTMLDivElement | null) => void
  /** 動態 cursor 樣式 */
  cursorStyle: string
}

const EDGE_CURSORS: Record<NonNullable<ResizeEdge>, string> = {
  top: 'ns-resize',
  bottom: 'ns-resize',
  left: 'ew-resize',
  right: 'ew-resize',
  'top-left': 'nwse-resize',
  'top-right': 'nesw-resize',
  'bottom-left': 'nesw-resize',
  'bottom-right': 'nwse-resize',
}

/**
 * 可調整大小功能 Hook
 * 支援從四邊和四角拖曳調整元素大小
 */
export function useResizable(options: UseResizableOptions = {}): UseResizableReturn {
  const {
    initialSize = { width: 320, height: 400 },
    minSize = { width: 200, height: 150 },
    maxSize = { width: 600, height: 800 },
    onSizeChange,
    onPositionChange,
    enabled = true,
    edgeWidth = 6,
  } = options

  const [size, setSizeState] = useState<Size>(initialSize)
  const [isResizing, setIsResizing] = useState(false)
  const [activeEdge, setActiveEdge] = useState<ResizeEdge>(null)
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null)

  // 使用 callback ref 來確保能捕捉到元素的設置
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerElement(node)
  }, [])
  const resizeStartRef = useRef<{
    mouseX: number
    mouseY: number
    width: number
    height: number
    edge: ResizeEdge
  } | null>(null)

  // 設定尺寸（帶限制）
  const setSize = useCallback(
    (newSize: Size) => {
      const constrainedSize = {
        width: Math.max(minSize.width, Math.min(newSize.width, maxSize.width)),
        height: Math.max(minSize.height, Math.min(newSize.height, maxSize.height)),
      }
      setSizeState(constrainedSize)
      onSizeChange?.(constrainedSize)
    },
    [minSize, maxSize, onSizeChange]
  )

  // 偵測滑鼠在哪個邊緣
  const detectEdge = useCallback(
    (e: MouseEvent): ResizeEdge => {
      if (!containerElement || !enabled) return null

      const rect = containerElement.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const isBottom = y > rect.height - edgeWidth
      const isRight = x > rect.width - edgeWidth

      // 只偵測右邊、下邊、右下角（簡化操作，避免左/上邊需要同時調整位置的複雜性）
      if (isBottom && isRight) return 'bottom-right'
      if (isBottom) return 'bottom'
      if (isRight) return 'right'

      return null
    },
    [enabled, edgeWidth, containerElement]
  )

  // 滑鼠移動 - 偵測邊緣並更新 cursor
  useEffect(() => {
    if (!enabled || !containerElement) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) return

      const edge = detectEdge(e)
      setActiveEdge(edge)
    }

    const handleMouseLeave = () => {
      if (!isResizing) {
        setActiveEdge(null)
      }
    }

    containerElement.addEventListener('mousemove', handleMouseMove)
    containerElement.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      containerElement.removeEventListener('mousemove', handleMouseMove)
      containerElement.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [enabled, isResizing, detectEdge, containerElement])

  // 滑鼠按下 - 開始調整大小
  useEffect(() => {
    if (!enabled || !containerElement) return

    const handleMouseDown = (e: MouseEvent) => {
      const edge = detectEdge(e)
      if (!edge) return

      e.preventDefault()
      e.stopPropagation()

      setIsResizing(true)
      resizeStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        width: size.width,
        height: size.height,
        edge,
      }
    }

    containerElement.addEventListener('mousedown', handleMouseDown)

    return () => {
      containerElement.removeEventListener('mousedown', handleMouseDown)
    }
  }, [enabled, size, detectEdge, containerElement])

  // 拖曳中 - 調整大小
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return

      const { mouseX, mouseY, width, height, edge } = resizeStartRef.current
      const deltaX = e.clientX - mouseX
      const deltaY = e.clientY - mouseY

      let newWidth = width
      let newHeight = height
      let dx = 0
      let dy = 0

      // 根據邊緣計算新尺寸
      if (edge?.includes('right')) {
        newWidth = width + deltaX
      }
      if (edge?.includes('left')) {
        newWidth = width - deltaX
        dx = deltaX
      }
      if (edge?.includes('bottom')) {
        newHeight = height + deltaY
      }
      if (edge?.includes('top')) {
        newHeight = height - deltaY
        dy = deltaY
      }

      // 限制尺寸
      const constrainedWidth = Math.max(minSize.width, Math.min(newWidth, maxSize.width))
      const constrainedHeight = Math.max(minSize.height, Math.min(newHeight, maxSize.height))

      // 如果尺寸被限制，調整位置增量
      if (edge?.includes('left')) {
        dx = width - constrainedWidth
      }
      if (edge?.includes('top')) {
        dy = height - constrainedHeight
      }

      setSizeState({ width: constrainedWidth, height: constrainedHeight })

      // 拖曳左/上邊時需要調整位置
      if ((dx !== 0 || dy !== 0) && onPositionChange) {
        onPositionChange({ dx, dy })
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      resizeStartRef.current = null
      // 通知最終尺寸
      onSizeChange?.(size)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, size, minSize, maxSize, onSizeChange, onPositionChange])

  // 計算 cursor 樣式
  const cursorStyle = activeEdge ? EDGE_CURSORS[activeEdge] : ''

  return {
    size,
    setSize,
    isResizing,
    activeEdge,
    containerRef,
    cursorStyle,
  }
}
