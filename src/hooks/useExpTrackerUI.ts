'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { getExpTrackerFloatingState, setExpTrackerFloatingState } from '@/lib/storage'

/**
 * EXP 追蹤器 UI 狀態管理 Hook
 * 整合懸浮視窗的所有 UI 相關狀態
 */

export interface ExpTrackerUIState {
  isMinimized: boolean
  isVideoExpanded: boolean
  isPinned: boolean
  isRegionModalOpen: boolean
  isAutoDetecting: boolean
  windowSize: { width: number; height: number }
  minimizedWidth: number
  mounted: boolean
}

export interface ExpTrackerUIActions {
  setIsMinimized: (value: boolean) => void
  setIsVideoExpanded: (value: boolean) => void
  setIsPinned: (value: boolean) => void
  setIsRegionModalOpen: (value: boolean) => void
  setIsAutoDetecting: (value: boolean) => void
  setWindowSize: (size: { width: number; height: number }) => void
  setMinimizedWidth: (width: number) => void
  toggleMinimized: () => void
  togglePinned: () => void
}

export type UseExpTrackerUIReturn = ExpTrackerUIState & ExpTrackerUIActions & {
  loadState: () => void
}

interface UseExpTrackerUIOptions {
  isOpen: boolean
  position: { x: number; y: number }
  onPositionChange?: (position: { x: number; y: number }) => void
  resizable?: {
    setSize: (size: { width: number; height: number }) => void
  }
  minimizedResizable?: {
    setSize: (size: { width: number; height: number }) => void
  }
}

export function useExpTrackerUI(options: UseExpTrackerUIOptions): UseExpTrackerUIReturn {
  const { isOpen, position, onPositionChange, resizable, minimizedResizable } = options

  // UI 狀態
  const [isMinimized, setIsMinimized] = useState(false)
  const [isVideoExpanded, setIsVideoExpanded] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false)
  const [isAutoDetecting, setIsAutoDetecting] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 320, height: 400 })
  const [minimizedWidth, setMinimizedWidth] = useState(180)
  const [mounted, setMounted] = useState(false)

  // Client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // 切換函數
  const toggleMinimized = useCallback(() => {
    setIsMinimized(prev => !prev)
  }, [])

  const togglePinned = useCallback(() => {
    setIsPinned(prev => !prev)
  }, [])

  // 載入儲存的狀態
  const loadState = useCallback(() => {
    const floatingState = getExpTrackerFloatingState()
    setIsMinimized(floatingState.isMinimized)
    setIsVideoExpanded(floatingState.isVideoExpanded)
    setIsPinned(floatingState.isPinned ?? false)

    if (floatingState.position.x >= 0 && floatingState.position.y >= 0) {
      onPositionChange?.(floatingState.position)
    }

    if (floatingState.size) {
      setWindowSize(floatingState.size)
      resizable?.setSize(floatingState.size)
    }

    if (floatingState.minimizedWidth) {
      setMinimizedWidth(floatingState.minimizedWidth)
      minimizedResizable?.setSize({ width: floatingState.minimizedWidth, height: 40 })
    }
  }, [onPositionChange, resizable, minimizedResizable])

  // Debounced 儲存
  const debouncedSave = useMemo(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const debounced = (state: Parameters<typeof setExpTrackerFloatingState>[0]) => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setExpTrackerFloatingState(state)
      }, 300)
    }
    debounced.cancel = () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
    return debounced
  }, [])

  // 自動儲存狀態
  useEffect(() => {
    if (isOpen) {
      debouncedSave({
        position,
        isMinimized,
        isPinned,
        isVideoExpanded,
        size: windowSize,
        minimizedWidth,
      })
    }
  }, [isOpen, position, isMinimized, isPinned, isVideoExpanded, windowSize, minimizedWidth, debouncedSave])

  // 清理 debounce timer
  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  return {
    // 狀態
    isMinimized,
    isVideoExpanded,
    isPinned,
    isRegionModalOpen,
    isAutoDetecting,
    windowSize,
    minimizedWidth,
    mounted,
    // 操作
    setIsMinimized,
    setIsVideoExpanded,
    setIsPinned,
    setIsRegionModalOpen,
    setIsAutoDetecting,
    setWindowSize,
    setMinimizedWidth,
    toggleMinimized,
    togglePinned,
    loadState,
  }
}
