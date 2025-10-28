'use client'

import { useState, useEffect } from 'react'
import type { ItemStats } from '@/types/item-stats'
import { STAT_LABELS_ZH, STAT_LABELS_EN } from '@/types/item-stats'

interface ItemStatsInputProps {
  value: ItemStats | null
  onChange: (stats: ItemStats | null) => void
  locale?: 'zh-TW' | 'en'
  className?: string
  simpleMode?: boolean // 簡易模式：只顯示單一輸入框，不顯示最大值
}

/**
 * 物品屬性輸入元件
 *
 * 功能：
 * - 提供攻擊、防禦、基礎屬性等輸入欄位
 * - 支援清空所有屬性
 * - 支援中英雙語
 */
export function ItemStatsInput({
  value,
  onChange,
  locale = 'zh-TW',
  className = '',
  simpleMode = false
}: ItemStatsInputProps) {
  const [stats, setStats] = useState<ItemStats>(value || {})

  const labels = locale === 'zh-TW' ? STAT_LABELS_ZH : STAT_LABELS_EN

  // 當 stats 改變時更新
  useEffect(() => {
    const hasValidStats = Object.keys(stats).some((key) => {
      const value = stats[key as keyof ItemStats]
      return typeof value === 'number' && value > 0
    })

    if (hasValidStats) {
      onChange(stats)
    } else {
      onChange(null)
    }
  }, [stats, onChange])

  // 更新單一屬性
  const updateStat = (key: keyof ItemStats, valueStr: string) => {
    const newStats = { ...stats }

    if (valueStr === '') {
      // 清除該屬性
      delete newStats[key]
    } else {
      const num = key === 'notes' ? valueStr : parseInt(valueStr, 10)
      if (key === 'notes') {
        newStats[key] = valueStr as never
      } else if (!isNaN(num as number)) {
        newStats[key] = num as never
      }
    }

    setStats(newStats)
  }

  // 清空所有屬性
  const clearAll = () => {
    setStats({})
    onChange(null)
  }

  // 渲染數值輸入欄位 (實際/最大 或 單一欄位)
  const renderStatPair = (
    actualKey: keyof ItemStats,
    maxKey: keyof ItemStats,
    label: string
  ) => {
    if (simpleMode) {
      // 簡易模式：只顯示單一輸入框
      return (
        <div key={actualKey} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          <input
            type="number"
            min="0"
            max="999"
            value={(stats[actualKey] as number) ?? ''}
            onChange={(e) => updateStat(actualKey, e.target.value)}
            placeholder="0"
            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      )
    }

    // 完整模式：實際/最大
    return (
      <div key={actualKey} className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="0"
            max="999"
            value={(stats[actualKey] as number) ?? ''}
            onChange={(e) => updateStat(actualKey, e.target.value)}
            placeholder={locale === 'zh-TW' ? '實際' : 'Actual'}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <span className="text-gray-400">/</span>
          <input
            type="number"
            min="0"
            max="999"
            value={(stats[maxKey] as number) ?? ''}
            onChange={(e) => updateStat(maxKey, e.target.value)}
            placeholder={locale === 'zh-TW' ? '最大' : 'Max'}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 標題與清空按鈕 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {locale === 'zh-TW' ? '物品屬性' : 'Item Stats'}
        </h3>
        <button
          type="button"
          onClick={clearAll}
          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          {locale === 'zh-TW' ? '清空全部' : 'Clear All'}
        </button>
      </div>

      {/* 攻擊/防禦屬性 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {locale === 'zh-TW' ? '攻擊/防禦屬性' : 'Attack/Defense'}
        </h4>
        <div className="grid grid-cols-4 gap-3">
          {renderStatPair('watk', 'watk_max', labels.watk)}
          {renderStatPair('matk', 'matk_max', labels.matk)}
          {renderStatPair('wdef', 'wdef_max', labels.wdef)}
          {renderStatPair('mdef', 'mdef_max', labels.mdef)}
        </div>
      </div>

      {/* 基礎屬性 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {locale === 'zh-TW' ? '基礎屬性' : 'Primary Stats'}
        </h4>
        <div className="grid grid-cols-4 gap-3">
          {renderStatPair('str', 'str_max', labels.str)}
          {renderStatPair('dex', 'dex_max', labels.dex)}
          {renderStatPair('int', 'int_max', labels.int)}
          {renderStatPair('luk', 'luk_max', labels.luk)}
        </div>
      </div>

      {/* 生命/魔力/命中/迴避 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {locale === 'zh-TW' ? '生命/魔力/命中/迴避' : 'HP/MP/Acc/Avoid'}
        </h4>
        <div className="grid grid-cols-4 gap-3">
          {renderStatPair('hp', 'hp_max', labels.hp)}
          {renderStatPair('mp', 'mp_max', labels.mp)}
          {renderStatPair('acc', 'acc_max', labels.acc)}
          {renderStatPair('avoid', 'avoid_max', labels.avoid)}
        </div>
      </div>

      {/* 移動/跳躍/升級 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {locale === 'zh-TW' ? '移動/跳躍/升級' : 'Speed/Jump/Upgrade'}
        </h4>
        <div className="grid grid-cols-4 gap-3">
          {renderStatPair('speed', 'speed_max', labels.speed)}
          {renderStatPair('jump', 'jump_max', labels.jump)}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {labels.slots}
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={(stats.slots as number) ?? ''}
              onChange={(e) => updateStat('slots', e.target.value)}
              placeholder="0"
              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {labels.scrolled}
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={(stats.scrolled as number) ?? ''}
              onChange={(e) => updateStat('scrolled', e.target.value)}
              placeholder="0"
              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* 備註 */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {labels.notes}
        </label>
        <textarea
          value={(stats.notes as string) ?? ''}
          onChange={(e) => updateStat('notes', e.target.value)}
          placeholder={locale === 'zh-TW' ? '例: 已打 10% 攻擊卷 x2' : 'e.g., Scrolled with 10% ATK x2'}
          maxLength={500}
          rows={3}
          className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {(stats.notes as string)?.length || 0} / 500
        </div>
      </div>
    </div>
  )
}
