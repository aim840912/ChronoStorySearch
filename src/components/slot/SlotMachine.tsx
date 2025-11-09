'use client'

import { useSlotMachine } from '@/hooks/useSlotMachine'
import { ReelDisplay } from './ReelDisplay'
import { PayoutTable } from './PayoutTable'
import { WinLineOverlay } from './WinLineOverlay'
import { toast } from 'sonner'
import { useEffect } from 'react'

/**
 * 拉霸機主元件
 * 整合所有拉霸機功能
 */
export function SlotMachine() {
  const { state, spin, reset } = useSlotMachine()

  // 當有結果時顯示通知
  useEffect(() => {
    if (state.lastResult) {
      if (state.lastResult.isWin) {
        const winLineNames = state.lastResult.winLines.map(line => line.name).join('、')
        toast.success(`恭喜！獲得 ${state.lastResult.totalPayout}x 賠率！`, {
          description: `獲勝線：${winLineNames}`,
          duration: 3000,
        })
      }
    }
  }, [state.lastResult])

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* 標題 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          拉霸機
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          純娛樂小遊戲 - 無實質獎勵
        </p>
      </div>

      {/* 轉輪顯示區 */}
      <div className="relative inline-block">
        <div className="flex gap-2">
          {state.reels.map((reel) => (
            <ReelDisplay key={reel.index} reel={reel} />
          ))}
        </div>

        {/* 獲勝線條 Overlay */}
        {state.lastResult && state.lastResult.isWin && (
          <WinLineOverlay
            winLines={state.lastResult.winLines}
            animationStatus={state.winLineStatus}
            isMobile={true}
          />
        )}
      </div>

      {/* 結果顯示 */}
      {state.lastResult && !state.isSpinning && (
        <div className="text-center">
          {state.lastResult.isWin ? (
            <div className="space-y-1">
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                🎉 獲勝！
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                賠率：{state.lastResult.totalPayout}x
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {state.lastResult.winLines.length} 條線中獎：{state.lastResult.winLines.map(line => line.name).join('、')}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              再試一次吧！
            </p>
          )}
        </div>
      )}

      {/* 控制按鈕 */}
      <div className="flex gap-3">
        <button
          onClick={spin}
          disabled={state.isSpinning}
          className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
            state.isSpinning
              ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 active:scale-95 hover:scale-105'
          }`}
        >
          {state.isSpinning ? '旋轉中...' : '開始旋轉'}
        </button>

        <button
          onClick={reset}
          disabled={state.isSpinning}
          className={`px-6 py-3 rounded-lg font-semibold border-2 transition-all duration-200 ${
            state.isSpinning
              ? 'border-gray-300 text-gray-400 dark:border-gray-700 dark:text-gray-600 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:scale-105 active:scale-95'
          }`}
        >
          重置
        </button>
      </div>

      {/* 統計資訊 */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs text-center">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">總次數</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {state.totalSpins}
          </p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">獲勝次數</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {state.totalWins}
          </p>
        </div>
      </div>

      {/* 賠率表 */}
      <div className="w-full max-w-md">
        <PayoutTable />
      </div>
    </div>
  )
}
