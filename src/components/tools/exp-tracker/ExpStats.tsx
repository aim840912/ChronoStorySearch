'use client'

import { memo } from 'react'
import type { ExpStatsProps } from '@/types/exp-tracker'
import { formatExp } from '@/lib/exp-calculator'

/**
 * 經驗統計面板
 * 顯示每分鐘/10分鐘/小時經驗
 */
export const ExpStats = memo(function ExpStats({
  stats,
  t,
}: ExpStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {/* 每分鐘經驗 */}
      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
        <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
          {t('expPerMinute')}
        </p>
        <p className="text-lg font-bold text-purple-700 dark:text-purple-300 font-mono">
          {formatExp(stats.expPerMinute)}
        </p>
      </div>

      {/* 每10分鐘經驗 */}
      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
        <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
          {t('expPer10Min')}
        </p>
        <p className="text-lg font-bold text-purple-700 dark:text-purple-300 font-mono">
          {formatExp(stats.expPer10Minutes)}
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
