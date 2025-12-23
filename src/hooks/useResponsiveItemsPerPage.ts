'use client'

import { useState, useEffect, useRef } from 'react'

const RESIZE_DEBOUNCE_MS = 100

/**
 * 響應式每頁項目數量 Hook
 * 根據螢幕寬度自動調整每頁顯示的項目數量
 *
 * 斷點與數量對應（與 Tailwind 斷點一致）：
 * - 手機（< 768px）：15 個（1欄 × 15列）
 * - 平板（768-1024px）：20 個（2欄 × 10列）
 * - 桌面（≥ 1024px）：24 個（3欄 × 8列）
 */
export function useResponsiveItemsPerPage(): number {
  const [itemsPerPage, setItemsPerPage] = useState<number>(24) // 預設桌面數量
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // 計算當前應該使用的數量
    const calculateItemsPerPage = (): number => {
      if (typeof window === 'undefined') return 24

      const width = window.innerWidth

      // 對應 Tailwind 斷點
      if (width < 768) {
        // 手機：1 欄佈局
        return 15
      } else if (width < 1024) {
        // 平板：2 欄佈局
        return 20
      } else {
        // 桌面：3 欄佈局
        return 24
      }
    }

    // 初始設定
    setItemsPerPage(calculateItemsPerPage())

    // 帶 debounce 的 resize handler
    const handleResize = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setItemsPerPage(calculateItemsPerPage())
      }, RESIZE_DEBOUNCE_MS)
    }

    window.addEventListener('resize', handleResize, { passive: true })

    // 清理監聯器
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return itemsPerPage
}
