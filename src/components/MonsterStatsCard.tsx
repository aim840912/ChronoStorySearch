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
  onAccuracyClick?: () => void
}

/**
 * 怪物屬性卡片元件
 * 顯示怪物的完整屬性資料
 */
export function MonsterStatsCard({ mobInfo, onAccuracyClick }: MonsterStatsCardProps) {
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
          const isAvoidField = key === 'avoid'
          const isClickable = isAvoidField && onAccuracyClick && value !== null

          return (
            <div
              key={key}
              className={`bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm transition-all ${
                isClickable
                  ? 'cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 active:scale-95'
                  : 'hover:shadow-md'
              }`}
              onClick={isClickable ? onAccuracyClick : undefined}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={isClickable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onAccuracyClick?.()
                }
              } : undefined}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <div className="flex-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    {t(`monster.${key}`)}
                    {isClickable && (
                      <svg className="w-3 h-3 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                    )}
                  </div>
                  <div className={`text-lg font-bold ${color}`}>
                    {value !== null ? value : '-'}
                  </div>
                </div>
                {isClickable && (
                  <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 屬性弱點 - 顯示 weakness === 3 (新 API 格式) */}
      {(stats.fire_weakness === 3 ||
        stats.ice_weakness === 3 ||
        stats.lightning_weakness === 3 ||
        stats.holy_weakness === 3 ||
        stats.poison_weakness === 3) && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {t('monster.weaknesses')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stats.fire_weakness === 3 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🔥</span>
                  <div className="text-sm font-medium text-red-700 dark:text-red-300">
                    {t('monster.fire_weakness')}
                  </div>
                </div>
              </div>
            )}
            {stats.ice_weakness === 3 && (
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-2 border border-cyan-200 dark:border-cyan-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">❄️</span>
                  <div className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                    {t('monster.ice_weakness')}
                  </div>
                </div>
              </div>
            )}
            {stats.lightning_weakness === 3 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">⚡</span>
                  <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    {t('monster.lightning_weakness')}
                  </div>
                </div>
              </div>
            )}
            {stats.holy_weakness === 3 && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">✨</span>
                  <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    {t('monster.holy_weakness')}
                  </div>
                </div>
              </div>
            )}
            {stats.poison_weakness === 3 && (
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

      {/* 屬性抗性 - 顯示 weakness === 2 (新 API 格式) */}
      {(stats.fire_weakness === 2 ||
        stats.ice_weakness === 2 ||
        stats.lightning_weakness === 2 ||
        stats.holy_weakness === 2 ||
        stats.poison_weakness === 2) && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {t('monster.resistances')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stats.fire_weakness === 2 && (
              <div className="bg-red-900/20 dark:bg-red-950/40 rounded-lg p-2 border border-red-900 dark:border-red-950">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🔥</span>
                  <div className="text-sm font-medium text-red-200 dark:text-red-300">
                    {t('monster.fire_resistance')}
                  </div>
                </div>
              </div>
            )}
            {stats.ice_weakness === 2 && (
              <div className="bg-cyan-900/20 dark:bg-cyan-950/40 rounded-lg p-2 border border-cyan-900 dark:border-cyan-950">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">❄️</span>
                  <div className="text-sm font-medium text-cyan-200 dark:text-cyan-300">
                    {t('monster.ice_resistance')}
                  </div>
                </div>
              </div>
            )}
            {stats.lightning_weakness === 2 && (
              <div className="bg-amber-900/20 dark:bg-amber-950/40 rounded-lg p-2 border border-amber-900 dark:border-amber-950">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">⚡</span>
                  <div className="text-sm font-medium text-amber-200 dark:text-amber-300">
                    {t('monster.lightning_resistance')}
                  </div>
                </div>
              </div>
            )}
            {stats.holy_weakness === 2 && (
              <div className="bg-purple-900/20 dark:bg-purple-950/40 rounded-lg p-2 border border-purple-900 dark:border-purple-950">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">✨</span>
                  <div className="text-sm font-medium text-purple-200 dark:text-purple-300">
                    {t('monster.holy_resistance')}
                  </div>
                </div>
              </div>
            )}
            {stats.poison_weakness === 2 && (
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

      {/* 屬性免疫 - 顯示 weakness === 1 (新 API 格式) */}
      {(stats.fire_weakness === 1 ||
        stats.ice_weakness === 1 ||
        stats.lightning_weakness === 1 ||
        stats.holy_weakness === 1 ||
        stats.poison_weakness === 1) && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {t('monster.immunities')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stats.fire_weakness === 1 && (
              <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-2 border border-gray-600 dark:border-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🔥</span>
                  <div className="text-sm font-medium text-gray-100 dark:text-gray-200">
                    {t('monster.fire_immunity')}
                  </div>
                </div>
              </div>
            )}
            {stats.ice_weakness === 1 && (
              <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-2 border border-gray-600 dark:border-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">❄️</span>
                  <div className="text-sm font-medium text-gray-100 dark:text-gray-200">
                    {t('monster.ice_immunity')}
                  </div>
                </div>
              </div>
            )}
            {stats.lightning_weakness === 1 && (
              <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-2 border border-gray-600 dark:border-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">⚡</span>
                  <div className="text-sm font-medium text-gray-100 dark:text-gray-200">
                    {t('monster.lightning_immunity')}
                  </div>
                </div>
              </div>
            )}
            {stats.holy_weakness === 1 && (
              <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-2 border border-gray-600 dark:border-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">✨</span>
                  <div className="text-sm font-medium text-gray-100 dark:text-gray-200">
                    {t('monster.holy_immunity')}
                  </div>
                </div>
              </div>
            )}
            {stats.poison_weakness === 1 && (
              <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-2 border border-gray-600 dark:border-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">☠️</span>
                  <div className="text-sm font-medium text-gray-100 dark:text-gray-200">
                    {t('monster.poison_immunity')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 註：weakness === null 代表「普通」，不需要顯示任何內容 */}

    </div>
  )
}
