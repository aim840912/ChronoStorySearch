'use client'

import type { EnhanceableEquipment } from '@/types/enhance'
import type { ItemEquipmentStats } from '@/types'

interface EquipmentStatsDisplayProps {
  equipment: EnhanceableEquipment
}

interface StatEntry {
  label: string
  key: keyof ItemEquipmentStats
}

const STAT_ENTRIES: StatEntry[] = [
  { label: 'STR', key: 'str' },
  { label: 'DEX', key: 'dex' },
  { label: 'INT', key: 'int' },
  { label: 'LUK', key: 'luk' },
  { label: '物理攻擊', key: 'watk' },
  { label: '魔法攻擊', key: 'matk' },
  { label: '物理防禦', key: 'wdef' },
  { label: '魔法防禦', key: 'mdef' },
  { label: 'HP', key: 'hp' },
  { label: 'MP', key: 'mp' },
  { label: '命中率', key: 'accuracy' },
  { label: '迴避率', key: 'avoidability' },
  { label: '移動速度', key: 'speed' },
  { label: '跳躍力', key: 'jump' }
]

export function EquipmentStatsDisplay({ equipment }: EquipmentStatsDisplayProps) {
  const { currentStats, originalStats, isDestroyed, remainingUpgrades, enhanceCount } = equipment

  // 計算屬性變化
  const getStatChange = (key: keyof ItemEquipmentStats): number | null => {
    const current = currentStats[key]
    const original = originalStats[key]

    if (current === null || original === null) return null
    if (typeof current !== 'number' || typeof original !== 'number') return null

    return current - original
  }

  // 格式化屬性顯示
  const formatStat = (value: number | null, change: number | null) => {
    if (value === null || value === 0) {
      return <span className="text-gray-400">-</span>
    }

    if (change === null || change === 0) {
      return <span>{value}</span>
    }

    return (
      <span className={change > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>
        {value} <span className="text-sm">({change > 0 ? '+' : ''}{change})</span>
      </span>
    )
  }

  return (
    <div className={`border rounded-lg p-6 ${
      isDestroyed
        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
    }`}>
      {/* 標題 */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {equipment.chineseName}
          {equipment.enhanceCount > 0 && ` (+${equipment.enhanceCount})`}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {equipment.category}
          </span>
          {isDestroyed ? (
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              已毀滅
            </span>
          ) : (
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              剩餘 {remainingUpgrades} 次升級機會
            </span>
          )}
        </div>
        {enhanceCount > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            已強化 {enhanceCount} 次
          </div>
        )}
      </div>

      {/* 屬性列表 */}
      <div className="grid grid-cols-2 gap-3">
        {STAT_ENTRIES.map(({ label, key }) => {
          const currentValue = currentStats[key] as number | null
          const change = getStatChange(key)

          // 只顯示有值的屬性
          if (currentValue === null || currentValue === 0) {
            return null
          }

          return (
            <div key={key} className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {label}:
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatStat(currentValue, change)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
