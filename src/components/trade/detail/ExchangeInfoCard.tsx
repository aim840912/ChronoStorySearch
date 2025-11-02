'use client'

import { ExtendedUniqueItem, WantedItem } from '@/types'
import { getItemImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 交換模式資訊卡片元件
 *
 * 功能：
 * - 顯示「我提供」的物品
 * - 顯示雙向箭頭
 * - 顯示「我想要」的物品列表
 * - 顯示瀏覽/感興趣統計
 *
 * 使用範例：
 * ```tsx
 * <ExchangeInfoCard
 *   offeredItem={item}
 *   offeredItemId={listing.item_id}
 *   offeredQuantity={listing.quantity}
 *   wantedItems={listing.wanted_items}
 *   viewCount={listing.view_count}
 *   interestCount={listing.interest_count}
 *   getItemById={getItemById}
 * />
 * ```
 */
interface ExchangeInfoCardProps {
  /** 提供的物品資料 */
  offeredItem: ExtendedUniqueItem | null | undefined
  /** 提供的物品 ID */
  offeredItemId: number
  /** 提供的物品數量 */
  offeredQuantity: number
  /** 想要的物品列表 */
  wantedItems?: WantedItem[]
  /** 瀏覽次數 */
  viewCount: number
  /** 感興趣次數 */
  interestCount: number
  /** 根據 ID 取得物品的函數 */
  getItemById: (itemId: number) => ExtendedUniqueItem | null | undefined
}

export function ExchangeInfoCard({
  offeredItem,
  offeredItemId,
  offeredQuantity,
  wantedItems,
  viewCount,
  interestCount,
  getItemById
}: ExchangeInfoCardProps) {
  const { language, t } = useLanguage()

  // 根據語言選擇物品名稱
  const getDisplayItemName = (item: ExtendedUniqueItem | null | undefined, itemId: number) => {
    if (!item) {
      return itemId ? (language === 'zh-TW' ? `物品 #${itemId}` : `Item #${itemId}`) : (language === 'zh-TW' ? '未知物品' : 'Unknown Item')
    }
    if (language === 'zh-TW') {
      return item.chineseItemName || item.itemName || (itemId ? `物品 #${itemId}` : '未知物品')
    }
    return item.itemName || (itemId ? `Item #${itemId}` : 'Unknown Item')
  }

  return (
    <div className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">{t('listing.exchangeFor')}</h3>

      {/* 我提供的物品 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2 text-purple-700 dark:text-purple-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
          <span className="font-medium">{t('listing.iProvide')}</span>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <img
              src={getItemImageUrl(offeredItemId)}
              alt={offeredItem?.itemName || String(offeredItemId)}
              className="w-16 h-16 object-contain"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
              }}
            />
            <div className="flex-1">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {getDisplayItemName(offeredItem, offeredItemId)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('listing.quantity')}: {offeredQuantity}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 雙向箭頭 */}
      <div className="flex justify-center my-3">
        <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      </div>

      {/* 我想要的物品 */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-purple-700 dark:text-purple-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="font-medium">{t('listing.iWant')}</span>
        </div>
        {wantedItems && wantedItems.length > 0 ? (
          <div className="space-y-2">
            {wantedItems.map((wantedItem, index) => {
              const wantedItemData = getItemById(wantedItem.item_id)
              return (
                <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {getDisplayItemName(wantedItemData, wantedItem.item_id)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('listing.quantity')}: {wantedItem.quantity}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {language === 'zh-TW' ? '此交換刊登尚未設定想要的物品' : 'No wanted items specified for this exchange listing'}
            </p>
          </div>
        )}
      </div>

      {/* 統計資訊 */}
      <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
        <span>{t('listing.viewCount')}: {viewCount}</span>
        <span>{t('listing.interestCount')}: {interestCount}</span>
      </div>
    </div>
  )
}
