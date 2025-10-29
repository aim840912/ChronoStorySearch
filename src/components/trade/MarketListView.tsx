'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { MarketListItem } from './MarketListItem'
import type { ListingWithUserInfo, Pagination } from '@/types'

interface MarketListViewProps {
  listings: ListingWithUserInfo[]
  pagination: Pagination | null
  isLoading: boolean
  error: string | null
  isRefreshing?: boolean
  refreshError?: string | null
  onListingClick: (listingId: string) => void
  onPageChange: (page: number) => void
  onRefresh?: () => void
}

/**
 * 市場刊登列表視圖
 *
 * 功能：
 * - 顯示市場刊登列表
 * - 支援分頁控制
 * - 處理載入和錯誤狀態
 * - 點擊項目打開詳情
 *
 * 設計：
 * - 列表式 Layout（類似 MarketBrowserModal）
 * - 響應式設計
 * - 深色模式支援
 */
export function MarketListView({
  listings,
  pagination,
  isLoading,
  error,
  isRefreshing = false,
  refreshError = null,
  onListingClick,
  onPageChange,
  onRefresh
}: MarketListViewProps) {
  const { t } = useLanguage()

  // 載入狀態
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('market.loading')}</p>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-4 text-gray-900 dark:text-gray-100 font-medium">
            {t('market.loadError')}
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  // 空狀態
  if (listings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="mt-4 text-gray-900 dark:text-gray-100 font-medium">
            {t('market.noListings')}
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('common.loading') === t('common.loading')
              ? '嘗試調整篩選條件或稍後再試'
              : 'Try adjusting your filters or check back later'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* 列表頭部 - 顯示總數和刷新按鈕 */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('market.totalListings').replace('{count}', pagination?.total.toString() || listings.length.toString())}
          </p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                isRefreshing
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                  : 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800'
              }`}
              title={isRefreshing ? (t('market.refreshing') || '重新整理中') : (t('market.refresh') || '重新整理')}
            >
              <svg
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">
                {isRefreshing ? (t('market.refreshing') || '重新整理中') : (t('market.refresh') || '重新整理')}
              </span>
            </button>
          )}
        </div>

        {/* 重新整理錯誤提示 */}
        {refreshError && (
          <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <svg
              className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-medium text-red-800 dark:text-red-300">
                {t('market.refreshError') || '重新整理失敗'}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                {refreshError}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 表格頭部 - 欄位標題 */}
      <div className="grid grid-cols-[70px_50px_120px_1fr_60px_90px] md:grid-cols-[100px_80px_150px_1fr_100px_140px_140px] gap-2 md:gap-4 items-center px-3 md:px-4 py-2 md:py-3 bg-gray-100 dark:bg-gray-900 border-b-2 border-gray-300 dark:border-gray-600">
        <div className="text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('trade.type.label') || '類型'}
        </div>
        <div className="text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('market.item') || '物品'}
        </div>
        <div className="text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('market.itemName') || '名稱'}
        </div>
        <div className="text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('market.itemStats') || '裝備素質'}
        </div>
        <div className="text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('listing.quantity') || '數量'}
        </div>
        <div className="text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('listing.price') || '價格'}
        </div>
        <div className="hidden md:block text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('listing.seller') || '發布者'}
        </div>
      </div>

      {/* 刊登列表 */}
      <div className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
        {listings.map((listing) => (
          <MarketListItem
            key={listing.id}
            listing={listing}
            onClick={() => onListingClick(listing.id)}
          />
        ))}
      </div>

      {/* 分頁控制 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          {/* 上一頁按鈕 */}
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              pagination.page <= 1
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('pagination.previous')}
          </button>

          {/* 頁碼資訊 */}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t('pagination.page')
              .replace('{current}', pagination.page.toString())
              .replace('{total}', pagination.totalPages.toString())}
          </span>

          {/* 下一頁按鈕 */}
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              pagination.page >= pagination.totalPages
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
            }`}
          >
            {t('pagination.next')}
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
