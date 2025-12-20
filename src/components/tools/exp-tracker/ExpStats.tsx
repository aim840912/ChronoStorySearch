'use client'

import { memo } from 'react'
import type { ExpStatsProps } from '@/types/exp-tracker'
import { formatExp, formatTimeRemaining } from '@/lib/exp-calculator'

/**
 * 經驗統計面板
 * 顯示每分鐘/10分鐘/小時經驗和升級預估時間
 */
export const ExpStats = memo(function ExpStats({
  stats,
  currentLevel,
  targetLevel,
  onCurrentLevelChange,
  onTargetLevelChange,
  t,
}: ExpStatsProps) {
  return (
    <div className="space-y-4">
      {/* 等級設定 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('currentLevel')}
          </label>
          <input
            type="number"
            min={1}
            max={200}
            value={currentLevel}
            onChange={(e) => onCurrentLevelChange(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600
                       rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('targetLevel')}
          </label>
          <input
            type="number"
            min={1}
            max={200}
            value={targetLevel}
            onChange={(e) => onTargetLevelChange(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600
                       rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 統計數據 */}
      <div className="grid grid-cols-2 gap-3">
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

        {/* 預估升級時間 */}
        <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
          <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
            {t('timeToLevelUp')}
          </p>
          <p className="text-lg font-bold text-purple-700 dark:text-purple-300 font-mono">
            {stats.timeToLevelUp !== null
              ? formatTimeRemaining(stats.timeToLevelUp)
              : '--'}
          </p>
        </div>
      </div>
    </div>
  )
})
