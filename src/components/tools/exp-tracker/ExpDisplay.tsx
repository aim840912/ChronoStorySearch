'use client'

import { memo } from 'react'
import type { ExpDisplayProps } from '@/types/exp-tracker'
import { formatExp, getIntervalLabel, calculateExpPerInterval } from '@/lib/exp-calculator'

/**
 * 經驗值顯示元件
 * 顯示當前經驗值和每間隔經驗
 */
export const ExpDisplay = memo(function ExpDisplay({
  currentExp,
  expPerMinute,
  isTracking,
  secondsUntilNextCapture,
  captureInterval,
  t,
}: ExpDisplayProps) {
  // 計算每間隔經驗和動態標籤
  const expPerInterval = calculateExpPerInterval(expPerMinute, captureInterval)
  const intervalLabel = getIntervalLabel(captureInterval)
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="grid grid-cols-2 gap-4">
        {/* 當前經驗值 */}
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('currentExp')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
            {currentExp !== null ? formatExp(currentExp) : '--'}
          </p>
        </div>

        {/* 每間隔經驗 */}
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            EXP/{intervalLabel}
          </p>
          <p
            className={`text-2xl font-bold font-mono ${
              expPerInterval > 0
                ? 'text-green-500'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {expPerInterval > 0 ? (
              <>+{formatExp(expPerInterval)}</>
            ) : (
              '--'
            )}
          </p>
        </div>
      </div>

      {/* 追蹤狀態指示 */}
      {isTracking && (
        <div className="mt-3 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          <span className="text-sm text-purple-600 dark:text-purple-400">
            {t('tracking')}
          </span>
          {secondsUntilNextCapture > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              ({secondsUntilNextCapture}s)
            </span>
          )}
        </div>
      )}
    </div>
  )
})
