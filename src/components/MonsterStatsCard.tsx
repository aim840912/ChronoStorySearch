'use client'

import type { MonsterStats } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  StarIcon,
  HeartIcon,
  SparklesIcon,
  BoltIcon,
  SwordIcon,
  ShieldIcon,
  FireIcon,
  StarShineIcon,
  TargetIcon,
  WindIcon,
  TrophyIcon,
  ZapIcon,
} from './icons/MonsterStatIcons'

interface MonsterStatsCardProps {
  stats: MonsterStats | null
}

/**
 * 怪物屬性卡片元件
 * 顯示怪物的完整屬性資料
 */
export function MonsterStatsCard({ stats }: MonsterStatsCardProps) {
  const { t } = useLanguage()

  // 處理無屬性資料的情況
  if (!stats || stats.name === null) {
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <span className="text-2xl">📊</span>
          {t('monster.stats')}
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
          <span className="text-6xl mb-4">🚫</span>
          <p className="text-lg font-medium">{t('monster.noStats')}</p>
        </div>
      </div>
    )
  }

  // 屬性配置：每個屬性的 SVG 圖示、鍵值、顏色
  const statConfig = [
    { key: 'level', Icon: StarIcon, color: 'text-yellow-600 dark:text-yellow-400' },
    { key: 'maxHP', Icon: HeartIcon, color: 'text-red-600 dark:text-red-400' },
    { key: 'maxMP', Icon: SparklesIcon, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'speed', Icon: BoltIcon, color: 'text-green-600 dark:text-green-400' },
    {
      key: 'physicalDamage',
      Icon: SwordIcon,
      color: 'text-orange-600 dark:text-orange-400',
    },
    {
      key: 'physicalDefense',
      Icon: ShieldIcon,
      color: 'text-gray-600 dark:text-gray-400',
    },
    {
      key: 'magicDamage',
      Icon: FireIcon,
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      key: 'magicDefense',
      Icon: StarShineIcon,
      color: 'text-indigo-600 dark:text-indigo-400',
    },
    { key: 'accuracy', Icon: TargetIcon, color: 'text-pink-600 dark:text-pink-400' },
    { key: 'evasion', Icon: WindIcon, color: 'text-cyan-600 dark:text-cyan-400' },
    { key: 'exp', Icon: TrophyIcon, color: 'text-amber-600 dark:text-amber-400' },
    {
      key: 'minimumPushDamage',
      Icon: ZapIcon,
      color: 'text-rose-600 dark:text-rose-400',
    },
  ]

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 rounded-xl p-6 shadow-lg border border-blue-200 dark:border-blue-800">
      <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
        <span className="text-2xl">📊</span>
        {t('monster.stats')}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {statConfig.map(({ key, Icon, color }) => {
          const value = stats[key as keyof MonsterStats]
          return (
            <div
              key={key}
              className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <div className="flex-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t(`monster.${key}`)}
                  </div>
                  <div className={`text-lg font-bold ${color}`}>
                    {value !== null ? value : '-'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
