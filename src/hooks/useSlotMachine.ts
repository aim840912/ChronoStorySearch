import { useState, useCallback } from 'react'
import type { SlotMachineState, Reel } from '@/types/slot'
import { spinSlotMachine } from '@/lib/slot-utils'
import { useWinLineAnimation } from './useWinLineAnimation'

/**
 * 拉霸機狀態管理 Hook
 *
 * 管理拉霸機的狀態、旋轉邏輯和結果
 */
export function useSlotMachine() {
  const { status: winLineStatus, startAnimation, clearAnimation } = useWinLineAnimation()

  const [state, setState] = useState<SlotMachineState>({
    reels: [
      { index: 0, symbols: [null, null, null], status: 'idle' },
      { index: 1, symbols: [null, null, null], status: 'idle' },
      { index: 2, symbols: [null, null, null], status: 'idle' },
    ],
    isSpinning: false,
    lastResult: null,
    totalSpins: 0,
    totalWins: 0,
    winLineStatus: 'idle',
  })

  /**
   * 開始旋轉拉霸機
   */
  const spin = useCallback(() => {
    // 防止重複旋轉
    if (state.isSpinning) {
      return
    }

    // 清除之前的獲勝線條動畫
    clearAnimation()

    // 設定所有轉輪為旋轉狀態
    setState((prev) => ({
      ...prev,
      isSpinning: true,
      winLineStatus: 'idle',
      reels: prev.reels.map((reel) => ({
        ...reel,
        status: 'spinning',
      })) as [Reel, Reel, Reel],
    }))

    // 生成結果
    const result = spinSlotMachine()

    // result.symbols 是 3×3 網格（按行存儲）：
    // [
    //   [上排左, 上排中, 上排右],   // 位置 0, 1, 2
    //   [中排左, 中排中, 中排右],   // 位置 3, 4, 5
    //   [下排左, 下排中, 下排右]    // 位置 6, 7, 8
    // ]
    //
    // 需要轉置為按列顯示（每個 reel 顯示一列的 3 個符號）：
    // reel[0] = [上排左, 中排左, 下排左]  (第 1 列)
    // reel[1] = [上排中, 中排中, 下排中]  (第 2 列)
    // reel[2] = [上排右, 中排右, 下排右]  (第 3 列)

    // 模擬轉輪依序停止
    // 轉輪 1 在 800ms 停止
    setTimeout(() => {
      setState((prev) => {
        const newReels = [...prev.reels] as [Reel, Reel, Reel]
        newReels[0] = {
          ...newReels[0],
          symbols: [result.symbols[0][0], result.symbols[1][0], result.symbols[2][0]], // 第 1 列
          status: 'stopping',
        }
        return { ...prev, reels: newReels }
      })

      setTimeout(() => {
        setState((prev) => {
          const newReels = [...prev.reels] as [Reel, Reel, Reel]
          newReels[0] = { ...newReels[0], status: 'stopped' }
          return { ...prev, reels: newReels }
        })
      }, 100)
    }, 800)

    // 轉輪 2 在 1200ms 停止
    setTimeout(() => {
      setState((prev) => {
        const newReels = [...prev.reels] as [Reel, Reel, Reel]
        newReels[1] = {
          ...newReels[1],
          symbols: [result.symbols[0][1], result.symbols[1][1], result.symbols[2][1]], // 第 2 列
          status: 'stopping',
        }
        return { ...prev, reels: newReels }
      })

      setTimeout(() => {
        setState((prev) => {
          const newReels = [...prev.reels] as [Reel, Reel, Reel]
          newReels[1] = { ...newReels[1], status: 'stopped' }
          return { ...prev, reels: newReels }
        })
      }, 100)
    }, 1200)

    // 轉輪 3 在 1600ms 停止
    setTimeout(() => {
      setState((prev) => {
        const newReels = [...prev.reels] as [Reel, Reel, Reel]
        newReels[2] = {
          ...newReels[2],
          symbols: [result.symbols[0][2], result.symbols[1][2], result.symbols[2][2]], // 第 3 列
          status: 'stopping',
        }
        return { ...prev, reels: newReels }
      })

      setTimeout(() => {
        setState((prev) => {
          const newReels = [...prev.reels] as [Reel, Reel, Reel]
          newReels[2] = { ...newReels[2], status: 'stopped' }
          return { ...prev, reels: newReels }
        })
      }, 100)
    }, 1600)

    // 所有轉輪停止後，更新結果
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isSpinning: false,
        lastResult: result,
        totalSpins: prev.totalSpins + 1,
        totalWins: result.isWin ? prev.totalWins + 1 : prev.totalWins,
        reels: prev.reels.map((reel) => ({
          ...reel,
          status: 'idle',
        })) as [Reel, Reel, Reel],
      }))

      // 如果中獎，啟動獲勝線條動畫
      if (result.isWin) {
        startAnimation(result.winLines.length)
      }
    }, 1800)
  }, [state.isSpinning, startAnimation])

  /**
   * 重置拉霸機狀態
   */
  const reset = useCallback(() => {
    // 清除獲勝線條動畫
    clearAnimation()

    setState({
      reels: [
        { index: 0, symbols: [null, null, null], status: 'idle' },
        { index: 1, symbols: [null, null, null], status: 'idle' },
        { index: 2, symbols: [null, null, null], status: 'idle' },
      ],
      isSpinning: false,
      lastResult: null,
      totalSpins: 0,
      totalWins: 0,
      winLineStatus: 'idle',
    })
  }, [clearAnimation])

  return {
    state: {
      ...state,
      winLineStatus,
    },
    spin,
    reset,
  }
}
