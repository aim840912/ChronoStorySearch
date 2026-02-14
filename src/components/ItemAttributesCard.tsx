'use client'

import { useState, useEffect } from 'react'
import type { ItemsOrganizedData } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { TipBubble } from './TipBubble'

// 預設屬性順序（分類 + 16 個裝備屬性）
const DEFAULT_STAT_ORDER = [
  'category',
  'attackSpeed', 'incPAD', 'incMAD', 'incPDD', 'incMDD',
  'incSTR', 'incDEX', 'incINT', 'incLUK',
  'incMHP', 'incMMP', 'incACC', 'incEVA', 'incSpeed', 'incJump', 'tuc'
]

// 預設顯示所有屬性
const DEFAULT_VISIBLE_STATS = [...DEFAULT_STAT_ORDER]

interface ItemAttributesCardProps {
  itemData: ItemsOrganizedData | null
  /** 是否只顯示最大值（用於收藏物品展開區域） */
  showMaxOnly?: boolean
  /** 是否啟用設定面板（用於 ItemModal） */
  enableSettings?: boolean
  /** 緊湊模式（用於 DropItemDetailModal 快速預覽） */
  compact?: boolean
}

/**
 * 物品屬性卡片元件
 * 顯示物品的完整屬性資料（使用 ItemsOrganizedData 格式）
 */
