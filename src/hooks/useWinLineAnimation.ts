import { useState, useCallback, useEffect, useRef } from 'react'
import type { WinLineAnimationStatus } from '@/types/slot'

/**
 * 獲勝線條動畫控制 Hook
 *
 * 狀態轉換流程：
 * idle → flashing (逐條閃爍 6.4 秒) → showing (持續顯示) → idle
 */
export function useWinLineAnimation() {
  const [status, setStatus] = useState<WinLineAnimationStatus>('idle')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * 開始播放獲勝線條動畫
   * @param winLineCount - 獲勝線條數量
   */
  const startAnimation = useCallback((winLineCount: number) => {
    if (winLineCount === 0) {
      setStatus('idle')
      return
    }

    // 開始逐條閃爍
    setStatus('flashing')

    // 計算總閃爍時間：每條線 0.8 秒
    const totalFlashDuration = winLineCount * 800 // ms

    // 閃爍完成後，切換到持續顯示模式
    timerRef.current = setTimeout(() => {
      setStatus('showing')
    }, totalFlashDuration)
  }, [])

  /**
   * 清除動畫，重置為 idle 狀態
   */
  const clearAnimation = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setStatus('idle')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    status,
    startAnimation,
    clearAnimation,
  }
}
