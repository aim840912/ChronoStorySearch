'use client'

import { memo } from 'react'
import type { ExpDisplayProps } from '@/types/exp-tracker'
import { formatExp, getIntervalLabel, calculateExpPerInterval } from '@/lib/exp-calculator'

/**
 * 格式化時間（分鐘轉為可讀格式）
 */
function formatTime(minutes: number, t: (key: string) => string): string {
  if (minutes < 60) {
    return `${minutes} ${t('minuteUnit')}`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours < 24) {
    return mins > 0
      ? `${hours} ${t('hours')} ${mins} ${t('minuteUnit')}`
      : `${hours} ${t('hours')}`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0
    ? `${days} ${t('days')} ${remainingHours} ${t('hours')}`
    : `${days} ${t('days')}`
}

/**
 * 經驗值顯示元件
 * 顯示當前經驗值、百分比和升級預估
 */
export const ExpDisplay = memo(function ExpDisplay({
  currentExp,
  currentPercentage,
  levelUpEstimate,
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
            {currentPercentage != null && (
              <span className="text-sm text-purple-500 ml-2">
                [{currentPercentage.toFixed(2)}%]
              </span>
            )}
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

      {/* 升級預估 */}
      {levelUpEstimate && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('timeToLevelUp')}
              </p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {formatTime(levelUpEstimate.minutesToLevelUp, t)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t('remainingExp')}
              </p>
              <p className="text-sm font-mono text-gray-600 dark:text-gray-300">
                {formatExp(levelUpEstimate.remainingExp)}
              </p>
            </div>
          </div>
        </div>
      )}

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
