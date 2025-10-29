'use client'

import type { ItemStats } from '@/types/item-stats'
import { STAT_LABELS_ZH, STAT_LABELS_EN, STAT_KEYS } from '@/types/item-stats'

interface StatsComparisonCardProps {
  stats: ItemStats
  locale?: 'zh-TW' | 'en'
  className?: string
  showMaxValues?: boolean
  compact?: boolean
}

/**
 * 物品屬性比較卡片
 *
 * 功能：
 * - 顯示物品的實際屬性與最大屬性
 * - 用進度條視覺化呈現屬性比例
 * - 支援精簡模式(僅顯示有值的屬性)
 * - 支援中英雙語
 */
export function StatsComparisonCard({
  stats,
  locale = 'zh-TW',
  className = '',
  showMaxValues = true,
  compact = false
}: StatsComparisonCardProps) {
  const labels = locale === 'zh-TW' ? STAT_LABELS_ZH : STAT_LABELS_EN

  // 渲染單一屬性行 (實際/最大 + 進度條)
  const renderStatRow = (
    actualKey: keyof ItemStats,
    maxKey: keyof ItemStats,
    label: string
  ) => {
    const actualValue = stats[actualKey] as number | undefined
    const maxValue = stats[maxKey] as number | undefined

    // 精簡模式下,只顯示有值的屬性
    if (compact && actualValue === undefined && maxValue === undefined) {
      return null
    }

    // 當 showMaxValues=false 時，使用簡化的單欄顯示（類似 ItemStatsInput simpleMode）
    if (!showMaxValues) {
      return (
        <div key={actualKey} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          <span className="text-sm text-gray-900 dark:text-white">
            {actualValue ?? '-'}
          </span>
        </div>
      )
    }

    // 以下是原有的進度條模式（showMaxValues=true）
    const percentage =
      actualValue !== undefined && maxValue !== undefined && maxValue > 0
        ? Math.round((actualValue / maxValue) * 100)
        : 0

    // 根據百分比決定顏色
    let barColor = 'bg-gray-300 dark:bg-gray-700'
    if (percentage >= 95) {
      barColor = 'bg-purple-500'
    } else if (percentage >= 85) {
      barColor = 'bg-blue-500'
    } else if (percentage >= 70) {
      barColor = 'bg-green-500'
    } else if (percentage >= 50) {
      barColor = 'bg-yellow-500'
    } else if (percentage >= 30) {
      barColor = 'bg-orange-500'
    } else if (percentage > 0) {
      barColor = 'bg-red-500'
    }

    return (
      <div key={actualKey} className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {actualValue ?? '-'} / {maxValue ?? '-'}
            {percentage > 0 && (
              <span className="ml-1 text-xs text-gray-500">({percentage}%)</span>
            )}
          </span>
        </div>
        {/* 進度條 */}
        {percentage > 0 && (
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  // 渲染屬性組別
  const renderStatGroup = (
    title: string,
    statPairs: Array<[keyof ItemStats, keyof ItemStats, string]>
  ) => {
    const rows = statPairs.map(([actualKey, maxKey, label]) =>
      renderStatRow(actualKey, maxKey, label)
    )

    // 精簡模式下,如果整組都沒有值,不顯示這一組
    if (compact && rows.every((row) => row === null)) {
      return null
    }

    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {title}
        </h4>
        {/* showMaxValues=false 時使用 4 列網格，否則使用垂直堆疊 */}
        <div className={showMaxValues ? "space-y-2" : "grid grid-cols-4 gap-3"}>
          {rows}
        </div>
      </div>
    )
  }

  // 檢查是否有任何有效屬性
  const hasAnyStats = STAT_KEYS.some((key) => {
    const actualValue = stats[key as keyof ItemStats]
    const maxKey = `${key}_max` as keyof ItemStats
    const maxValue = stats[maxKey]
    return actualValue !== undefined || maxValue !== undefined
  })

  if (!hasAnyStats && stats.slots === undefined && stats.scrolled === undefined) {
    return (
      <div className={`p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${className}`}>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {locale === 'zh-TW' ? '無屬性資訊' : 'No stats available'}
        </p>
      </div>
    )
  }

  // 渲染升級資訊欄位（用於融入 4 列網格）
  const renderUpgradeField = (key: 'slots' | 'scrolled') => {
    const value = stats[key]
    if (value === undefined) return null

    return (
      <div key={key} className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {labels[key]}
        </label>
        <span className="text-sm text-gray-900 dark:text-white">
          {value}
        </span>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 攻擊/防禦屬性（4 個欄位）*/}
      {renderStatGroup(
        locale === 'zh-TW' ? '攻擊/防禦屬性' : 'Attack/Defense',
        [
          ['watk', 'watk_max', labels.watk],
          ['matk', 'matk_max', labels.matk],
          ['wdef', 'wdef_max', labels.wdef],
          ['mdef', 'mdef_max', labels.mdef]
        ]
      )}

      {/* 基礎屬性（4 個欄位）*/}
      {renderStatGroup(
        locale === 'zh-TW' ? '基礎屬性' : 'Primary Stats',
        [
          ['str', 'str_max', labels.str],
          ['dex', 'dex_max', labels.dex],
          ['int', 'int_max', labels.int],
          ['luk', 'luk_max', labels.luk]
        ]
      )}

      {/* 生命/魔力/命中/迴避（4 個欄位）*/}
      {renderStatGroup(
        locale === 'zh-TW' ? '生命/魔力/命中/迴避' : 'HP/MP/Accuracy/Avoid',
        [
          ['hp', 'hp_max', labels.hp],
          ['mp', 'mp_max', labels.mp],
          ['acc', 'acc_max', labels.acc],
          ['avoid', 'avoid_max', labels.avoid]
        ]
      )}

      {/* 移動/跳躍/升級資訊（最多 4 個欄位）*/}
      {(stats.speed !== undefined || stats.jump !== undefined || stats.slots !== undefined || stats.scrolled !== undefined) && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {locale === 'zh-TW' ? '移動/跳躍/升級資訊' : 'Speed/Jump/Upgrade'}
          </h4>
          <div className={showMaxValues ? "space-y-2" : "grid grid-cols-4 gap-3"}>
            {renderStatRow('speed', 'speed_max', labels.speed)}
            {renderStatRow('jump', 'jump_max', labels.jump)}
            {!showMaxValues && renderUpgradeField('slots')}
            {!showMaxValues && renderUpgradeField('scrolled')}
            {/* showMaxValues 模式下，升級資訊單獨顯示 */}
            {showMaxValues && (stats.slots !== undefined || stats.scrolled !== undefined) && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {labels.slots}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.slots ?? '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {labels.scrolled}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.scrolled ?? '-'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 備註 */}
      {stats.notes && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {labels.notes}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {stats.notes}
          </p>
        </div>
      )}
    </div>
  )
}
