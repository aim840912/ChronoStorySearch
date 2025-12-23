'use client'

import { useState, useEffect, useRef } from 'react'

const SHORT_SCREEN_THRESHOLD = 800
const RESIZE_DEBOUNCE_MS = 100

/**
 * 監聽視窗高度變化的 Hook
 * 用於判斷是否為短螢幕（高度 < 800px）
 */
export function useWindowHeight() {
  const [isShortScreen, setIsShortScreen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // 檢查視窗高度
    const checkHeight = () => {
      setIsShortScreen(window.innerHeight < SHORT_SCREEN_THRESHOLD)
    }

    // 初始檢查
    checkHeight()

    // 帶 debounce 的 resize handler
    const handleResize = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(checkHeight, RESIZE_DEBOUNCE_MS)
    }

    // 監聽視窗大小變化
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return { isShortScreen }
}
