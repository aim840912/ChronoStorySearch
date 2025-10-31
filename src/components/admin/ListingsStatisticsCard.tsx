/**
 * 刊登統計卡片
 *
 * 功能：
 * - 顯示總活躍刊登數
 * - 顯示按狀態分類統計
 * - 顯示按交易類型分類統計
 * - 顯示最近 24 小時新增數量
 * - 手動刷新功能
 * - 自動刷新（30秒）
 *
 * 使用範例：
 * ```tsx
 * <ListingsStatisticsCard />
 * ```
 */

'use client'

import { useListingsStatistics } from '@/hooks/useListingsStatistics'
import { useLanguage } from '@/contexts/LanguageContext'

export function ListingsStatisticsCard() {
  const { t } = useLanguage()
  const { statistics, isLoading, error, refetch } = useListingsStatistics()

  // 格式化時間
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      {/* 標題區域 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {/* 圖示 */}
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>

            {/* 標題和說明 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.listingsStatistics.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('admin.listingsStatistics.description')}
              </p>
            </div>
          </div>
        </div>

        {/* 刷新按鈕 */}
        <button
          onClick={refetch}
          disabled={isLoading}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          title={t('admin.listingsStatistics.refreshTooltip')}
        >
          <svg
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
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
          {t('admin.listingsStatistics.refresh')}
        </button>
      </div>

      {/* 載入中狀態 */}
      {isLoading && !statistics && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <svg
              className="animate-spin w-5 h-5"
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
            <span>{t('admin.listingsStatistics.loading')}</span>
          </div>
        </div>
      )}

      {/* 錯誤狀態 */}
      {error && !statistics && (
        <div className="py-8">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0"
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
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  {t('admin.listingsStatistics.loadError')}
                </p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 統計資料顯示 */}
      {statistics && (
        <div className="space-y-4">
          {/* 統計資料 3 欄網格 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. 總活躍刊登數 */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <p className="text-xs font-medium text-indigo-800 dark:text-indigo-300 mb-1">
                  {t('admin.listingsStatistics.totalActive')}
                </p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {statistics.totalActive.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 2. 最近 24 小時新增 */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
                  {t('admin.listingsStatistics.last24Hours')}
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {statistics.last24Hours.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 3. 交易類型統計 */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                </div>
                <p className="text-xs font-medium text-purple-800 dark:text-purple-300 mb-2">
                  {t('admin.listingsStatistics.byTradeType')}
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-700 dark:text-purple-300">{t('admin.listingsStatistics.buy')}</span>
                    <span className="font-semibold text-purple-900 dark:text-purple-100">
                      {statistics.byTradeType.buy}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-700 dark:text-purple-300">{t('admin.listingsStatistics.sell')}</span>
                    <span className="font-semibold text-purple-900 dark:text-purple-100">
                      {statistics.byTradeType.sell}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-700 dark:text-purple-300">{t('admin.listingsStatistics.exchange')}</span>
                    <span className="font-semibold text-purple-900 dark:text-purple-100">
                      {statistics.byTradeType.exchange}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 按狀態分類統計 */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('admin.listingsStatistics.byStatus')}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Active */}
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('admin.listingsStatistics.active')}
                </p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {statistics.byStatus.active}
                </p>
              </div>

              {/* Completed */}
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('admin.listingsStatistics.completed')}
                </p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {statistics.byStatus.completed}
                </p>
              </div>

              {/* Expired */}
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('admin.listingsStatistics.expired')}
                </p>
                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {statistics.byStatus.expired}
                </p>
              </div>

              {/* Cancelled */}
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('admin.listingsStatistics.cancelled')}
                </p>
                <p className="text-lg font-bold text-gray-600 dark:text-gray-400">
                  {statistics.byStatus.cancelled}
                </p>
              </div>
            </div>
          </div>

          {/* 最後更新時間 */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span>{t('admin.listingsStatistics.lastUpdated')}{formatTime(statistics.timestamp)}</span>
            <span className="text-gray-400 dark:text-gray-500">
              {t('admin.listingsStatistics.autoRefresh')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
