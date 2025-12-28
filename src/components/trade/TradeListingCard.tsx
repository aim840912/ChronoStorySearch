'use client'

import { memo, useState, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { FavoriteButton } from './FavoriteButton'
import { ReportModal } from './ReportModal'
import { getItemImageUrl } from '@/lib/image-utils'
import type { TradeListingWithFavorite } from '@/types/trade'

interface TradeListingCardProps {
  listing: TradeListingWithFavorite
  onEdit?: (listing: TradeListingWithFavorite) => void
  onDelete?: (id: string) => void
  onMarkComplete?: (id: string) => void
  onFavoriteToggle?: (id: string, isFavorited: boolean) => void
}

/**
 * 格式化價格顯示（加千分位）
 */
function formatPrice(price: number): string {
  return price.toLocaleString()
}

/**
 * 計算剩餘天數
 */
function getDaysRemaining(expiresAt: string): number {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * 格式化日期
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * 交易刊登卡片
 */
export const TradeListingCard = memo(function TradeListingCard({
  listing,
  onEdit,
  onDelete,
  onMarkComplete,
  onFavoriteToggle,
}: TradeListingCardProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const isOwner = user?.id === listing.userId
  const daysRemaining = getDaysRemaining(listing.expiresAt)
  const isExpiringSoon = daysRemaining <= 3

  const handleFavoriteToggle = useCallback((isFavorited: boolean) => {
    onFavoriteToggle?.(listing.id, isFavorited)
  }, [listing.id, onFavoriteToggle])

  return (
    <>
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
        {/* 交易類型標籤 */}
        <div
          className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-medium rounded-full ${
            listing.type === 'sell'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
          }`}
        >
          {listing.type === 'sell' ? t('trade.sell') : t('trade.buy')}
        </div>

        {/* 右上角按鈕群 */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {/* 收藏按鈕 */}
          {!isOwner && (
            <FavoriteButton
              listingId={listing.id}
              isFavorited={listing.isFavorited ?? false}
              onToggle={handleFavoriteToggle}
              size="sm"
            />
          )}

          {/* 檢舉按鈕 */}
          {!isOwner && user && (
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="p-1 text-gray-400 hover:text-orange-500 transition-colors"
              aria-label={t('trade.report')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                />
              </svg>
            </button>
          )}

          {/* 擁有者操作按鈕 */}
          {isOwner && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowActions(!showActions)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>

              {/* 下拉選單 */}
              {showActions && (
                <div className="absolute right-0 top-8 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                  <button
                    type="button"
                    onClick={() => {
                      onEdit?.(listing)
                      setShowActions(false)
                    }}
                    className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onMarkComplete?.(listing.id)
                      setShowActions(false)
                    }}
                    className="w-full px-3 py-2 text-sm text-left text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {t('trade.markComplete')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete?.(listing.id)
                      setShowActions(false)
                    }}
                    className="w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 物品資訊 */}
        <div className="p-4 pt-10">
          <div className="flex items-start gap-3">
            {/* 物品圖片 */}
            <div className="shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
              <img
                src={getItemImageUrl(listing.itemId)}
                alt={listing.itemName}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/placeholder-item.png'
                }}
              />
            </div>

            {/* 物品名稱和數量 */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                {listing.itemName}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('trade.quantity')}: {listing.quantity}
              </p>
            </div>
          </div>

          {/* 價格 */}
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {formatPrice(listing.price)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">Mesos</span>
          </div>

          {/* 備註 */}
          {listing.note && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {listing.note}
            </p>
          )}

          {/* 裝備素質 */}
          {listing.equipmentStats && Object.keys(listing.equipmentStats).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {listing.equipmentStats.str !== undefined && (
                <span className="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                  STR +{listing.equipmentStats.str}
                </span>
              )}
              {listing.equipmentStats.dex !== undefined && (
                <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                  DEX +{listing.equipmentStats.dex}
                </span>
              )}
              {listing.equipmentStats.int !== undefined && (
                <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                  INT +{listing.equipmentStats.int}
                </span>
              )}
              {listing.equipmentStats.luk !== undefined && (
                <span className="px-1.5 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                  LUK +{listing.equipmentStats.luk}
                </span>
              )}
              {listing.equipmentStats.attack !== undefined && (
                <span className="px-1.5 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                  ATK +{listing.equipmentStats.attack}
                </span>
              )}
              {listing.equipmentStats.magic !== undefined && (
                <span className="px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                  MAG +{listing.equipmentStats.magic}
                </span>
              )}
              {listing.equipmentStats.slots !== undefined && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                  Slots: {listing.equipmentStats.slots}
                </span>
              )}
              {/* 自訂屬性 */}
              {listing.equipmentStats.custom?.map((stat, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded"
                >
                  {stat.name}: {stat.value}
                </span>
              ))}
            </div>
          )}

          {/* 聯絡資訊 */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {listing.discordUsername}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-gray-600 dark:text-gray-400 truncate">
                {listing.characterName}
              </span>
            </div>
          </div>

          {/* 發布時間和剩餘天數 */}
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>{formatDate(listing.createdAt)}</span>
            <span className={isExpiringSoon ? 'text-orange-500' : ''}>
              {t('trade.expiresIn', { days: daysRemaining })}
            </span>
          </div>
        </div>
      </div>

      {/* 檢舉 Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        listingId={listing.id}
        itemName={listing.itemName}
      />
    </>
  )
})
