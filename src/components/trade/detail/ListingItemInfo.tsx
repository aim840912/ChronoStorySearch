'use client'

import { ExtendedUniqueItem } from '@/types'
import { getItemImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 買賣模式物品資訊卡片元件
 *
 * 功能：
 * - 顯示物品圖片、名稱、數量
 * - 顯示價格（如果有）
 * - 顯示交易類型標籤
 * - 顯示瀏覽/感興趣統計
 *
 * 使用範例：
 * ```tsx
 * <ListingItemInfo
 *   item={item}
 *   itemId={listing.item_id}
 *   quantity={listing.quantity}
 *   price={listing.price}
 *   tradeType={listing.trade_type}
 *   viewCount={listing.view_count}
 *   interestCount={listing.interest_count}
 * />
 * ```
 */
interface ListingItemInfoProps {
  /** 物品資料 */
  item: ExtendedUniqueItem | null | undefined
  /** 物品 ID（用於顯示未知物品） */
  itemId: number
  /** 數量 */
  quantity: number
  /** 價格（選填） */
  price?: number
  /** 交易類型 */
  tradeType: 'sell' | 'buy' | 'exchange'
  /** 瀏覽次數 */
  viewCount: number
  /** 感興趣次數 */
  interestCount: number
}

export function ListingItemInfo({
  item,
  itemId,
  quantity,
  price,
  tradeType,
  viewCount,
  interestCount
}: ListingItemInfoProps) {
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
      <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('listing.itemInfo')}</h3>
      <div className="flex items-center gap-4">
        <img
          src={getItemImageUrl(itemId)}
          alt={item?.itemName || String(itemId)}
          className="w-20 h-20 object-contain"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
          }}
        />
        <div className="flex-1">
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {getDisplayItemName(item, itemId)}
          </p>
          <p className="text-gray-600 dark:text-gray-400">{t('listing.quantity')}: {quantity}</p>

          {/* 價格 */}
          {price && (
            <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
              {price.toLocaleString()} {t('listing.meso')}
            </p>
          )}

          {/* 交易類型標籤 */}
          <div className="mt-2">
            <span className={`inline-block px-2 py-1 text-xs rounded ${
              tradeType === 'sell' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
              'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
            }`}>
              {tradeType === 'sell' ? t('trade.type.sell') : t('trade.type.buy')}
            </span>
          </div>

          {/* 統計資訊 */}
          <div className="flex gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span>{t('listing.viewCount')}: {viewCount}</span>
            <span>{t('listing.interestCount')}: {interestCount}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
