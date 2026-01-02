'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  getAccuracyCalculatorFloatingState,
  setAccuracyCalculatorFloatingState,
} from '@/lib/storage'

/**
 * 命中計算器 UI 狀態管理 Hook
 * 整合懸浮視窗的所有 UI 相關狀態
 */

export interface AccuracyCalculatorUIState {
  windowSize: { width: number; height: number }
  mounted: boolean
}

export interface AccuracyCalculatorUIActions {
  setWindowSize: (size: { width: number; height: number }) => void
}

export type UseAccuracyCalculatorUIReturn = AccuracyCalculatorUIState &
  AccuracyCalculatorUIActions & {
    loadState: () => void
  }

interface UseAccuracyCalculatorUIOptions {
  isOpen: boolean
  position: { x: number; y: number }
  onPositionChange?: (position: { x: number; y: number }) => void
  resizable?: {
    setSize: (size: { width: number; height: number }) => void
  }
}

export function useAccuracyCalculatorUI(
  options: UseAccuracyCalculatorUIOptions
): UseAccuracyCalculatorUIReturn {
  const { isOpen, position, onPositionChange, resizable } = options

  // UI 狀態（簡化版：無最小化和釘選功能）
  const [windowSize, setWindowSize] = useState({ width: 400, height: 500 })
  const [mounted, setMounted] = useState(false)

  // Client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // 載入儲存的狀態
  const loadState = useCallback(() => {
    const floatingState = getAccuracyCalculatorFloatingState()

    if (floatingState.position.x >= 0 && floatingState.position.y >= 0) {
      onPositionChange?.(floatingState.position)
    }

    if (floatingState.size) {
      setWindowSize(floatingState.size)
      resizable?.setSize(floatingState.size)
    }
  }, [onPositionChange, resizable])

  // Debounced 儲存
  const debouncedSave = useMemo(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const debounced = (
      state: Parameters<typeof setAccuracyCalculatorFloatingState>[0]
    ) => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setAccuracyCalculatorFloatingState(state)
      }, 300)
    }
    debounced.cancel = () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
    return debounced
  }, [])

  // 自動儲存狀態（簡化版：只儲存位置和大小）
  useEffect(() => {
    if (isOpen) {
      debouncedSave({
        position,
        isMinimized: false,
        isPinned: false,
        size: windowSize,
        minimizedWidth: 200,
      })
    }
  }, [isOpen, position, windowSize, debouncedSave])

  // 清理 debounce timer
  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  return {
    // 狀態
    windowSize,
    mounted,
    // 操作
    setWindowSize,
    loadState,
  }
}
