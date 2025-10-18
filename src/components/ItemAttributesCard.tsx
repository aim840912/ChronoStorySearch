'use client'

import type { ItemAttributes } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

interface ItemAttributesCardProps {
  attributes: ItemAttributes | null
}

/**
 * 物品屬性卡片元件
 * 顯示物品的完整屬性資料
 */
export function ItemAttributesCard({ attributes }: ItemAttributesCardProps) {
  const { t } = useLanguage()

  // 處理無屬性資料的情況
  if (!attributes || !attributes.equipment) {
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">
          {t('item.attributes')}
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">{t('item.noAttributes')}</p>
        </div>
      </div>
    )
  }

  const { equipment } = attributes
  const { requirements, classes, stats } = equipment

  // 職業列表（過濾出可用職業）
  const availableClasses = Object.entries(classes)
    .filter(([, allowed]) => allowed === true)
    .map(([className]) => className)

  // 屬性配置
  const requirementStats = [
    { key: 'req_level', label: t('item.reqLevel'), value: requirements.req_level, color: 'text-yellow-600 dark:text-yellow-400' },
    { key: 'req_str', label: t('item.reqStr'), value: requirements.req_str, color: 'text-red-600 dark:text-red-400' },
    { key: 'req_dex', label: t('item.reqDex'), value: requirements.req_dex, color: 'text-green-600 dark:text-green-400' },
    { key: 'req_int', label: t('item.reqInt'), value: requirements.req_int, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'req_luk', label: t('item.reqLuk'), value: requirements.req_luk, color: 'text-purple-600 dark:text-purple-400' },
  ].filter(stat => stat.value !== null && stat.value > 0)

  // 裝備屬性配置（過濾掉 null 和 0 的屬性）
  const equipmentStats = [
    { key: 'watk', label: t('item.watk'), value: stats.watk, color: 'text-orange-600 dark:text-orange-400' },
    { key: 'matk', label: t('item.matk'), value: stats.matk, color: 'text-purple-600 dark:text-purple-400' },
    { key: 'wdef', label: t('item.wdef'), value: stats.wdef, color: 'text-gray-600 dark:text-gray-400' },
    { key: 'mdef', label: t('item.mdef'), value: stats.mdef, color: 'text-indigo-600 dark:text-indigo-400' },
    { key: 'str', label: t('item.str'), value: stats.str, color: 'text-red-600 dark:text-red-400' },
    { key: 'dex', label: t('item.dex'), value: stats.dex, color: 'text-green-600 dark:text-green-400' },
    { key: 'int', label: t('item.int'), value: stats.int, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'luk', label: t('item.luk'), value: stats.luk, color: 'text-purple-600 dark:text-purple-400' },
    { key: 'hp', label: t('item.hp'), value: stats.hp, color: 'text-rose-600 dark:text-rose-400' },
    { key: 'mp', label: t('item.mp'), value: stats.mp, color: 'text-cyan-600 dark:text-cyan-400' },
    { key: 'accuracy', label: t('item.accuracy'), value: stats.accuracy, color: 'text-pink-600 dark:text-pink-400' },
    { key: 'avoidability', label: t('item.avoidability'), value: stats.avoidability, color: 'text-teal-600 dark:text-teal-400' },
    { key: 'speed', label: t('item.speed'), value: stats.speed, color: 'text-lime-600 dark:text-lime-400' },
    { key: 'jump', label: t('item.jump'), value: stats.jump, color: 'text-amber-600 dark:text-amber-400' },
    { key: 'upgrades', label: t('item.upgrades'), value: stats.upgrades, color: 'text-yellow-600 dark:text-yellow-400' },
  ].filter(stat => stat.value !== null && stat.value !== 0)

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30 rounded-xl p-6 shadow-lg border border-green-200 dark:border-green-800">
      <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-4">
        {t('item.attributes')}
      </h3>

      {/* 基本資訊 */}
      <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {t('item.basicInfo')}
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('item.type')}:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {t(`item.type.${attributes.type}`)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('item.category')}:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {t(`item.category.${equipment.category}`)}
            </span>
          </div>
        </div>
      </div>

      {/* 需求條件 */}
      {requirementStats.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('item.requirements')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {requirementStats.map(({ key, label, value, color }) => (
              <div
                key={key}
                className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm"
              >
                <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                <div className={`text-lg font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 職業限制 */}
      {availableClasses.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('item.jobRestrictions')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {availableClasses.map((className) => (
              <span
                key={className}
                className="bg-green-500 dark:bg-green-600 text-white text-xs font-medium px-3 py-1 rounded-full"
              >
                {t(`item.${className}`)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 裝備屬性 */}
      {equipmentStats.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('item.stats')}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {equipmentStats.map(({ key, label, value, color }) => (
              <div
                key={key}
                className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                  <div className={`text-base font-bold ${color}`}>
                    {key === 'upgrades' ? value : `+${value}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
