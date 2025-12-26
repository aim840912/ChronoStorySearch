'use client'

import { useState } from 'react'
import type { MobInfo } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { NoDataIcon } from './icons/MonsterStatIcons'
import { TipBubble } from '@/components/TipBubble'

// 預設屬性順序
const DEFAULT_STAT_ORDER = ['level', 'maxHP', 'physicalDefense', 'magicDefense', 'accuracy', 'evasion', 'exp', 'minimumPushDamage']

// 預設顯示所有屬性
const DEFAULT_VISIBLE_STATS = ['level', 'maxHP', 'physicalDefense', 'magicDefense', 'accuracy', 'evasion', 'exp', 'minimumPushDamage']

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
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>('monster-stats-view-mode', 'grid')
  const [statOrder, setStatOrder] = useLocalStorage<string[]>('monster-stats-order', DEFAULT_STAT_ORDER)
  const [visibleStats, setVisibleStats] = useLocalStorage<string[]>('monster-stats-visible', DEFAULT_VISIBLE_STATS)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

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
      // 如果是最後一個可見屬性，不允許隱藏
      if (prev.includes(dataKey) && prev.length === 1) {
        return prev
      }
      if (prev.includes(dataKey)) {
        return prev.filter(key => key !== dataKey)
      }
      return [...prev, dataKey]
    })
  }

  // 重置可見性設定
  const resetVisibility = () => {
    setVisibleStats(DEFAULT_VISIBLE_STATS)
  }

  // 檢查是否有自訂可見性設定
  const isCustomVisibility = JSON.stringify([...visibleStats].sort()) !== JSON.stringify([...DEFAULT_VISIBLE_STATS].sort())

  // 處理無屬性資料的情況
  if (!mobInfo || !mobInfo.mob || mobInfo.mob.name === null) {
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <span className="text-2xl"></span>
          {t('monster.stats')}
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
          <NoDataIcon className="w-16 h-16 mb-4" />
          <p className="text-lg font-medium">{t('monster.noStats')}</p>
        </div>
      </div>
    )
  }

  const stats = mobInfo.mob

  // 屬性配置：dataKey 為資料欄位名稱，translationKey 為翻譯鍵值
  const statConfig = [
    { dataKey: 'level', translationKey: 'level', color: 'text-yellow-600 dark:text-yellow-400' },
    { dataKey: 'maxHP', translationKey: 'max_hp', color: 'text-red-600 dark:text-red-400' },
    { dataKey: 'physicalDefense', translationKey: 'phys_def', color: 'text-gray-600 dark:text-gray-400' },
    { dataKey: 'magicDefense', translationKey: 'mag_def', color: 'text-indigo-600 dark:text-indigo-400' },
    { dataKey: 'accuracy', translationKey: 'acc', color: 'text-pink-600 dark:text-pink-400' },
    { dataKey: 'evasion', translationKey: 'avoid', color: 'text-cyan-600 dark:text-cyan-400' },
    { dataKey: 'exp', translationKey: 'exp', color: 'text-amber-600 dark:text-amber-400' },
    { dataKey: 'minimumPushDamage', translationKey: 'minimumPushDamage', color: 'text-rose-600 dark:text-rose-400' },
  ]

  // 根據用戶自訂順序排序，並過濾可見屬性
  // 如果 statOrder 是空陣列，使用預設順序（修復 localStorage 空陣列導致屬性不顯示的 bug）
  const effectiveStatOrder = statOrder.length > 0 ? statOrder : DEFAULT_STAT_ORDER
  const sortedStatConfig = effectiveStatOrder
    .map(key => statConfig.find(s => s.dataKey === key))
    .filter((s): s is typeof statConfig[number] => s !== undefined)
    .filter(s => visibleStats.includes(s.dataKey))

  // 檢查是否為自訂順序
  const isCustomOrder = JSON.stringify(statOrder) !== JSON.stringify(DEFAULT_STAT_ORDER)

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 rounded-xl p-6 shadow-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
          <span className="text-2xl"></span>
          {t('monster.stats')}
        </h3>
        {/* 設定按鈕 + 提示 */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded transition-colors ${
              showSettings
                ? 'bg-blue-500 text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={t('monster.statsSettings')}
            aria-label={t('monster.statsSettings')}
            aria-expanded={showSettings}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <TipBubble
            tipId="monster-stats-settings"
            prerequisiteTipId="language-toggle"
            message={t('tip.monsterStatsSettings')}
            position="right"
          />
        </div>
      </div>

      {/* 設定面板 */}
      {showSettings && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {/* 視圖模式 */}
          <div className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('monster.viewMode')}
            </span>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={t('monster.viewGrid')}
                aria-label={t('monster.viewGrid')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={t('monster.viewList')}
                aria-label={t('monster.viewList')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* 顯示的屬性 */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('monster.selectVisibleStats')}
              </span>
              {isCustomVisibility && (
                <button
                  onClick={resetVisibility}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('monster.resetVisibility')}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {statConfig.map(({ dataKey, translationKey }) => (
                <label
                  key={dataKey}
                  className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={visibleStats.includes(dataKey)}
                    onChange={() => toggleStatVisibility(dataKey)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={visibleStats.includes(dataKey) && visibleStats.length === 1}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t(`monster.${translationKey}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 排序 */}
          <div className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('monster.sortOrder')}
              </span>
              {isCustomOrder && (
                <button
                  onClick={resetOrder}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('monster.resetOrder')}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('monster.dragToReorder')}
            </p>
          </div>
        </div>
      )}

      {/* 基本屬性 + 拖曳提示 */}
      <div className="relative">
        <TipBubble
          tipId="monster-stats-drag"
          prerequisiteTipId="monster-stats-settings"
          message={t('tip.monsterStatsDrag')}
        />
      </div>
      {viewMode === 'grid' ? (
        /* 網格視圖 */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedStatConfig.map(({ dataKey, translationKey, color }) => {
            const value = stats[dataKey as keyof typeof stats]
            const isAvoidField = dataKey === 'evasion'
            const isClickable = isAvoidField && onAccuracyClick && value !== null
            const isDragging = draggedItem === dataKey

            return (
              <div
                key={dataKey}
                draggable
                onDragStart={(e) => handleDragStart(e, dataKey)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dataKey)}
                onDragEnd={handleDragEnd}
                className={`bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm transition-all cursor-grab active:cursor-grabbing ${
                  isDragging ? 'opacity-50 scale-95' : ''
                } ${
                  isClickable
                    ? 'hover:shadow-lg hover:ring-2 hover:ring-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
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
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t(`monster.${translationKey}`)}
                    </div>
                    <div className={`text-lg font-bold ${color}`}>
                      {value !== null ? value : '-'}
                    </div>
                  </div>
                  {isClickable && (
                    <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 animate-bounce-x" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* 列表視圖 */
        <div className="flex flex-col gap-2">
          {sortedStatConfig.map(({ dataKey, translationKey, color }) => {
            const value = stats[dataKey as keyof typeof stats]
            const isAvoidField = dataKey === 'evasion'
            const isClickable = isAvoidField && onAccuracyClick && value !== null
            const isDragging = draggedItem === dataKey

            return (
              <div
                key={dataKey}
                draggable
                onDragStart={(e) => handleDragStart(e, dataKey)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dataKey)}
                onDragEnd={handleDragEnd}
                className={`bg-white dark:bg-gray-800 rounded-lg px-4 py-2.5 flex justify-between items-center transition-colors cursor-grab active:cursor-grabbing ${
                  isDragging ? 'opacity-50 scale-95' : ''
                } ${
                  isClickable
                    ? 'hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:ring-2 hover:ring-cyan-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t(`monster.${translationKey}`)}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${color} tabular-nums`}>
                    {value !== null ? value : '-'}
                  </span>
                  {isClickable && (
                    <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 animate-bounce-x" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

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
                <div className="text-sm font-medium text-red-700 dark:text-red-300">
                  {t('monster.fire_weakness')}
                </div>
              </div>
            )}
            {stats.ice_weakness === 3 && (
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-2 border border-cyan-200 dark:border-cyan-800">
                <div className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                  {t('monster.ice_weakness')}
                </div>
              </div>
            )}
            {stats.lightning_weakness === 3 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 border border-yellow-200 dark:border-yellow-800">
                <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                  {t('monster.lightning_weakness')}
                </div>
              </div>
            )}
            {stats.holy_weakness === 3 && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
                <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  {t('monster.holy_weakness')}
                </div>
              </div>
            )}
            {stats.poison_weakness === 3 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-800">
                <div className="text-sm font-medium text-green-700 dark:text-green-300">
                  {t('monster.poison_weakness')}
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
                <div className="text-sm font-medium text-red-200 dark:text-red-300">
                  {t('monster.fire_resistance')}
                </div>
              </div>
            )}
            {stats.ice_weakness === 2 && (
              <div className="bg-cyan-900/20 dark:bg-cyan-950/40 rounded-lg p-2 border border-cyan-900 dark:border-cyan-950">
                <div className="text-sm font-medium text-cyan-200 dark:text-cyan-300">
                  {t('monster.ice_resistance')}
                </div>
              </div>
            )}
            {stats.lightning_weakness === 2 && (
              <div className="bg-amber-900/20 dark:bg-amber-950/40 rounded-lg p-2 border border-amber-900 dark:border-amber-950">
                <div className="text-sm font-medium text-amber-200 dark:text-amber-300">
                  {t('monster.lightning_resistance')}
                </div>
              </div>
            )}
            {stats.holy_weakness === 2 && (
              <div className="bg-purple-900/20 dark:bg-purple-950/40 rounded-lg p-2 border border-purple-900 dark:border-purple-950">
                <div className="text-sm font-medium text-purple-200 dark:text-purple-300">
                  {t('monster.holy_resistance')}
                </div>
              </div>
            )}
            {stats.poison_weakness === 2 && (
              <div className="bg-green-900/20 dark:bg-green-950/40 rounded-lg p-2 border border-green-900 dark:border-green-950">
                <div className="text-sm font-medium text-green-200 dark:text-green-300">
                  {t('monster.poison_resistance')}
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
                <div className="text-sm font-medium text-gray-100 dark:text-gray-200">
                  {t('monster.fire_immunity')}
                </div>
              </div>
            )}
            {stats.ice_weakness === 1 && (
              <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-2 border border-gray-600 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-100 dark:text-gray-200">
                  {t('monster.ice_immunity')}
                </div>
              </div>
            )}
            {stats.lightning_weakness === 1 && (
              <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-2 border border-gray-600 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-100 dark:text-gray-200">
                  {t('monster.lightning_immunity')}
                </div>
              </div>
            )}
            {stats.holy_weakness === 1 && (
              <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-2 border border-gray-600 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-100 dark:text-gray-200">
                  {t('monster.holy_immunity')}
                </div>
              </div>
            )}
            {stats.poison_weakness === 1 && (
              <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-2 border border-gray-600 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-100 dark:text-gray-200">
                  {t('monster.poison_immunity')}
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
