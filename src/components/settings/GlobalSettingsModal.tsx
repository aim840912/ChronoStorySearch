'use client'

import { BaseModal } from '@/components/common/BaseModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useImageFormat } from '@/contexts/ImageFormatContext'
import type { ImageFormat } from '@/lib/image-utils'
import { useLocalStorage } from '@/hooks/useLocalStorage'

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
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>('monster-stats-view-mode', 'grid')
  const [statOrder, setStatOrder] = useLocalStorage<string[]>('monster-stats-order', DEFAULT_STAT_ORDER)
  const [visibleStats, setVisibleStats] = useLocalStorage<string[]>('monster-stats-visible', DEFAULT_VISIBLE_STATS)

  // 檢查是否有自訂設定
  const isCustomOrder = JSON.stringify(statOrder) !== JSON.stringify(DEFAULT_STAT_ORDER)
  const isCustomVisibility = JSON.stringify([...visibleStats].sort()) !== JSON.stringify([...DEFAULT_VISIBLE_STATS].sort())

  // 切換屬性可見性
  const toggleStatVisibility = (dataKey: string) => {
    setVisibleStats(prev => {
      if (prev.includes(dataKey) && prev.length === 1) {
        return prev // 不允許隱藏最後一個屬性
      }
      if (prev.includes(dataKey)) {
        return prev.filter(key => key !== dataKey)
      }
      return [...prev, dataKey]
    })
  }

  // 重置所有怪物屬性設定
  const resetMonsterSettings = () => {
    setViewMode('grid')
    setStatOrder(DEFAULT_STAT_ORDER)
    setVisibleStats(DEFAULT_VISIBLE_STATS)
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
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  {t('settings.themeDark')}
                </button>
              </div>
            </div>

            {/* 圖片格式 */}
            <div className="space-y-2">
              <span className="text-gray-700 dark:text-gray-300">{t('settings.imageFormat')}</span>
              <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {imageFormats.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFormat(value)}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
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
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={t('monster.viewGrid')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 顯示的屬性 */}
            <div className="space-y-2">
              <span className="text-gray-700 dark:text-gray-300">{t('settings.visibleStats')}</span>
              <div className="grid grid-cols-2 gap-2">
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
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </section>
        </div>
      </div>
    </BaseModal>
  )
}
