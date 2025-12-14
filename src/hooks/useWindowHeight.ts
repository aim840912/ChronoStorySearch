'use client'

import { useState, useEffect } from 'react'

const SHORT_SCREEN_THRESHOLD = 800

/**
 * 監聽視窗高度變化的 Hook
 * 用於判斷是否為短螢幕（高度 < 800px）
 */
export function useWindowHeight() {
  const [isShortScreen, setIsShortScreen] = useState(false)

  useEffect(() => {
    // 檢查視窗高度
    const checkHeight = () => {
      setIsShortScreen(window.innerHeight < SHORT_SCREEN_THRESHOLD)
    }

    // 初始檢查
    checkHeight()

    // 監聽視窗大小變化
    window.addEventListener('resize', checkHeight)

    return () => {
      window.removeEventListener('resize', checkHeight)
    }
  }, [])

  return { isShortScreen }
}
