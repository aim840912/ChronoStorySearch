'use client'

import { BaseModal } from '@/components/common/BaseModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useImageFormat } from '@/contexts/ImageFormatContext'
import type { ImageFormat } from '@/lib/image-utils'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { X, Sun, Moon, LayoutGrid, List, ChevronRight } from 'lucide-react'

/**
 * 視圖模式切換元件
 * 用於在 Grid 和 List 視圖之間切換
 */
function ViewModeToggle({
  value,
  onChange,
  gridTitle,
  listTitle,
}: {
  value: 'grid' | 'list'
  onChange: (mode: 'grid' | 'list') => void
  gridTitle: string
  listTitle: string
}) {
  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      <button
        onClick={() => onChange('grid')}
        className={`p-1.5 rounded transition-colors ${
          value === 'grid'
            ? 'bg-blue-500 text-white'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
        title={gridTitle}
      >
        <LayoutGrid className="w-5 h-5" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`p-1.5 rounded transition-colors ${
          value === 'list'
            ? 'bg-blue-500 text-white'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
        title={listTitle}
      >
        <List className="w-5 h-5" />
      </button>
    </div>
  )
}

// 怪物屬性設定常量（與 MonsterStatsCard 共用）
const DEFAULT_STAT_ORDER = ['level', 'maxHP', 'physicalDefense', 'magicDefense', 'accuracy', 'evasion', 'exp', 'minimumPushDamage']
const DEFAULT_VISIBLE_STATS = ['level', 'maxHP', 'physicalDefense', 'magicDefense', 'accuracy', 'evasion', 'exp', 'minimumPushDamage']

// 怪物屬性配置
const STAT_CONFIG = [
  { dataKey: 'level', translationKey: 'level' },
  { dataKey: 'maxHP', translationKey: 'max_hp' },
  { dataKey: 'physicalDefense', translationKey: 'phys_def' },
  { dataKey: 'magicDefense', translationKey: 'mag_def' },
  { dataKey: 'accuracy', translationKey: 'acc' },
  { dataKey: 'evasion', translationKey: 'avoid' },
  { dataKey: 'exp', translationKey: 'exp' },
  { dataKey: 'minimumPushDamage', translationKey: 'minimumPushDamage' },
]

// 物品屬性設定常量（與 ItemAttributesCard 共用）
const DEFAULT_ITEM_STAT_ORDER = [
  'category',
  'attackSpeed', 'incPAD', 'incMAD', 'incPDD', 'incMDD',
  'incSTR', 'incDEX', 'incINT', 'incLUK',
  'incMHP', 'incMMP', 'incACC', 'incEVA', 'incSpeed', 'incJump', 'tuc'
]
const DEFAULT_ITEM_VISIBLE_STATS = [...DEFAULT_ITEM_STAT_ORDER]

// 物品屬性配置
const ITEM_STAT_CONFIG = [
  { dataKey: 'category', translationKey: 'category' },
  { dataKey: 'attackSpeed', translationKey: 'attack_speed' },
  { dataKey: 'incPAD', translationKey: 'watk' },
  { dataKey: 'incMAD', translationKey: 'matk' },
  { dataKey: 'incPDD', translationKey: 'wdef' },
  { dataKey: 'incMDD', translationKey: 'mdef' },
  { dataKey: 'incSTR', translationKey: 'str' },
  { dataKey: 'incDEX', translationKey: 'dex' },
  { dataKey: 'incINT', translationKey: 'int' },
  { dataKey: 'incLUK', translationKey: 'luk' },
  { dataKey: 'incMHP', translationKey: 'hp' },
  { dataKey: 'incMMP', translationKey: 'mp' },
  { dataKey: 'incACC', translationKey: 'accuracy' },
  { dataKey: 'incEVA', translationKey: 'avoidability' },
  { dataKey: 'incSpeed', translationKey: 'speed' },
  { dataKey: 'incJump', translationKey: 'jump' },
  { dataKey: 'tuc', translationKey: 'upgrades' },
]

interface GlobalSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenPrivacySettings: () => void
}

/**
 * 全域設定 Modal
 * 整合所有網站設定於一處
 */
