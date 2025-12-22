'use client'

import { useRef, useState, useLayoutEffect, useCallback } from 'react'

interface UseAutoFitTextOptions {
  /** 文字內容（用於觸發重新計算） */
  text: string
  /** 最大行數，預設 2 */
  maxLines?: number
  /** 最小字體大小（px），預設 12 */
  minFontSize?: number
  /** 最大字體大小（px），預設 18 (text-lg) */
  maxFontSize?: number
  /** 每次縮小的步進值（px），預設 1 */
  step?: number
}

interface UseAutoFitTextReturn {
  /** 綁定到文字容器的 ref */
  ref: React.RefObject<HTMLElement | null>
  /** 計算後的字體大小（px） */
  fontSize: number
  /** 是否已完成計算 */
  isReady: boolean
}

/**
 * 自動縮放文字以適應指定行數的 Hook
 *
 * 原理：
 * 1. 從最大字體開始測量
 * 2. 如果文字高度超過 maxLines * lineHeight，則縮小字體
 * 3. 重複直到符合或達到最小字體
 *
 * @example
 * ```tsx
 * const { ref, fontSize } = useAutoFitText({ text: itemName, maxLines: 2 })
 * return (
 *   <h3
 *     ref={ref}
 *     style={{ fontSize: `${fontSize}px` }}
 *     className="font-bold line-clamp-2"
 *   >
 *     {itemName}
 *   </h3>
 * )
 * ```
 */
export function useAutoFitText({
  text,
  maxLines = 2,
  minFontSize = 12,
  maxFontSize = 18,
  step = 1,
}: UseAutoFitTextOptions): UseAutoFitTextReturn {
  const ref = useRef<HTMLElement | null>(null)
  const [fontSize, setFontSize] = useState(maxFontSize)
  const [isReady, setIsReady] = useState(false)
  // 追蹤 ResizeObserver 的 raf，確保可以在 cleanup 時取消
  const resizeRafIdRef = useRef<number | null>(null)

  const calculateFontSize = useCallback(() => {
    const element = ref.current
    if (!element) return

    // 暫時移除 line-clamp 以獲取真實高度
    const originalWebkitLineClamp = element.style.webkitLineClamp
    const originalOverflow = element.style.overflow
    const originalDisplay = element.style.display
    element.style.webkitLineClamp = 'unset'
    element.style.overflow = 'visible'
    element.style.display = 'block'

    // 從最大字體開始嘗試
    let currentSize = maxFontSize
    element.style.fontSize = `${currentSize}px`

    // 取得 lineHeight（若未設定則使用 1.5 作為預設）
    const computedStyle = window.getComputedStyle(element)
    const lineHeight = parseFloat(computedStyle.lineHeight) || currentSize * 1.5
    const maxHeight = lineHeight * maxLines

    // 測量並調整
    while (currentSize > minFontSize && element.scrollHeight > maxHeight + 1) {
      currentSize -= step
      element.style.fontSize = `${currentSize}px`
    }

    // 恢復原本的樣式
    element.style.webkitLineClamp = originalWebkitLineClamp
    element.style.overflow = originalOverflow
    element.style.display = originalDisplay

    setFontSize(currentSize)
    setIsReady(true)
  }, [maxLines, minFontSize, maxFontSize, step])

  // 使用 useLayoutEffect 避免閃爍
  useLayoutEffect(() => {
    // 重置狀態
    setIsReady(false)
    setFontSize(maxFontSize)

    // 使用 requestAnimationFrame 確保 DOM 已渲染
    const rafId = requestAnimationFrame(() => {
      calculateFontSize()
    })

    return () => cancelAnimationFrame(rafId)
  }, [text, calculateFontSize, maxFontSize])

  // 監聯容器大小變化
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const resizeObserver = new ResizeObserver(() => {
      // 取消前一個 pending 的 raf（防抖處理）
      if (resizeRafIdRef.current !== null) {
        cancelAnimationFrame(resizeRafIdRef.current)
      }
      resizeRafIdRef.current = requestAnimationFrame(() => {
        resizeRafIdRef.current = null
        calculateFontSize()
      })
    })

    resizeObserver.observe(element.parentElement || element)

    return () => {
      // 確保取消 pending 的 raf
      if (resizeRafIdRef.current !== null) {
        cancelAnimationFrame(resizeRafIdRef.current)
        resizeRafIdRef.current = null
      }
      resizeObserver.disconnect()
    }
  }, [calculateFontSize])

  return { ref, fontSize, isReady }
}
