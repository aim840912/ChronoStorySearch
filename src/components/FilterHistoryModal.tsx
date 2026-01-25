'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { FilterHistoryRecord, AdvancedFilterOptions } from '@/types'

interface FilterHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  history: FilterHistoryRecord[]
  currentFilter: AdvancedFilterOptions
  onSave: () => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

/**
 * 格式化相對時間
 */
function formatRelativeTime(timestamp: number, language: string): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const isZh = language === 'zh-TW'

  if (days > 0) {
    return isZh ? `${days} 天前` : `${days}d ago`
  }
  if (hours > 0) {
    return isZh ? `${hours} 小時前` : `${hours}h ago`
  }
  if (minutes > 0) {
    return isZh ? `${minutes} 分鐘前` : `${minutes}m ago`
  }
  return isZh ? '剛剛' : 'Just now'
}

/**
 * 生成篩選條件描述
 */
function generateFilterDescription(
  filter: AdvancedFilterOptions,
  t: (key: string) => string
): string {
  const parts: string[] = []

  // 物品類別（最多顯示 2 個）
  if (filter.itemCategories.length > 0) {
    const cats = filter.itemCategories
      .slice(0, 2)
      .map((c) => t(`filter.itemCategory.${c}`))
    if (filter.itemCategories.length > 2) {
      cats.push(`+${filter.itemCategories.length - 2}`)
    }
    parts.push(cats.join(', '))
  }

  // 職業（最多顯示 1 個）
  if (filter.jobClasses.length > 0) {
    const job = t(`filter.jobClass.${filter.jobClasses[0]}`)
    if (filter.jobClasses.length > 1) {
      parts.push(`${job} +${filter.jobClasses.length - 1}`)
    } else {
      parts.push(job)
    }
  }

  // 等級範圍
  if (filter.levelRange.min !== null || filter.levelRange.max !== null) {
    const min = filter.levelRange.min ?? 0
    const max = filter.levelRange.max ?? '∞'
    parts.push(`Lv.${min}-${max}`)
  }

  // 主屬性
  if (filter.statBoosts.length > 0) {
    parts.push(filter.statBoosts.map((s) => s.toUpperCase()).join('+'))
  }

  // 屬性弱點
  if (filter.elementWeaknesses.length > 0) {
    const elem = t(`filter.element.${filter.elementWeaknesses[0]}`)
    if (filter.elementWeaknesses.length > 1) {
      parts.push(`${elem} +${filter.elementWeaknesses.length - 1}`)
    } else {
      parts.push(elem)
    }
  }

  // 怪物類型
  if (filter.isBoss) parts.push('Boss')

  // 攻擊速度
  if (
    filter.attackSpeedRange.min !== null ||
    filter.attackSpeedRange.max !== null
  ) {
    parts.push(t('filter.attackSpeed.label'))
  }

  return parts.slice(0, 3).join(' | ') || t('filterHistory.noFilters')
}

/**
 * 檢查當前篩選是否有任何條件
 */
function hasAnyFilter(filter: AdvancedFilterOptions): boolean {
  return (
    filter.itemCategories.length > 0 ||
    filter.jobClasses.length > 0 ||
    filter.elementWeaknesses.length > 0 ||
    filter.statBoosts.length > 0 ||
    filter.isBoss ||
    filter.levelRange.min !== null ||
    filter.levelRange.max !== null ||
    filter.attackSpeedRange.min !== null ||
    filter.attackSpeedRange.max !== null
  )
}

/**
 * 篩選歷史紀錄 Modal
 */
export function FilterHistoryModal({
  isOpen,
  onClose,
  history,
  currentFilter,
  onSave,
  onLoad,
  onDelete,
  onClearAll,
}: FilterHistoryModalProps) {
  const { t, language } = useLanguage()

  // ESC 鍵關閉
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const canSave = hasAnyFilter(currentFilter)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {t('filterHistory.title')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {history.length} {t('filterHistory.records')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Save Current Filter Button */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              onSave()
              onClose()
            }}
            disabled={!canSave}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              canSave
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('filterHistory.save')}
          </button>
          {!canSave && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              {t('filterHistory.noCurrentFilter')}
            </p>
          )}
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg
                className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {t('filterHistory.empty')}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {t('filterHistory.emptyHint')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Filter Info */}
                    <button
                      onClick={() => {
                        onLoad(record.id)
                        onClose()
                      }}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {generateFilterDescription(record.filter, t)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatRelativeTime(record.createdAt, language)}
                      </p>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(record.id)
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                      title={t('filterHistory.delete')}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clear All Button */}
        {history.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                onClearAll()
              }}
              className="w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 border-2 border-red-500 hover:border-red-600 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="text-sm">{t('filterHistory.clearAll')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
