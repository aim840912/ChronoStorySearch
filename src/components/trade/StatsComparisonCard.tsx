'use client'

import type { ItemStats, StatsGrade } from '@/types/item-stats'
import { STAT_LABELS_ZH, STAT_LABELS_EN, STATS_GRADE_INFO, STAT_KEYS } from '@/types/item-stats'

interface StatsComparisonCardProps {
  stats: ItemStats
  grade?: StatsGrade | null
  score?: number | null
  locale?: 'zh-TW' | 'en'
  className?: string
  showGrade?: boolean
  compact?: boolean
}

/**
 * 物品屬性比較卡片
 *
 * 功能：
 * - 顯示物品的實際屬性與最大屬性
 * - 顯示素質等級 (S/A/B/C/D/F)
 * - 用進度條視覺化呈現屬性比例
 * - 支援精簡模式(僅顯示有值的屬性)
 * - 支援中英雙語
 */
export function StatsComparisonCard({
  stats,
  grade,
  score,
  locale = 'zh-TW',
  className = '',
  showGrade = true,
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

    // 計算百分比 (用於進度條)
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
        <div className="space-y-2">{rows}</div>
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

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 素質等級 */}
      {showGrade && grade && score !== null && (
        <div className="p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {locale === 'zh-TW' ? '素質等級' : 'Grade'}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-lg font-bold rounded ${STATS_GRADE_INFO[grade].color}`}
              >
                {grade}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {locale === 'zh-TW' ? STATS_GRADE_INFO[grade].label_zh : STATS_GRADE_INFO[grade].label_en}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({score}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 攻擊屬性 */}
      {renderStatGroup(
        locale === 'zh-TW' ? '攻擊屬性' : 'Attack',
        [
          ['watk', 'watk_max', labels.watk],
          ['matk', 'matk_max', labels.matk]
        ]
      )}

      {/* 防禦屬性 */}
      {renderStatGroup(
        locale === 'zh-TW' ? '防禦屬性' : 'Defense',
        [
          ['wdef', 'wdef_max', labels.wdef],
          ['mdef', 'mdef_max', labels.mdef]
        ]
      )}

      {/* 基礎屬性 */}
      {renderStatGroup(
        locale === 'zh-TW' ? '基礎屬性' : 'Primary Stats',
        [
          ['str', 'str_max', labels.str],
          ['dex', 'dex_max', labels.dex],
          ['int', 'int_max', labels.int],
          ['luk', 'luk_max', labels.luk]
        ]
      )}

      {/* 生命/魔力 */}
      {renderStatGroup(
        locale === 'zh-TW' ? '生命/魔力' : 'HP/MP',
        [
          ['hp', 'hp_max', labels.hp],
          ['mp', 'mp_max', labels.mp]
        ]
      )}

      {/* 命中/迴避 */}
      {renderStatGroup(
        locale === 'zh-TW' ? '命中/迴避' : 'Accuracy/Avoid',
        [
          ['acc', 'acc_max', labels.acc],
          ['avoid', 'avoid_max', labels.avoid]
        ]
      )}

      {/* 移動/跳躍 */}
      {renderStatGroup(
        locale === 'zh-TW' ? '移動/跳躍' : 'Speed/Jump',
        [
          ['speed', 'speed_max', labels.speed],
          ['jump', 'jump_max', labels.jump]
        ]
      )}

      {/* 升級資訊 */}
      {(stats.slots !== undefined || stats.scrolled !== undefined) && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {locale === 'zh-TW' ? '升級資訊' : 'Upgrade Info'}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {stats.slots !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {labels.slots}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.slots}
                </span>
              </div>
            )}
            {stats.scrolled !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {labels.scrolled}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.scrolled}
                </span>
              </div>
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
