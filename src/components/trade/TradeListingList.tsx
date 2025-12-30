'use client'

import { memo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { TradeListingCard } from './TradeListingCard'
import type { TradeListingWithFavorite } from '@/types/trade'

interface TradeListingListProps {
  listings: TradeListingWithFavorite[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onEdit?: (listing: TradeListingWithFavorite) => void
  onDelete?: (id: string) => void
  onMarkComplete?: (id: string) => void
  onFavoriteToggle?: (id: string, isFavorited: boolean) => void
  emptyMessage?: string
}

/**
 * 交易刊登列表
 */
export const TradeListingList = memo(function TradeListingList({
  listings,
  isLoading,
  hasMore,
  onLoadMore,
  onEdit,
  onDelete,
  onMarkComplete,
  onFavoriteToggle,
  emptyMessage,
}: TradeListingListProps) {
  const { t } = useLanguage()

  if (isLoading && listings.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
          {emptyMessage || t('trade.noListings')}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('trade.noListingsHint')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 刊登列表 */}
      <div className="flex flex-col gap-1">
        {listings.map((listing) => (
          <TradeListingCard
            key={listing.id}
            listing={listing}
            onEdit={onEdit}
            onDelete={onDelete}
            onMarkComplete={onMarkComplete}
            onFavoriteToggle={onFavoriteToggle}
          />
        ))}
      </div>

      {/* 載入更多 */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
          >
            {isLoading ? t('common.loading') : t('common.loadMore')}
          </button>
        </div>
      )}
    </div>
  )
})
