/**
 * 滾動行為管理 Hook
 *
 * 功能：
 * - 管理「返回頂部」按鈕的顯示狀態
 * - 提供滾動到頂部的函數
 */

import { useState, useEffect, useCallback } from 'react'

interface UseScrollBehaviorOptions {
  /** 顯示返回頂部按鈕的滾動閾值（預設 300px） */
  showBackToTopThreshold?: number
}

interface UseScrollBehaviorReturn {
  /** 是否顯示返回頂部按鈕 */
  showBackToTop: boolean
  /** 滾動到頁面頂部 */
  scrollToTop: () => void
}

export function useScrollBehavior({
  showBackToTopThreshold = 300,
}: UseScrollBehaviorOptions = {}): UseScrollBehaviorReturn {
  // 追蹤是否顯示「返回頂部」按鈕
  const [showBackToTop, setShowBackToTop] = useState(false)

  // 監聽滾動事件
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY

      // 當使用者滾動超過閾值時顯示按鈕
      setShowBackToTop(scrollY > showBackToTopThreshold)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [showBackToTopThreshold])

  // 返回頂部
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return {
    showBackToTop,
    scrollToTop,
  }
}
