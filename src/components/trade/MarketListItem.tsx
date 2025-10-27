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
      return language === 'zh-TW' ? `物品 #${listing.item_id}` : `Item #${listing.item_id}`
    }

    if (language === 'zh-TW') {
      return item.chineseItemName || item.itemName || `物品 #${listing.item_id}`
    }
    return item.itemName || `Item #${listing.item_id}`
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
      className="w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border-b border-gray-200 dark:border-gray-700 transition-colors text-left"
    >
      {/* 物品圖片 */}
      <div className="flex-shrink-0 w-12 h-12 relative">
        <img
          src={getItemImageUrl(listing.item_id)}
          alt={getItemName(listing.item)}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.src = '/images/items/default.png'
          }}
        />
      </div>

      {/* 主要資訊 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {getTradeTypeBadge()}
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {getItemName(listing.item)}
          </h3>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          {/* 數量 */}
          <span>
            {t('listing.quantity')}: {listing.quantity}
          </span>

          {/* 價格 */}
          {getPriceDisplay()}

          {/* 賣家（僅桌面顯示） */}
          <span className="hidden md:block truncate">
            {listing.seller.discord_username || listing.seller.username}
          </span>
        </div>

        {/* 物品屬性摘要（如果有） */}
        {listing.item_stats && (
          <div className="mt-1 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
            {listing.stats_grade && (
              <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900 rounded">
                {listing.stats_grade}
              </span>
            )}
            <span className="truncate max-w-xs">
              {Object.entries(listing.item_stats)
                .filter(([, value]) => value !== undefined && value !== null)
                .slice(0, 3)
                .map(([key, value]) => `${key}+${value}`)
                .join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* 右側：瀏覽/意向數（僅桌面顯示） */}
      <div className="hidden md:flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>{listing.view_count}</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>{listing.interest_count}</span>
        </div>
      </div>

      {/* 箭頭圖示 */}
      <div className="flex-shrink-0">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}
