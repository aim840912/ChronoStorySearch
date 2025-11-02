'use client'

import { ExtendedUniqueItem } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { ItemSearchInput } from '../ItemSearchInput'

/**
 * 想要物品管理器元件
 *
 * 功能：
 * - 管理交換模式下的想要物品列表
 * - 新增/移除想要物品
 * - 修改物品數量
 * - 最多 3 個物品
 *
 * 使用範例：
 * ```tsx
 * <WantedItemsManager
 *   wantedItems={wantedItems}
 *   onUpdate={setWantedItems}
 *   excludeItemId={selectedItem?.itemId}
 * />
 * ```
 */
interface WantedItemsManagerProps {
  /** 想要物品列表 */
  wantedItems: Array<{ item: ExtendedUniqueItem; quantity: number }>
  /** 列表更新回調 */
  onUpdate: (items: Array<{ item: ExtendedUniqueItem; quantity: number }>) => void
  /** 排除的物品 ID（不能選擇自己提供的物品） */
  excludeItemId?: number
}

export function WantedItemsManager({
  wantedItems,
  onUpdate,
  excludeItemId
}: WantedItemsManagerProps) {
  const { t } = useLanguage()

  const MAX_WANTED_ITEMS = 3

  // 更新特定物品的數量
  const handleQuantityChange = (index: number, newQuantity: number) => {
    onUpdate(
      wantedItems.map((item, i) =>
        i === index ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  // 移除特定物品
  const handleRemoveItem = (index: number) => {
    onUpdate(wantedItems.filter((_, i) => i !== index))
  }

  // 新增物品
  const handleAddItem = (item: ExtendedUniqueItem | null) => {
    if (item && !wantedItems.some(w => w.item.itemId === item.itemId)) {
      onUpdate([...wantedItems, { item, quantity: 1 }])
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <label className="font-semibold">{t('listing.wantedItemsLabel')}</label>
        {wantedItems.length > 0 && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('listing.wantedItemsCount', { count: wantedItems.length })}
          </span>
        )}
      </div>

      {/* 已選擇的想要物品列表 */}
      {wantedItems.map((wantedItem, index) => (
        <div
          key={index}
          className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">
                {wantedItem.item.chineseItemName || wantedItem.item.itemName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  {t('listing.quantityLabel')}:
                </label>
                <input
                  type="number"
                  min="1"
                  value={wantedItem.quantity}
                  onChange={(e) => {
                    const newQuantity = parseInt(e.target.value) || 1
                    handleQuantityChange(index, newQuantity)
                  }}
                  className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveItem(index)}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400
                         rounded hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
            >
              {t('listing.removeWantedItem')}
            </button>
          </div>
        </div>
      ))}

      {/* 新增想要物品按鈕與搜尋框 */}
      {wantedItems.length < MAX_WANTED_ITEMS ? (
        <ItemSearchInput
          value={null}
          onSelect={handleAddItem}
          placeholder={t('listing.searchExchangeItemPlaceholder')}
          excludeItemId={excludeItemId}
        />
      ) : (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t('listing.maxWantedItemsReached')}
          </p>
        </div>
      )}
    </div>
  )
}
