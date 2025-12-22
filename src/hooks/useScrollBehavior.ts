/**
 * 滾動行為管理 Hook
 *
 * 功能：
 * - 管理「返回頂部」按鈕的顯示狀態
 * - 追蹤進階篩選面板展開時的滾動位置
 * - 自動收合進階篩選面板（當使用者向下滾動時）
 * - 提供滾動到頂部的函數
 */

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseScrollBehaviorOptions {
  /** 進階篩選面板是否展開 */
  isAdvancedFilterExpanded: boolean
  /** 設置進階篩選面板展開狀態 */
  setIsAdvancedFilterExpanded: (expanded: boolean) => void
  /** 顯示返回頂部按鈕的滾動閾值（預設 300px） */
  showBackToTopThreshold?: number
  /** 收合進階篩選的滾動距離（預設 50px） */
  collapseFilterThreshold?: number
}

interface UseScrollBehaviorReturn {
  /** 是否顯示返回頂部按鈕 */
  showBackToTop: boolean
  /** 滾動到頁面頂部 */
  scrollToTop: () => void
}

export function useScrollBehavior({
  isAdvancedFilterExpanded,
  setIsAdvancedFilterExpanded,
  showBackToTopThreshold = 300,
  collapseFilterThreshold = 50,
}: UseScrollBehaviorOptions): UseScrollBehaviorReturn {
  // 追蹤是否顯示「返回頂部」按鈕
  const [showBackToTop, setShowBackToTop] = useState(false)

  // 追蹤進階篩選面板展開時的滾動位置
  const expandedAtScrollY = useRef<number | null>(null)

  // 追蹤進階篩選面板展開時的滾動位置
  useEffect(() => {
    if (isAdvancedFilterExpanded) {
      // 面板剛展開，記錄當前滾動位置
      expandedAtScrollY.current = window.scrollY
    } else {
      // 面板收合，清除記錄
      expandedAtScrollY.current = null
    }
  }, [isAdvancedFilterExpanded])

  // 監聽滾動事件
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY

      // 當使用者滾動超過閾值時顯示按鈕
      setShowBackToTop(scrollY > showBackToTopThreshold)

      // 只有從展開位置向下滾動超過閾值才收合面板
      if (
        isAdvancedFilterExpanded &&
        expandedAtScrollY.current !== null &&
        scrollY > expandedAtScrollY.current + collapseFilterThreshold
      ) {
        setIsAdvancedFilterExpanded(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isAdvancedFilterExpanded, setIsAdvancedFilterExpanded, showBackToTopThreshold, collapseFilterThreshold])

  // 返回頂部
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return {
    showBackToTop,
    scrollToTop,
  }
}
