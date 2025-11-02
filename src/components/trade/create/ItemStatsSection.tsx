'use client'

import { ItemStats } from '@/types/item-stats'
import { useLanguage } from '@/contexts/LanguageContext'
import { ItemStatsInput } from '../ItemStatsInput'

/**
 * 物品屬性區塊元件
 *
 * 功能：
 * - 顯示/隱藏物品屬性輸入
 * - 僅在裝備類物品時顯示
 * - 摺疊式設計
 *
 * 使用範例：
 * ```tsx
 * <ItemStatsSection
 *   isEquipment={isEquipment}
 *   itemStats={itemStats}
 *   showInput={showStatsInput}
 *   onToggle={() => setShowStatsInput(!showStatsInput)}
 *   onChange={setItemStats}
 * />
 * ```
 */
interface ItemStatsSectionProps {
  /** 是否為裝備類物品 */
  isEquipment: boolean
  /** 物品屬性 */
  itemStats: ItemStats | null
  /** 是否顯示輸入框 */
  showInput: boolean
  /** 切換顯示狀態回調 */
  onToggle: () => void
  /** 屬性變更回調 */
  onChange: (stats: ItemStats | null) => void
}

export function ItemStatsSection({
  isEquipment,
  itemStats,
  showInput,
  onToggle,
  onChange
}: ItemStatsSectionProps) {
  const { t } = useLanguage()

  // 非裝備類不顯示
  if (!isEquipment) {
    return null
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 mb-2 font-semibold text-gray-700 dark:text-gray-300
                   hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${showInput ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {t('listing.itemStatsOptional')}
        {itemStats && (
          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
            {t('listing.itemStatsFilled')}
          </span>
        )}
      </button>

      {showInput && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {t('listing.itemStatsDescription')}
          </p>
          <ItemStatsInput
            value={itemStats}
            onChange={onChange}
            locale="zh-TW"
            simpleMode={true}
          />
        </div>
      )}
    </div>
  )
}
