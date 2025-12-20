'use client'

import { memo } from 'react'
import type { ExpDisplayProps } from '@/types/exp-tracker'
import { formatExp } from '@/lib/exp-calculator'

/**
 * 經驗值顯示元件
 * 顯示當前經驗值和變化量
 */
export const ExpDisplay = memo(function ExpDisplay({
  currentExp,
  previousExp,
  confidence: _confidence, // Used by OcrConfidence component separately
  isTracking,
  t,
}: ExpDisplayProps) {
  // 計算經驗變化
  const expChange =
    currentExp !== null && previousExp !== null ? currentExp - previousExp : null

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

        {/* 變化量 */}
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('expChange')}
          </p>
          <p
            className={`text-2xl font-bold font-mono ${
              expChange !== null && expChange > 0
                ? 'text-green-500'
                : expChange !== null && expChange < 0
                  ? 'text-red-500'
                  : 'text-gray-900 dark:text-white'
            }`}
          >
            {expChange !== null ? (
              <>
                {expChange > 0 ? '+' : ''}
                {formatExp(expChange)}
              </>
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
            追蹤中...
          </span>
        </div>
      )}
    </div>
  )
})
