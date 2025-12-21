'use client'

import { memo } from 'react'
import type { ExpStatsProps } from '@/types/exp-tracker'
import { formatExp, getIntervalLabel, calculateExpPerInterval } from '@/lib/exp-calculator'

/**
 * 經驗統計面板
 * 顯示每間隔/每小時經驗
 */
export const ExpStats = memo(function ExpStats({
  stats,
  captureInterval,
  t,
}: ExpStatsProps) {
  // 計算每間隔經驗和動態標籤
  const expPerInterval = calculateExpPerInterval(stats.expPerMinute, captureInterval)
  const intervalLabel = getIntervalLabel(captureInterval)

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* 每間隔經驗 */}
      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
        <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
          EXP/{intervalLabel}
        </p>
        <p className="text-lg font-bold text-purple-700 dark:text-purple-300 font-mono">
          {formatExp(expPerInterval)}
        </p>
      </div>

      {/* 每小時經驗 */}
      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
        <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
          {t('expPerHour')}
        </p>
        <p className="text-lg font-bold text-purple-700 dark:text-purple-300 font-mono">
          {formatExp(stats.expPerHour)}
        </p>
      </div>
    </div>
  )
})
