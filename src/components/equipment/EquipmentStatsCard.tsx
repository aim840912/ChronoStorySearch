'use client'

import type { ItemEquipmentStats } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

interface EquipmentStatsCardProps {
  stats: ItemEquipmentStats
}

/**
 * 裝備屬性卡片（簡化版）
 * 只顯示裝備屬性，不包含需求、職業限制等資訊
 * 專為 GachaItemTooltip 設計
 */
export function EquipmentStatsCard({ stats }: EquipmentStatsCardProps) {
  const { t } = useLanguage()

  // 裝備屬性配置（按照顯示優先級排序）
  const equipmentStats = [
    { key: 'watk', label: t('item.watk'), value: stats.watk, color: 'text-red-600 dark:text-red-400' },
    { key: 'matk', label: t('item.matk'), value: stats.matk, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'wdef', label: t('item.wdef'), value: stats.wdef, color: 'text-green-600 dark:text-green-400' },
    { key: 'mdef', label: t('item.mdef'), value: stats.mdef, color: 'text-cyan-600 dark:text-cyan-400' },
    { key: 'str', label: t('item.str'), value: stats.str, color: 'text-orange-600 dark:text-orange-400' },
    { key: 'dex', label: t('item.dex'), value: stats.dex, color: 'text-yellow-600 dark:text-yellow-400' },
    { key: 'int', label: t('item.int'), value: stats.int, color: 'text-purple-600 dark:text-purple-400' },
    { key: 'luk', label: t('item.luk'), value: stats.luk, color: 'text-pink-600 dark:text-pink-400' },
    { key: 'hp', label: t('item.hp'), value: stats.hp, color: 'text-rose-600 dark:text-rose-400' },
    { key: 'mp', label: t('item.mp'), value: stats.mp, color: 'text-indigo-600 dark:text-indigo-400' },
    { key: 'accuracy', label: t('item.accuracy'), value: stats.accuracy, color: 'text-amber-600 dark:text-amber-400' },
    { key: 'avoidability', label: t('item.avoidability'), value: stats.avoidability, color: 'text-lime-600 dark:text-lime-400' },
    { key: 'speed', label: t('item.speed'), value: stats.speed, color: 'text-teal-600 dark:text-teal-400' },
    { key: 'jump', label: t('item.jump'), value: stats.jump, color: 'text-sky-600 dark:text-sky-400' },
    { key: 'upgrades', label: t('item.upgrades'), value: stats.upgrades, color: 'text-violet-600 dark:text-violet-400' },
  ].filter(stat => stat.value !== null && stat.value !== 0)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-gray-400 dark:border-gray-600 overflow-hidden">
      {/* 標題 */}
      <div className="bg-gray-600 dark:bg-gray-700 px-4 py-3">
        <h3 className="text-lg font-bold text-white">
          {t('item.stats')}
        </h3>
      </div>

      {/* 裝備屬性列表 */}
      <div className="p-4">
        {equipmentStats.length > 0 ? (
          <div className="flex flex-col gap-2">
            {equipmentStats.map(({ key, label, value, color }) => (
              <div
                key={key}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2.5 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                {/* 屬性名稱 */}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </span>

                {/* 屬性數值 */}
                <span className={`text-lg font-bold ${color} tabular-nums`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            {t('item.noStats')}
          </p>
        )}
      </div>
    </div>
  )
}
