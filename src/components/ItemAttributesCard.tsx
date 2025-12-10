'use client'

import type { ItemsOrganizedData } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { Lock, Check } from 'lucide-react'

interface ItemAttributesCardProps {
  itemData: ItemsOrganizedData | null
}

/**
 * 物品屬性卡片元件
 * 顯示物品的完整屬性資料（使用 ItemsOrganizedData 格式）
 */
export function ItemAttributesCard({ itemData }: ItemAttributesCardProps) {
  const { t } = useLanguage()

  // 無資料時顯示空狀態
  if (!itemData) {
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

  const { metaInfo, typeInfo, randomStats } = itemData

  // 判斷是否為卷軸類型
  const isScroll = typeInfo.category.includes('Scroll')

  // 判斷是否為裝備類型
  const isEquipment = typeInfo.overallCategory === 'Equip'

  // 處理 Scroll (卷軸) 類型物品
  if (isScroll) {
    // 從卷軸名稱解析成功率（例如 "10%" 或 "100%"）
    const scrollName = itemData.description.name || ''
    const successRateMatch = scrollName.match(/(\d+)%/)
    const successRate = successRateMatch ? parseInt(successRateMatch[1], 10) : 100
    const destroyRate = successRate < 100 ? 0 : 0 // 預設不破壞

    // 過濾出非 null 且非 0 的屬性加成
    const scrollStats = [
      { key: 'str', label: t('item.str'), value: metaInfo.incSTR },
      { key: 'dex', label: t('item.dex'), value: metaInfo.incDEX },
      { key: 'int', label: t('item.int'), value: metaInfo.incINT },
      { key: 'luk', label: t('item.luk'), value: metaInfo.incLUK },
      { key: 'watk', label: t('item.watk'), value: metaInfo.incPAD },
      { key: 'matk', label: t('item.matk'), value: metaInfo.incMAD },
      { key: 'wdef', label: t('item.wdef'), value: metaInfo.incPDD },
      { key: 'mdef', label: t('item.mdef'), value: metaInfo.incMDD },
      { key: 'hp', label: t('item.hp'), value: metaInfo.incMHP },
      { key: 'mp', label: t('item.mp'), value: metaInfo.incMMP },
      { key: 'accuracy', label: t('item.accuracy'), value: metaInfo.incACC },
      { key: 'avoidability', label: t('item.avoidability'), value: metaInfo.incEVA },
      { key: 'speed', label: t('item.speed'), value: metaInfo.incSpeed },
      { key: 'jump', label: t('item.jump'), value: metaInfo.incJump },
    ].filter(stat => stat.value !== undefined && stat.value !== null && stat.value !== 0)

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
            {t(`item.category.${typeInfo.subCategory || typeInfo.category}`)}
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
                {successRate}%
              </div>
            </div>

            {/* 破壞率 - 只在 > 0 時顯示 */}
            {destroyRate > 0 && (
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {t('item.destroyRate')}
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {destroyRate}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 屬性加成 */}
        {scrollStats.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('item.statBonus')}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {scrollStats.map(({ key, label, value }) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {label}:
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {scrollStats.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {t('item.noStatBonus')}
            </p>
          </div>
        )}
      </div>
    )
  }

  // 處理非裝備類型物品（消耗品、其他類型）
  if (!isEquipment) {
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
                {t(`item.type.${typeInfo.overallCategory}`)}
              </span>
            </div>

            {/* 賣價 */}
            {metaInfo.price !== undefined && metaInfo.price > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">{t('item.salePrice')}:</span>
                <div className="mt-1">
                  <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {metaInfo.price.toLocaleString()}
                  </span>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('item.mesos')}
                  </span>
                </div>
              </div>
            )}

            {/* 堆疊數量 */}
            {metaInfo.slotMax && metaInfo.slotMax > 1 && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('item.maxStack')}:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {metaInfo.slotMax.toLocaleString()}
                </span>
              </div>
            )}

            {/* 可交易性 */}
            <div>
              <span className="text-gray-500 dark:text-gray-400">{t('item.tradeable')}:</span>
              <span className="ml-2 font-medium">
                {metaInfo.only ? (
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
          </div>
        </div>
      </div>
    )
  }

  // 處理裝備類型物品
  // 職業限制（從 reqJob 位元遮罩計算）
  const availableClasses: string[] = []
  const reqJob = metaInfo.reqJob
  if (reqJob === 0 || reqJob === undefined) {
    availableClasses.push('beginner')
  } else {
    if ((reqJob & 1) > 0) availableClasses.push('warrior')
    if ((reqJob & 2) > 0) availableClasses.push('magician')
    if ((reqJob & 4) > 0) availableClasses.push('bowman')
    if ((reqJob & 8) > 0) availableClasses.push('thief')
    if ((reqJob & 16) > 0) availableClasses.push('pirate')
  }

  // 需求條件
  const requirementStats = [
    { key: 'reqLevel', label: t('item.reqLevel'), value: metaInfo.reqLevel, color: 'text-yellow-600 dark:text-yellow-400' },
    { key: 'reqSTR', label: t('item.reqStr'), value: metaInfo.reqSTR, color: 'text-red-600 dark:text-red-400' },
    { key: 'reqDEX', label: t('item.reqDex'), value: metaInfo.reqDEX, color: 'text-green-600 dark:text-green-400' },
    { key: 'reqINT', label: t('item.reqInt'), value: metaInfo.reqINT, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'reqLUK', label: t('item.reqLuk'), value: metaInfo.reqLUK, color: 'text-purple-600 dark:text-purple-400' },
  ].filter(stat => stat.value !== undefined && stat.value !== null && stat.value > 0)

  // 裝備屬性配置（直接使用 metaInfo 的 key）
  const equipmentStats = [
    { key: 'attackSpeed', label: t('item.attack_speed'), value: metaInfo.attackSpeed },
    { key: 'incPAD', label: t('item.watk'), value: metaInfo.incPAD },
    { key: 'incMAD', label: t('item.matk'), value: metaInfo.incMAD },
    { key: 'incPDD', label: t('item.wdef'), value: metaInfo.incPDD },
    { key: 'incMDD', label: t('item.mdef'), value: metaInfo.incMDD },
    { key: 'incSTR', label: t('item.str'), value: metaInfo.incSTR },
    { key: 'incDEX', label: t('item.dex'), value: metaInfo.incDEX },
    { key: 'incINT', label: t('item.int'), value: metaInfo.incINT },
    { key: 'incLUK', label: t('item.luk'), value: metaInfo.incLUK },
    { key: 'incMHP', label: t('item.hp'), value: metaInfo.incMHP },
    { key: 'incMMP', label: t('item.mp'), value: metaInfo.incMMP },
    { key: 'incACC', label: t('item.accuracy'), value: metaInfo.incACC },
    { key: 'incEVA', label: t('item.avoidability'), value: metaInfo.incEVA },
    { key: 'incSpeed', label: t('item.speed'), value: metaInfo.incSpeed },
    { key: 'incJump', label: t('item.jump'), value: metaInfo.incJump },
    { key: 'tuc', label: t('item.upgrades'), value: metaInfo.tuc },
  ].filter(stat => stat.value !== undefined && stat.value !== null && stat.value !== 0)

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
            {t(`item.type.${typeInfo.overallCategory}`)}
          </div>
        </div>
        {/* 分類卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400">{t('item.category')}</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {t(`item.category.${typeInfo.subCategory || typeInfo.category}`)}
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
              // 直接從 randomStats 取得浮動值（使用相同的 key）
              const variation = randomStats?.[key]
              const hasVariation = variation && variation.max !== null && variation.max !== 0

              // 使用 randomStats 的 min 和 max
              const minValue = hasVariation ? variation.min : null
              const maxValue = hasVariation ? variation.max : null

              return (
                <div
                  key={key}
                  className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col gap-1">
                    {/* 屬性顯示 */}
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

                        {/* 基礎值 */}
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
