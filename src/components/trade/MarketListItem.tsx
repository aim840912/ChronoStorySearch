'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { getItemImageUrl } from '@/lib/image-utils'
import type { ListingWithUserInfo } from '@/types'

interface MarketListItemProps {
  listing: ListingWithUserInfo
  onClick: () => void
}

/**
 * 市場刊登項目元件
 *
 * 功能：
 * - 顯示單個市場刊登的摘要資訊
 * - 包含物品圖片、名稱、交易類型、數量、價格、賣家資訊
 * - 點擊後打開刊登詳情 Modal
 *
 * 設計：
 * - 列表式佈局（非卡片式）
 * - 響應式：桌面顯示完整資訊，移動端簡化
 * - 深色模式支援
 */
export function MarketListItem({ listing, onClick }: MarketListItemProps) {
  const { language, t } = useLanguage()

  // 取得物品名稱（根據語言）
  const getItemName = (item: ListingWithUserInfo['item']) => {
    // 處理 item 為 null 或 undefined 的情況
    if (!item) {
      return language === 'zh-TW' ? '未知物品' : 'Unknown Item'
    }

    if (language === 'zh-TW') {
      return item.chineseItemName || item.itemName || '未知物品'
    }
    return item.itemName || item.chineseItemName || 'Unknown Item'
  }

  // 格式化交易類型
  const getTradeTypeBadge = () => {
    const colors = {
      sell: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      buy: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      exchange: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    }

    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${colors[listing.trade_type]}`}>
        {t(`trade.type.${listing.trade_type}`)}
      </span>
    )
  }

  // 格式化價格或交換資訊
  const getPriceDisplay = () => {
    if (listing.trade_type === 'exchange') {
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-purple-600 dark:text-purple-400">
            {t('listing.exchange')}
          </span>
        </div>
      )
    }

    if (listing.price) {
      return (
        <div className="text-sm">
          <span className="font-bold text-yellow-600 dark:text-yellow-400">
            {listing.price.toLocaleString()}
          </span>
          <span className="text-gray-500 dark:text-gray-400 ml-1">
            {t('listing.meso')}
          </span>
        </div>
      )
    }

    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {language === 'zh-TW' ? '面議' : 'Negotiable'}
      </span>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full grid grid-cols-[70px_50px_1fr_60px_90px] md:grid-cols-[100px_80px_1fr_100px_140px_140px] gap-2 md:gap-4 items-center p-3 md:p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border-b border-gray-200 dark:border-gray-700 transition-colors text-left"
    >
      {/* 1. 交易模式 */}
      <div className="flex items-center justify-center">
        {getTradeTypeBadge()}
      </div>

      {/* 2. 物品圖片 */}
      <div className="flex items-center justify-center">
        <div className="w-12 h-12 md:w-16 md:h-16 relative">
          <img
            src={getItemImageUrl(listing.item_id)}
            alt={getItemName(listing.item)}
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.src = '/images/items/default.png'
            }}
          />
        </div>
      </div>

      {/* 3. 物品名稱 + 屬性 */}
      <div className="min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm md:text-base">
          {getItemName(listing.item)}
        </h3>
        {/* 物品屬性摘要（如果有） */}
        {listing.item_stats && (
          <div className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
            <span className="truncate">
              {Object.entries(listing.item_stats)
                .filter(([, value]) => value !== undefined && value !== null)
                .slice(0, 3)
                .map(([key, value]) => `${key}+${value}`)
                .join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* 4. 數量 */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <span className="hidden md:inline">{t('listing.quantity')}: </span>
        <span className="font-medium">{listing.quantity}</span>
      </div>

      {/* 5. 價格 */}
      <div className="text-center">
        {getPriceDisplay()}
      </div>

      {/* 6. 發布者（僅桌面顯示） */}
      <div className="hidden md:block text-center text-sm text-gray-600 dark:text-gray-400 truncate">
        {listing.seller.discord_username || listing.seller.username}
      </div>
    </button>
  )
}
