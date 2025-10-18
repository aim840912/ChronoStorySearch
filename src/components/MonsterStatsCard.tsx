'use client'

import type { MobInfo } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  StarIcon,
  HeartIcon,
  ShieldIcon,
  StarShineIcon,
  TargetIcon,
  WindIcon,
  TrophyIcon,
  ZapIcon,
} from './icons/MonsterStatIcons'

interface MonsterStatsCardProps {
  mobInfo: MobInfo | null
}

/**
 * 怪物屬性卡片元件
 * 顯示怪物的完整屬性資料
 */
export function MonsterStatsCard({ mobInfo }: MonsterStatsCardProps) {
  const { t } = useLanguage()

  // 處理無屬性資料的情況
  if (!mobInfo || !mobInfo.mob || mobInfo.mob.mob_name === null) {
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <span className="text-2xl"></span>
          {t('monster.stats')}
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
          <span className="text-6xl mb-4">🚫</span>
          <p className="text-lg font-medium">{t('monster.noStats')}</p>
        </div>
      </div>
    )
  }

  const stats = mobInfo.mob

  // 屬性配置：每個屬性的 SVG 圖示、鍵值、顏色
  const statConfig = [
    { key: 'level', Icon: StarIcon, color: 'text-yellow-600 dark:text-yellow-400' },
    { key: 'max_hp', Icon: HeartIcon, color: 'text-red-600 dark:text-red-400' },
    {
      key: 'phys_def',
      Icon: ShieldIcon,
      color: 'text-gray-600 dark:text-gray-400',
    },
    {
      key: 'mag_def',
      Icon: StarShineIcon,
      color: 'text-indigo-600 dark:text-indigo-400',
    },
    { key: 'acc', Icon: TargetIcon, color: 'text-pink-600 dark:text-pink-400' },
    { key: 'avoid', Icon: WindIcon, color: 'text-cyan-600 dark:text-cyan-400' },
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
        <span className="text-2xl"></span>
        {t('monster.stats')}
      </h3>

      {/* 基本屬性 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {statConfig.map(({ key, Icon, color }) => {
          const value = stats[key as keyof typeof stats]
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

      {/* 屬性弱點 - 只顯示 weakness === 1 */}
      {(stats.fire_weakness === 1 ||
        stats.ice_weakness === 1 ||
        stats.lightning_weakness === 1 ||
        stats.holy_weakness === 1 ||
        stats.poison_weakness === 1) && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {t('monster.weaknesses')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stats.fire_weakness === 1 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🔥</span>
                  <div className="text-sm font-medium text-red-700 dark:text-red-300">
                    {t('monster.fire_weakness')}
                  </div>
                </div>
              </div>
            )}
            {stats.ice_weakness === 1 && (
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-2 border border-cyan-200 dark:border-cyan-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">❄️</span>
                  <div className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                    {t('monster.ice_weakness')}
                  </div>
                </div>
              </div>
            )}
            {stats.lightning_weakness === 1 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">⚡</span>
                  <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    {t('monster.lightning_weakness')}
                  </div>
                </div>
              </div>
            )}
            {stats.holy_weakness === 1 && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">✨</span>
                  <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    {t('monster.holy_weakness')}
                  </div>
                </div>
              </div>
            )}
            {stats.poison_weakness === 1 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">☠️</span>
                  <div className="text-sm font-medium text-green-700 dark:text-green-300">
                    {t('monster.poison_weakness')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 屬性抗性 - 只顯示 weakness === -1 */}
      {(stats.fire_weakness === -1 ||
        stats.ice_weakness === -1 ||
        stats.lightning_weakness === -1 ||
        stats.holy_weakness === -1 ||
        stats.poison_weakness === -1) && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {t('monster.resistances')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stats.fire_weakness === -1 && (
              <div className="bg-red-900/20 dark:bg-red-950/40 rounded-lg p-2 border border-red-900 dark:border-red-950">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🔥</span>
                  <div className="text-sm font-medium text-red-200 dark:text-red-300">
                    {t('monster.fire_resistance')}
                  </div>
                </div>
              </div>
            )}
            {stats.ice_weakness === -1 && (
              <div className="bg-cyan-900/20 dark:bg-cyan-950/40 rounded-lg p-2 border border-cyan-900 dark:border-cyan-950">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">❄️</span>
                  <div className="text-sm font-medium text-cyan-200 dark:text-cyan-300">
                    {t('monster.ice_resistance')}
                  </div>
                </div>
              </div>
            )}
            {stats.lightning_weakness === -1 && (
              <div className="bg-amber-900/20 dark:bg-amber-950/40 rounded-lg p-2 border border-amber-900 dark:border-amber-950">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">⚡</span>
                  <div className="text-sm font-medium text-amber-200 dark:text-amber-300">
                    {t('monster.lightning_resistance')}
                  </div>
                </div>
              </div>
            )}
            {stats.holy_weakness === -1 && (
              <div className="bg-purple-900/20 dark:bg-purple-950/40 rounded-lg p-2 border border-purple-900 dark:border-purple-950">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">✨</span>
                  <div className="text-sm font-medium text-purple-200 dark:text-purple-300">
                    {t('monster.holy_resistance')}
                  </div>
                </div>
              </div>
            )}
            {stats.poison_weakness === -1 && (
              <div className="bg-green-900/20 dark:bg-green-950/40 rounded-lg p-2 border border-green-900 dark:border-green-950">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">☠️</span>
                  <div className="text-sm font-medium text-green-200 dark:text-green-300">
                    {t('monster.poison_resistance')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 屬性免疫 - 只顯示 weakness === 0 */}
      {(stats.fire_weakness === 0 ||
        stats.ice_weakness === 0 ||
        stats.lightning_weakness === 0 ||
        stats.holy_weakness === 0 ||
        stats.poison_weakness === 0) && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {t('monster.immunities')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stats.fire_weakness === 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-300 dark:border-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🛡️</span>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('monster.fire_immune')}
                  </div>
                </div>
              </div>
            )}
            {stats.ice_weakness === 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-300 dark:border-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🛡️</span>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('monster.ice_immune')}
                  </div>
                </div>
              </div>
            )}
            {stats.lightning_weakness === 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-300 dark:border-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🛡️</span>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('monster.lightning_immune')}
                  </div>
                </div>
              </div>
            )}
            {stats.holy_weakness === 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-300 dark:border-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🛡️</span>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('monster.holy_immune')}
                  </div>
                </div>
              </div>
            )}
            {stats.poison_weakness === 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-300 dark:border-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🛡️</span>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('monster.poison_immune')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 經驗值比率 */}
      {mobInfo.expBar?.mobExpHpRatio !== null && (
        <div className="mt-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <TrophyIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t('monster.expHpRatio')}
                </div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {mobInfo.expBar.mobExpHpRatio?.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