export function ItemAttributesCard({ itemData, showMaxOnly = false, enableSettings = false, compact = false }: ItemAttributesCardProps) {
  const { t } = useLanguage()

  // 設定相關 state（僅在 enableSettings 時使用）
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>('item-stats-view-mode', 'grid')
  const [statOrder, setStatOrder] = useLocalStorage<string[]>('item-stats-order', DEFAULT_STAT_ORDER)
  const [visibleStats, setVisibleStats] = useLocalStorage<string[]>('item-stats-visible', DEFAULT_VISIBLE_STATS)
  const [showMaxOnlySetting, setShowMaxOnlySetting] = useLocalStorage<boolean>('item-stats-show-max-only', false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // 一次性 localStorage 遷移（使用標記確保只執行一次）
  useEffect(() => {
    const migrationKey = 'item-stats-category-migrated'
    const alreadyMigrated = localStorage.getItem(migrationKey) === 'true'

    if (alreadyMigrated) return  // 已遷移過，不再執行

    // 遷移 statOrder
    if (!statOrder.includes('category')) {
      setStatOrder(['category', ...statOrder])
    }

    // 遷移 visibleStats
    if (!visibleStats.includes('category')) {
      setVisibleStats(['category', ...visibleStats])
    }

    // 標記遷移完成（即使不需要遷移也標記，表示已檢查過）
    localStorage.setItem(migrationKey, 'true')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 決定實際使用的 showMaxOnly 值
  const effectiveShowMaxOnly = enableSettings ? showMaxOnlySetting : showMaxOnly

  // 拖放處理函數
  const handleDragStart = (e: React.DragEvent, dataKey: string) => {
    setDraggedItem(dataKey)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetKey) {
      setDraggedItem(null)
      return
    }
    const newOrder = [...statOrder]
    const dragIndex = newOrder.indexOf(draggedItem)
    const dropIndex = newOrder.indexOf(targetKey)
    if (dragIndex !== -1 && dropIndex !== -1) {
      newOrder.splice(dragIndex, 1)
      newOrder.splice(dropIndex, 0, draggedItem)
      setStatOrder(newOrder)
    }
    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const resetOrder = () => {
    setStatOrder(DEFAULT_STAT_ORDER)
  }

  // 切換屬性可見性
  const toggleStatVisibility = (dataKey: string) => {
    setVisibleStats(prev => {
      if (prev.includes(dataKey) && prev.length === 1) {
        return prev
      }
      if (prev.includes(dataKey)) {
        return prev.filter(key => key !== dataKey)
      }
      return [...prev, dataKey]
    })
  }

  const resetVisibility = () => {
    setVisibleStats(DEFAULT_VISIBLE_STATS)
  }

  // 檢查是否有自訂設定
  const isCustomOrder = JSON.stringify(statOrder) !== JSON.stringify(DEFAULT_STAT_ORDER)
  const isCustomVisibility = JSON.stringify([...visibleStats].sort()) !== JSON.stringify([...DEFAULT_VISIBLE_STATS].sort())

  // 無資料時顯示空狀態
  if (!itemData) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-xl shadow-lg ${compact ? 'p-3' : 'p-6'}`}>
        <h3 className={`font-bold text-gray-700 dark:text-gray-300 ${compact ? 'text-sm mb-2' : 'text-xl mb-4'}`}>
          {t('item.attributes')}
        </h3>
        <div className={`flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 ${compact ? 'py-4' : 'py-8'}`}>
          <p className={`font-medium ${compact ? 'text-sm' : 'text-lg'}`}>{t('item.noAttributes')}</p>
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
    const scrollName = itemData.description.name || ''
    const successRateMatch = scrollName.match(/(\d+)%/)
    const successRate = successRateMatch ? parseInt(successRateMatch[1], 10) : 100
    const destroyRate = successRate < 100 ? 0 : 0

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
      <div className={`bg-purple-50 dark:bg-purple-900/20 rounded-xl shadow-lg border border-purple-200 dark:border-purple-800 ${compact ? 'p-3' : 'p-6'}`}>
        <h3 className={`font-bold text-purple-900 dark:text-purple-100 ${compact ? 'text-sm mb-2' : 'text-xl mb-4'}`}>
          {t('item.scrollInfo')}
        </h3>

        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${compact ? 'mb-2 p-2.5' : 'mb-4 p-4'}`}>
          <h4 className={`font-semibold text-gray-700 dark:text-gray-300 ${compact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
            {t('item.applicableEquipment')}
          </h4>
          <div className={`inline-block bg-purple-500 dark:bg-purple-600 text-white font-medium rounded-full ${compact ? 'text-xs px-2.5 py-1' : 'text-sm px-4 py-2'}`}>
            {t(`item.category.${typeInfo.subCategory || typeInfo.category}`)}
          </div>
        </div>

        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${compact ? 'mb-2 p-2.5' : 'mb-4 p-4'}`}>
          <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-4'}`}>
            <div>
              <div className={`text-gray-500 dark:text-gray-400 mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
                {t('item.successRate')}
              </div>
              <div className={`font-bold text-green-600 dark:text-green-400 ${compact ? 'text-lg' : 'text-2xl'}`}>
                {successRate}%
              </div>
            </div>
            {destroyRate > 0 && (
              <div>
                <div className={`text-gray-500 dark:text-gray-400 mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
                  {t('item.destroyRate')}
                </div>
                <div className={`font-bold text-red-600 dark:text-red-400 ${compact ? 'text-lg' : 'text-2xl'}`}>
                  {destroyRate}%
                </div>
              </div>
            )}
          </div>
        </div>

        {scrollStats.length > 0 && (
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${compact ? 'p-2.5' : 'p-4'}`}>
            <h4 className={`font-semibold text-gray-700 dark:text-gray-300 ${compact ? 'text-xs mb-1.5' : 'text-sm mb-3'}`}>
              {t('item.statBonus')}
            </h4>
            <div className={`grid grid-cols-2 ${compact ? 'gap-1.5' : 'gap-3'}`}>
              {scrollStats.map(({ key, label, value }) => (
                <div key={key} className="flex justify-between items-center">
                  <span className={`text-gray-600 dark:text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
                    {label}:
                  </span>
                  <span className={`font-bold text-blue-600 dark:text-blue-400 ${compact ? 'text-sm' : 'text-lg'}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {scrollStats.length === 0 && (
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${compact ? 'p-2.5' : 'p-4'}`}>
            <p className={`text-gray-500 dark:text-gray-400 text-center ${compact ? 'text-xs' : 'text-sm'}`}>
              {t('item.noStatBonus')}
            </p>
          </div>
        )}
      </div>
    )
  }

  // 處理非裝備類型物品（消耗品、其他類型）
  if (!isEquipment) {
    const effects = metaInfo.effects || []

    return (
      <div className={`bg-green-50 dark:bg-green-900/20 rounded-xl shadow-lg border border-green-200 dark:border-green-800 ${compact ? 'p-3' : 'p-6'}`}>
        <h3 className={`font-bold text-green-900 dark:text-green-100 ${compact ? 'text-sm mb-2' : 'text-xl mb-4'}`}>
          {t('item.info')}
        </h3>

        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${compact ? 'mb-2 p-2.5' : 'mb-4 p-4'}`}>
          <h4 className={`font-semibold text-gray-700 dark:text-gray-300 ${compact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
            {t('item.basicInfo')}
          </h4>
          <div className="space-y-2 text-sm">
            {effects.length > 0 && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('item.effect')}:</span>
                <div className="ml-2 flex flex-wrap gap-2">
                  {effects.map((effect, index) => (
                    <span
                      key={index}
                      className={`font-bold ${
                        effect.includes('HP')
                          ? 'text-red-600 dark:text-red-400'
                          : effect.includes('MP')
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {effect}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {metaInfo.slotMax !== undefined && metaInfo.slotMax > 1 && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('item.maxStack')}:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {metaInfo.slotMax.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 處理裝備類型物品
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

  const requirementStats = [
    { key: 'reqLevel', label: t('item.reqLevel'), value: metaInfo.reqLevel, color: 'text-yellow-600 dark:text-yellow-400' },
    { key: 'reqSTR', label: t('item.reqStr'), value: metaInfo.reqSTR, color: 'text-red-600 dark:text-red-400' },
    { key: 'reqDEX', label: t('item.reqDex'), value: metaInfo.reqDEX, color: 'text-green-600 dark:text-green-400' },
    { key: 'reqINT', label: t('item.reqInt'), value: metaInfo.reqINT, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'reqLUK', label: t('item.reqLuk'), value: metaInfo.reqLUK, color: 'text-purple-600 dark:text-purple-400' },
  ].filter(stat => stat.value !== undefined && stat.value !== null && stat.value > 0)

  // 裝備屬性配置（包含分類）
  const equipmentStatConfig = [
    { key: 'category', label: t('item.category'), value: typeInfo.subCategory || typeInfo.category },
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
  ]

  // 過濾出有值的屬性（category 始終顯示）
  const filteredStats = equipmentStatConfig.filter(
    stat => stat.key === 'category' || (stat.value !== undefined && stat.value !== null && stat.value !== 0)
  )

  // 根據用戶設定排序和過濾（僅在 enableSettings 時）
  // 如果 statOrder 是空陣列，使用預設順序（修復 localStorage 空陣列導致屬性不顯示的 bug）
  const effectiveStatOrder = statOrder.length > 0 ? statOrder : DEFAULT_STAT_ORDER
  const sortedStats = enableSettings
    ? effectiveStatOrder
        .map(key => filteredStats.find(s => s.key === key))
        .filter((s): s is typeof filteredStats[number] => s !== undefined)
        .filter(s => visibleStats.includes(s.key))
    : filteredStats

  // 渲染單個屬性項目
  const renderStatItem = (stat: typeof filteredStats[number], isDraggable: boolean, isGridView: boolean = false) => {
    const { key, label, value } = stat
    const variation = randomStats?.[key]
    const hasVariation = variation && variation.max !== null && variation.max !== 0
    const minValue = hasVariation ? variation.min : null
    const maxValue = hasVariation ? variation.max : null
    const isDragging = draggedItem === key

    return (
      <div
        key={key}
        draggable={isDraggable}
        onDragStart={isDraggable ? (e) => handleDragStart(e, key) : undefined}
        onDragOver={isDraggable ? handleDragOver : undefined}
        onDrop={isDraggable ? (e) => handleDrop(e, key) : undefined}
        onDragEnd={isDraggable ? handleDragEnd : undefined}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm transition-shadow transition-opacity transition-transform duration-200 ${
          compact ? 'px-2.5 py-1.5' : 'px-4 py-2'
        } ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'hover:shadow-md'
        } ${isDragging ? 'opacity-50 scale-95' : ''}`}
      >
        <div className={isGridView ? "flex flex-col gap-1" : "flex justify-between items-center gap-4"}>
          <div className={`text-gray-600 dark:text-gray-400 whitespace-nowrap ${compact ? 'text-xs' : 'text-sm'}`}>
            {label}
          </div>

          {effectiveShowMaxOnly ? (
            <div className="flex items-center gap-2">
              <div className={`font-bold ${compact ? 'text-sm' : 'text-lg'} ${hasVariation ? 'text-green-500 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {hasVariation ? maxValue : value}
              </div>
              {hasVariation && (
                <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                  {t('item.maxValue')}
                </span>
              )}
            </div>
          ) : (
            hasVariation ? (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-red-500 dark:text-red-400">{minValue}</span>
                <span className="text-gray-400">|</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{value}</span>
                <span className="text-gray-400">|</span>
                <span className="text-green-500 dark:text-green-400">{maxValue}</span>
              </div>
            ) : (
              <span className={`font-bold text-gray-900 dark:text-gray-100 ${compact ? 'text-sm' : 'text-lg'}`}>{value}</span>
            )
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-green-50 dark:bg-green-900/20 rounded-xl shadow-lg border border-green-200 dark:border-green-800 ${compact ? 'p-3' : 'p-6'}`}>
      <h3 className={`font-bold text-green-900 dark:text-green-100 ${compact ? 'text-sm mb-2' : 'text-xl mb-4'}`}>
        {t('item.attributes')}
      </h3>

      {/* 需求條件 */}
      {requirementStats.length > 0 && (
        <div className={compact ? 'mb-2' : 'mb-4'}>
          <h4 className={`font-semibold text-gray-700 dark:text-gray-300 ${compact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
            {t('item.requirements')}
          </h4>
          <div className={`grid grid-cols-2 sm:grid-cols-3 ${compact ? 'gap-1.5' : 'gap-2'}`}>
            {requirementStats.map(({ key, label, value, color }) => (
              <div
                key={key}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${compact ? 'p-1.5' : 'p-2'}`}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                <div className={`font-bold ${color} ${compact ? 'text-sm' : 'text-lg'}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 職業限制 */}
      {availableClasses.length > 0 && (
        <div className={compact ? 'mb-2' : 'mb-4'}>
          <h4 className={`font-semibold text-gray-700 dark:text-gray-300 ${compact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
            {t('item.jobRestrictions')}
          </h4>
          <div className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
            {availableClasses.map((className) => (
              <span
                key={className}
                className={`bg-green-500 dark:bg-green-600 text-white font-medium rounded-full ${compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'}`}
              >
                {t(`item.${className}`)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 裝備屬性 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('item.stats')}
          </h4>
          {/* 設定按鈕 - 只在 enableSettings 時顯示 */}
          {enableSettings && (
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded transition-colors ${
                  showSettings
                    ? 'bg-green-500 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={t('item.showAttributes')}
                aria-label={t('item.showAttributes')}
                aria-expanded={showSettings}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <TipBubble
                tipId="item-stats-settings"
                message={t('tip.itemStatsSettings')}
                position="right"
              />
            </div>
          )}
        </div>

        {/* 設定面板 */}
        {enableSettings && showSettings && (
          <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
            {/* 視圖模式 */}
            <div className="p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('item.viewMode')}
              </span>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-green-500 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title="Grid"
                  aria-label="Grid view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-green-500 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title="List"
                  aria-label="List view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 只顯示最大值 */}
            <div className="p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('item.showMaxOnlyOption')}
              </span>
              <button
                onClick={() => setShowMaxOnlySetting(!showMaxOnlySetting)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showMaxOnlySetting ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={showMaxOnlySetting}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showMaxOnlySetting ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 顯示的屬性 */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('item.showAttributes')}
                </span>
                {isCustomVisibility && (
                  <button
                    onClick={resetVisibility}
                    className="text-xs text-green-600 dark:text-green-400 hover:underline"
                  >
                    {t('item.resetVisible')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {equipmentStatConfig.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={visibleStats.includes(key)}
                      onChange={() => toggleStatVisibility(key)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      disabled={visibleStats.includes(key) && visibleStats.length === 1}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 排序 */}
            <div className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('item.dragToReorder')}
                </span>
                {isCustomOrder && (
                  <button
                    onClick={resetOrder}
                    className="text-xs text-green-600 dark:text-green-400 hover:underline"
                  >
                    {t('item.resetOrder')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 屬性列表 */}
        {enableSettings && viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {sortedStats.map(stat => {
              // 分類項目特殊處理
              if (stat.key === 'category') {
                return (
                  <div
                    key="category"
                    draggable={enableSettings}
                    onDragStart={enableSettings ? (e) => handleDragStart(e, 'category') : undefined}
                    onDragOver={enableSettings ? handleDragOver : undefined}
                    onDrop={enableSettings ? (e) => handleDrop(e, 'category') : undefined}
                    onDragEnd={enableSettings ? handleDragEnd : undefined}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm transition-shadow transition-opacity transition-transform duration-200 ${
                      compact ? 'px-2.5 py-1.5' : 'px-4 py-2'
                    } ${enableSettings ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : ''
                    } ${draggedItem === 'category' ? 'opacity-50 scale-95' : ''}`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className={`text-gray-600 dark:text-gray-400 whitespace-nowrap ${compact ? 'text-xs' : 'text-sm'}`}>
                        {t('item.category')}
                      </div>
                      <div className={`font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap ${compact ? 'text-sm' : 'text-lg'}`}>
                        {t(`item.category.${typeInfo.subCategory || typeInfo.category}`)}
                      </div>
                    </div>
                  </div>
                )
              }
              return renderStatItem(stat, enableSettings, true)
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedStats.map(stat => {
              // 分類項目特殊處理
              if (stat.key === 'category') {
                return (
                  <div
                    key="category"
                    draggable={enableSettings}
                    onDragStart={enableSettings ? (e) => handleDragStart(e, 'category') : undefined}
                    onDragOver={enableSettings ? handleDragOver : undefined}
                    onDrop={enableSettings ? (e) => handleDrop(e, 'category') : undefined}
                    onDragEnd={enableSettings ? handleDragEnd : undefined}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm transition-shadow transition-opacity transition-transform duration-200 ${
                      compact ? 'px-2.5 py-1.5' : 'px-4 py-2'
                    } ${enableSettings ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : ''
                    } ${draggedItem === 'category' ? 'opacity-50 scale-95' : ''}`}
                  >
                    <div className="flex justify-between items-center gap-4">
                      <div className={`text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0 ${compact ? 'text-xs' : 'text-sm'}`}>
                        {t('item.category')}
                      </div>
                      <div className={`font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap ${compact ? 'text-sm' : 'text-lg'}`}>
                        {t(`item.category.${typeInfo.subCategory || typeInfo.category}`)}
                      </div>
                    </div>
                  </div>
                )
              }
              return renderStatItem(stat, enableSettings)
            })}
          </div>
        )}
      </div>
    </div>
  )
}