export function GlobalSettingsModal({
  isOpen,
  onClose,
  onOpenPrivacySettings,
}: GlobalSettingsModalProps) {
  const { t, language, setLanguage } = useLanguage()
  const { theme, setTheme } = useTheme()
  const { format, setFormat } = useImageFormat()

  // 怪物屬性設定（與 MonsterStatsCard 共用相同 localStorage 鍵）
  const [viewMode, setViewModeLocal] = useLocalStorage<'grid' | 'list'>('monster-stats-view-mode', 'grid')
  const [statOrder, setStatOrderLocal] = useLocalStorage<string[]>('monster-stats-order', DEFAULT_STAT_ORDER)
  const [visibleStats, setVisibleStatsLocal] = useLocalStorage<string[]>('monster-stats-visible', DEFAULT_VISIBLE_STATS)

  // 物品屬性設定（與 ItemAttributesCard 共用相同 localStorage 鍵）
  const [itemViewMode, setItemViewModeLocal] = useLocalStorage<'grid' | 'list'>('item-stats-view-mode', 'grid')
  const [itemStatOrder, setItemStatOrderLocal] = useLocalStorage<string[]>('item-stats-order', DEFAULT_ITEM_STAT_ORDER)
  const [itemVisibleStats, setItemVisibleStatsLocal] = useLocalStorage<string[]>('item-stats-visible', DEFAULT_ITEM_VISIBLE_STATS)
  const [showMaxOnly, setShowMaxOnlyLocal] = useLocalStorage<boolean>('item-stats-show-max-only', false)

  // 物品掉落來源顯示設定（與 ItemModal 共用相同 localStorage 鍵）
  const [itemSourcesViewMode, setItemSourcesViewModeLocal] = useLocalStorage<'grid' | 'list'>('item-sources-view', 'grid')

  // 怪物掉落顯示設定（與 MonsterModal 共用相同 localStorage 鍵）
  const [monsterDropsViewMode, setMonsterDropsViewModeLocal] = useLocalStorage<'grid' | 'list'>('monster-drops-view', 'grid')
  const [monsterDropsShowMaxOnly, setMonsterDropsShowMaxOnlyLocal] = useLocalStorage<boolean>('monster-drops-show-max-only', false)

  // 雲端同步包裝函數 - 怪物設定
  const setViewMode = (mode: 'grid' | 'list') => {
    setViewModeLocal(mode)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'monsterStatsViewMode', value: mode }
    }))
  }

  const setStatOrder = (order: string[]) => {
    setStatOrderLocal(order)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'monsterStatsOrder', value: order }
    }))
  }

  const setVisibleStats = (stats: string[]) => {
    setVisibleStatsLocal(stats)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'monsterStatsVisible', value: stats }
    }))
  }

  // 雲端同步包裝函數 - 物品設定
  const setItemViewMode = (mode: 'grid' | 'list') => {
    setItemViewModeLocal(mode)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'itemStatsViewMode', value: mode }
    }))
  }

  const setItemStatOrder = (order: string[]) => {
    setItemStatOrderLocal(order)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'itemStatsOrder', value: order }
    }))
  }

  const setItemVisibleStats = (stats: string[]) => {
    setItemVisibleStatsLocal(stats)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'itemStatsVisible', value: stats }
    }))
  }

  const setShowMaxOnly = (showMax: boolean) => {
    setShowMaxOnlyLocal(showMax)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'itemStatsShowMaxOnly', value: showMax }
    }))
  }

  // 雲端同步包裝函數 - 物品掉落來源設定
  const setItemSourcesViewMode = (mode: 'grid' | 'list') => {
    setItemSourcesViewModeLocal(mode)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'itemSourcesViewMode', value: mode }
    }))
  }

  // 雲端同步包裝函數 - 怪物掉落設定
  const setMonsterDropsViewMode = (mode: 'grid' | 'list') => {
    setMonsterDropsViewModeLocal(mode)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'monsterDropsViewMode', value: mode }
    }))
  }

  const setMonsterDropsShowMaxOnly = (show: boolean) => {
    setMonsterDropsShowMaxOnlyLocal(show)
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'monsterDropsShowMaxOnly', value: show }
    }))
  }

  // 檢查是否有自訂設定（怪物）
  const isCustomOrder = JSON.stringify(statOrder) !== JSON.stringify(DEFAULT_STAT_ORDER)
  const isCustomVisibility = JSON.stringify([...visibleStats].sort()) !== JSON.stringify([...DEFAULT_VISIBLE_STATS].sort())

  // 檢查是否有自訂設定（物品）
  const isItemCustomOrder = JSON.stringify(itemStatOrder) !== JSON.stringify(DEFAULT_ITEM_STAT_ORDER)
  const isItemCustomVisibility = JSON.stringify([...itemVisibleStats].sort()) !== JSON.stringify([...DEFAULT_ITEM_VISIBLE_STATS].sort())
  const isItemCustomShowMaxOnly = showMaxOnly !== false

  // 檢查是否有自訂設定（物品掉落來源）
  const isItemSourcesCustom = itemSourcesViewMode !== 'grid'

  // 檢查是否有自訂設定（怪物掉落）
  const isMonsterDropsCustom = monsterDropsViewMode !== 'grid' || monsterDropsShowMaxOnly !== false

  // 切換屬性可見性（怪物）
  const toggleStatVisibility = (dataKey: string) => {
    const current = visibleStats
    if (current.includes(dataKey) && current.length === 1) {
      return // 不允許隱藏最後一個屬性
    }
    const newStats = current.includes(dataKey)
      ? current.filter(key => key !== dataKey)
      : [...current, dataKey]
    setVisibleStats(newStats)
  }

  // 切換屬性可見性（物品）
  const toggleItemStatVisibility = (dataKey: string) => {
    const current = itemVisibleStats
    if (current.includes(dataKey) && current.length === 1) {
      return // 不允許隱藏最後一個屬性
    }
    const newStats = current.includes(dataKey)
      ? current.filter(key => key !== dataKey)
      : [...current, dataKey]
    setItemVisibleStats(newStats)
  }

  // 重置所有怪物屬性設定
  const resetMonsterSettings = () => {
    setViewMode('grid')
    setStatOrder(DEFAULT_STAT_ORDER)
    setVisibleStats(DEFAULT_VISIBLE_STATS)
  }

  // 重置所有物品屬性設定
  const resetItemSettings = () => {
    setItemViewMode('grid')
    setItemStatOrder(DEFAULT_ITEM_STAT_ORDER)
    setItemVisibleStats(DEFAULT_ITEM_VISIBLE_STATS)
    setShowMaxOnly(false)
  }

  // 重置物品掉落來源設定
  const resetItemSourcesSettings = () => {
    setItemSourcesViewMode('grid')
  }

  // 重置怪物掉落設定
  const resetMonsterDropsSettings = () => {
    setMonsterDropsViewMode('grid')
    setMonsterDropsShowMaxOnly(false)
  }

  // 處理隱私設定點擊
  const handlePrivacyClick = () => {
    onClose()
    onOpenPrivacySettings()
  }

  // 圖片格式選項
  const imageFormats: { value: ImageFormat; label: string }[] = [
    { value: 'png', label: 'PNG' },
    { value: 'stand', label: t('monster.imageFormat.stand') },
    { value: 'hit', label: t('monster.imageFormat.hit') },
    { value: 'die', label: t('monster.imageFormat.die') },
  ]

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('settings.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 顯示設定 */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('settings.display')}
            </h3>

            {/* 語言 */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">{t('settings.language')}</span>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setLanguage('zh-TW')}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    language === 'zh-TW'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  繁中
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    language === 'en'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* 主題 */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">{t('settings.theme')}</span>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setTheme('light')}
                  className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1.5 ${
                    theme === 'light'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  {t('settings.themeLight')}
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1.5 ${
                    theme === 'dark'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  {t('settings.themeDark')}
                </button>
              </div>
            </div>

            {/* 圖片格式 */}
            <div className="space-y-2">
              <span className="text-gray-700 dark:text-gray-300">{t('settings.imageFormat')}</span>
              <div className="grid grid-cols-4 gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {imageFormats.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFormat(value)}
                    className={`px-2 py-1.5 text-sm rounded transition-colors text-center ${
                      format === value
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 分隔線 */}
          <hr className="border-gray-200 dark:border-gray-700" />

          {/* 怪物屬性顯示設定 */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('settings.monsterStats')}
              </h3>
              {(isCustomOrder || isCustomVisibility) && (
                <button
                  onClick={resetMonsterSettings}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('settings.resetToDefault')}
                </button>
              )}
            </div>

            {/* 視圖模式 */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">{t('settings.viewMode')}</span>
              <ViewModeToggle
                value={viewMode}
                onChange={setViewMode}
                gridTitle={t('monster.viewGrid')}
                listTitle={t('monster.viewList')}
              />
            </div>

            {/* 顯示的屬性 */}
            <div className="space-y-2">
              <span className="text-gray-700 dark:text-gray-300">{t('settings.visibleStats')}</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {STAT_CONFIG.map(({ dataKey, translationKey }) => (
                  <label
                    key={dataKey}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
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
          </section>

          {/* 分隔線 */}
          <hr className="border-gray-200 dark:border-gray-700" />

          {/* 物品屬性顯示設定 */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('settings.itemStats')}
              </h3>
              {(isItemCustomOrder || isItemCustomVisibility || isItemCustomShowMaxOnly) && (
                <button
                  onClick={resetItemSettings}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('settings.resetToDefault')}
                </button>
              )}
            </div>

            {/* 視圖模式 */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">{t('settings.viewMode')}</span>
              <ViewModeToggle
                value={itemViewMode}
                onChange={setItemViewMode}
                gridTitle={t('monster.viewGrid')}
                listTitle={t('monster.viewList')}
              />
            </div>

            {/* 只顯示最大值 */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">{t('item.showMaxOnlyOption')}</span>
              <button
                onClick={() => setShowMaxOnly(!showMaxOnly)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showMaxOnly ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={showMaxOnly}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showMaxOnly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 顯示的屬性 */}
            <div className="space-y-2">
              <span className="text-gray-700 dark:text-gray-300">{t('settings.visibleStats')}</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {ITEM_STAT_CONFIG.map(({ dataKey, translationKey }) => (
                  <label
                    key={dataKey}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <input
                      type="checkbox"
                      checked={itemVisibleStats.includes(dataKey)}
                      onChange={() => toggleItemStatVisibility(dataKey)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={itemVisibleStats.includes(dataKey) && itemVisibleStats.length === 1}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t(`item.${translationKey}`)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* 分隔線 */}
          <hr className="border-gray-200 dark:border-gray-700" />

          {/* 物品掉落來源顯示設定 */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('settings.itemSources')}
              </h3>
              {isItemSourcesCustom && (
                <button
                  onClick={resetItemSourcesSettings}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('settings.resetToDefault')}
                </button>
              )}
            </div>

            {/* 視圖模式 */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">{t('settings.viewMode')}</span>
              <ViewModeToggle
                value={itemSourcesViewMode}
                onChange={setItemSourcesViewMode}
                gridTitle={t('monster.viewGrid')}
                listTitle={t('monster.viewList')}
              />
            </div>

          </section>

          {/* 分隔線 */}
          <hr className="border-gray-200 dark:border-gray-700" />

          {/* 怪物掉落顯示設定 */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('settings.monsterDrops')}
              </h3>
              {isMonsterDropsCustom && (
                <button
                  onClick={resetMonsterDropsSettings}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('settings.resetToDefault')}
                </button>
              )}
            </div>

            {/* 視圖模式 */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">{t('settings.viewMode')}</span>
              <ViewModeToggle
                value={monsterDropsViewMode}
                onChange={setMonsterDropsViewMode}
                gridTitle={t('monster.viewGrid')}
                listTitle={t('monster.viewList')}
              />
            </div>

            {/* 只顯示最大值 */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">{t('item.showMaxOnlyOption')}</span>
              <button
                onClick={() => setMonsterDropsShowMaxOnly(!monsterDropsShowMaxOnly)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  monsterDropsShowMaxOnly ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={monsterDropsShowMaxOnly}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    monsterDropsShowMaxOnly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* 分隔線 */}
          <hr className="border-gray-200 dark:border-gray-700" />

          {/* 隱私設定 */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('settings.privacy')}
            </h3>
            <button
              onClick={handlePrivacyClick}
              className="w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
            >
              <span>{t('settings.managePrivacy')}</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </section>
        </div>
      </div>
    </BaseModal>
  )
}
