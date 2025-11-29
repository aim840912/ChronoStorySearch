'use client'

import type { ItemAttributes } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { Lock, Check } from 'lucide-react'

interface ItemAttributesCardProps {
  attributes: ItemAttributes | null
}

/**
 * 物品屬性卡片元件
 * 顯示物品的完整屬性資料
 */
export function ItemAttributesCard({ attributes }: ItemAttributesCardProps) {
  const { t } = useLanguage()

  // 處理 Scroll (卷軸) 類型物品
  if (attributes && attributes.sub_type === 'Scroll' && attributes.scroll) {
    const { scroll } = attributes

    // 過濾出非 null 的屬性
    const nonNullStats = Object.entries(scroll.stats)
      .filter(([, value]) => value !== null && value !== 0)
      .map(([key, value]) => ({ key, value: value as number }))

    return (
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 shadow-lg border border-purple-200 dark:border-purple-800">
        <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-4">
          {t('item.scrollInfo')}
        </h3>

        {/* 適用裝備類型 */}
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('item.applicableEquipment')}
          </h4>
          <div className="inline-block bg-purple-500 dark:bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-full">
            {t(`item.category.${scroll.category}`)}
          </div>
        </div>

        {/* 成功率和破壞率 */}
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            {/* 成功率 */}
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {t('item.successRate')}
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {scroll.success_rate}%
              </div>
            </div>

            {/* 破壞率 - 只在 > 0 時顯示 */}
            {scroll.destroy_rate > 0 && (
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {t('item.destroyRate')}
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {scroll.destroy_rate}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 屬性加成 */}
        {nonNullStats.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('item.statBonus')}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {nonNullStats.map(({ key, value }) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t(`item.${key}`)}:
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {nonNullStats.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {t('item.noStatBonus')}
            </p>
          </div>
        )}
      </div>
    )
  }

  // 處理 Potion (藥水) 類型物品
  if (attributes && attributes.sub_type === 'Potion' && attributes.potion) {
    const { potion } = attributes

    // 檢查 potion.stats 是否存在（防止崩潰）
    if (!potion.stats) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 shadow-lg border border-red-200 dark:border-red-800">
          <h3 className="text-xl font-bold text-red-900 dark:text-red-100 mb-4">
            {t('item.potionInfo')}
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {t('item.dataIncomplete') || '藥水資料不完整'}
            </p>
          </div>
        </div>
      )
    }

    // 過濾出非 null 且非 0 的屬性
    const nonNullStats = Object.entries(potion.stats)
      .filter(([, value]) => value !== null && value !== 0)
      .map(([key, value]) => ({ key, value: value as number }))

    return (
      <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-6 shadow-lg border border-cyan-200 dark:border-cyan-800">
        <h3 className="text-xl font-bold text-cyan-900 dark:text-cyan-100 mb-4">
          {t('item.potionInfo')}
        </h3>

        {/* 藥水效果 */}
        {nonNullStats.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('item.potionEffect')}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {nonNullStats.map(({ key, value }) => {
                // 特別處理 HP 和 MP，使用更顯眼的樣式
                const isHP = key === 'hp'
                const isMP = key === 'mp'
                const isMainEffect = isHP || isMP

                return (
                  <div
                    key={key}
                    className={`flex justify-between items-center ${
                      isMainEffect ? 'bg-green-50 dark:bg-green-900/20 p-2 rounded-lg' : ''
                    }`}
                  >
                    {isHP || isMP ? (
                      // HP/MP: 「恢復 50 HP」或「恢復 50% HP」格式
                      <>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {t('item.recovery')}
                        </span>
                        <span className={`font-bold ${
                          isHP
                            ? 'text-2xl text-red-600 dark:text-red-400'
                            : 'text-2xl text-blue-600 dark:text-blue-400'
                        }`}>
                          {value <= 1 ? `${value * 100}%` : value} {isHP ? 'HP' : 'MP'}
                        </span>
                      </>
                    ) : (
                      // 其他屬性: 「屬性名 +5」格式
                      <>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t(`item.${key}`)}
                        </span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          +{value}
                        </span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {nonNullStats.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {t('item.noStatBonus')}
            </p>
          </div>
        )}
      </div>
    )
  }

  // 處理無屬性資料的情況（非裝備類型：Etc、Consume 等）
  if (!attributes || !attributes.equipment) {
    // 如果完全沒有資料，顯示空狀態
    if (!attributes) {
      return (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">
            {t('item.attributes')}
          </h3>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">{t('item.noAttributes')}</p>
          </div>
        </div>
      )
    }

    // 顯示非裝備類型的基本資訊
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 shadow-lg border border-green-200 dark:border-green-800">
        <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-4">
          {t('item.info')}
        </h3>

        {/* 基本資訊 */}
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('item.basicInfo')}
          </h4>
          <div className="space-y-2 text-sm">
            {/* 物品類型 */}
            <div>
              <span className="text-gray-500 dark:text-gray-400">{t('item.type')}:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {t(`item.type.${attributes.type}`)}
              </span>
            </div>

            {/* 賣價 - 重點顯示 */}
            {attributes.sale_price !== null && attributes.sale_price > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">{t('item.salePrice')}:</span>
                <div className="mt-1">
                  <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {attributes.sale_price.toLocaleString()}
                  </span>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('item.mesos')}
                  </span>
                </div>
              </div>
            )}

            {/* 堆疊數量 */}
            {attributes.max_stack_count && attributes.max_stack_count > 1 && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('item.maxStack')}:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {attributes.max_stack_count.toLocaleString()}
                </span>
              </div>
            )}

            {/* 可交易性 */}
            {attributes.untradeable !== null && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('item.tradeable')}:</span>
                <span className="ml-2 font-medium">
                  {attributes.untradeable ? (
                    <span className="text-red-600 dark:text-red-400 inline-flex items-center gap-1">
                      <Lock className="w-4 h-4" />
                      {t('item.untradeable')}
                    </span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400 inline-flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      {t('item.tradeableYes')}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const { equipment } = attributes
  const { requirements, classes, stats, stat_variation } = equipment

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
    { key: 'attack_speed', label: t('item.attack_speed'), value: stats.attack_speed, color: 'text-emerald-600 dark:text-emerald-400' },
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
    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 shadow-lg border border-green-200 dark:border-green-800">
      <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-4">
        {t('item.attributes')}
      </h3>

      {/* 基本資訊 - 類型與分類 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* 類型卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400">{t('item.type')}</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {t(`item.type.${attributes.type}`)}
          </div>
        </div>
        {/* 分類卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400">{t('item.category')}</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {t(`item.category.${equipment.category}`)}
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
          <div className="flex flex-col gap-2">
            {equipmentStats.map(({ key, label, value }) => {
              // 檢查是否有浮動值
              const variation = stat_variation?.[key]
              const hasVariation = variation && variation.max !== null && variation.max !== 0

              // 直接使用 min 和 max（絕對值，非相對偏移）
              const minValue = hasVariation ? variation.min : null
              const maxValue = hasVariation ? variation.max : null

              return (
                <div
                  key={key}
                  className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col gap-1">
                    {/* 第一行：原有的屬性顯示 */}
                    <div className="flex justify-between items-center gap-4">
                      {/* 屬性名稱（左側） */}
                      <div className="text-sm text-gray-600 dark:text-gray-400 min-w-[80px]">
                        {label}
                      </div>

                      {/* 數值顯示區域（右側） */}
                      <div className="flex items-center gap-3">
                        {/* 最低值 */}
                        {hasVariation && minValue !== null && (
                          <span className="text-sm text-red-500 dark:text-red-400 min-w-[40px] text-right">
                            {minValue}
                          </span>
                        )}

                        {/* 預設值 */}
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100 min-w-[60px] text-center">
                          {value}
                        </div>

                        {/* 最高值 */}
                        {hasVariation && maxValue !== null && (
                          <span className="text-sm text-green-500 dark:text-green-400 min-w-[40px] text-left">
                            {maxValue}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
