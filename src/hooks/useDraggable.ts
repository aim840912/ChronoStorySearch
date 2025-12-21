'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export interface Position {
  x: number
  y: number
}

export interface UseDraggableOptions {
  /** 初始位置 */
  initialPosition?: Position
  /** 位置變更回調 */
  onPositionChange?: (position: Position) => void
  /** 邊界限制（防止拖出視窗） */
  bounds?: boolean
}

export interface UseDraggableReturn {
  /** 當前位置 */
  position: Position
  /** 是否正在拖曳 */
  isDragging: boolean
  /** 設定位置 */
  setPosition: (position: Position) => void
  /** 拖曳事件處理器（綁定到可拖曳元素） */
  dragHandlers: {
    onMouseDown: (e: React.MouseEvent) => void
    onTouchStart: (e: React.TouchEvent) => void
  }
}

/**
 * 拖曳功能 Hook
 * 提供可拖曳的位置管理和事件處理
 */
export function useDraggable(options: UseDraggableOptions = {}): UseDraggableReturn {
  const { initialPosition, onPositionChange, bounds = true } = options

  const [position, setPositionState] = useState<Position>(() => {
    if (initialPosition) return initialPosition
    // SSR 時使用安全的預設值，客戶端 useEffect 會調整
    if (typeof window === 'undefined') return { x: 20, y: 80 }
    return { x: window.innerWidth - 340, y: 80 }
  })
  const [isDragging, setIsDragging] = useState(false)

  // 拖曳起始點（相對於元素）
  const dragStartRef = useRef<{ offsetX: number; offsetY: number } | null>(null)
  // 元素尺寸（用於邊界計算）
  const elementSizeRef = useRef<{ width: number; height: number }>({ width: 320, height: 400 })

  // 設定位置（帶邊界檢查）
  const setPosition = useCallback(
    (newPosition: Position) => {
      let { x, y } = newPosition

      if (bounds && typeof window !== 'undefined') {
        const maxX = window.innerWidth - elementSizeRef.current.width
        const maxY = window.innerHeight - elementSizeRef.current.height

        x = Math.max(0, Math.min(x, maxX))
        y = Math.max(0, Math.min(y, maxY))
      }

      setPositionState({ x, y })
      onPositionChange?.({ x, y })
    },
    [bounds, onPositionChange]
  )

  // 滑鼠按下 - 開始拖曳
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // 只響應左鍵
    if (e.button !== 0) return

    e.preventDefault()
    setIsDragging(true)

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dragStartRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    }
  }, [])

  // 觸控開始 - 開始拖曳
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return

    setIsDragging(true)

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dragStartRef.current = {
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
    }
  }, [])

  // 滑鼠/觸控移動
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return

      const newX = e.clientX - dragStartRef.current.offsetX
      const newY = e.clientY - dragStartRef.current.offsetY

      setPosition({ x: newX, y: newY })
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch || !dragStartRef.current) return

      const newX = touch.clientX - dragStartRef.current.offsetX
      const newY = touch.clientY - dragStartRef.current.offsetY

      setPosition({ x: newX, y: newY })
    }

    const handleEnd = () => {
      setIsDragging(false)
      dragStartRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, setPosition])

  // 視窗大小改變時調整位置
  useEffect(() => {
    const handleResize = () => {
      if (bounds) {
        setPosition(position)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [bounds, position, setPosition])

  return {
    position,
    isDragging,
    setPosition,
    dragHandlers: {
      onMouseDown,
      onTouchStart,
    },
  }
}
