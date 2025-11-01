'use client'

import { useQuotaStatus } from '@/hooks/useQuotaStatus'
import { QuotaServiceCard } from './QuotaServiceCard'

/**
 * 免費額度監控儀表板元件
 *
 * 顯示 Redis、Vercel Functions 和 Supabase 的使用量
 */
export function FreeQuotaCard() {
  const { quotas, isLoading, error, refetch } = useQuotaStatus()

  // 載入狀態
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-40 bg-gray-200 rounded" />
            <div className="h-40 bg-gray-200 rounded" />
            <div className="h-40 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-600 mt-0.5"
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
            <h3 className="font-semibold text-red-900">載入失敗</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={refetch}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              重試
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 無資料
  if (!quotas) {
    return null
  }

  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">免費額度監控</h2>
          <p className="text-sm text-gray-500 mt-1">
            最後更新:{' '}
            {new Date(quotas.lastUpdated).toLocaleTimeString('zh-TW', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          aria-label="刷新額度資訊"
        >
          <svg
            className="w-4 h-4"
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
          刷新
        </button>
      </div>

      {/* 三個服務卡片（並排） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuotaServiceCard
          name="Redis (Upstash)"
          quota={quotas.redis}
          icon={
            <svg
              className="w-6 h-6 text-red-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0L1.75 4.8v14.4L12 24l10.25-4.8V4.8L12 0zm7.4 17.2l-7.4 3.4-7.4-3.4V6.8l7.4-3.4 7.4 3.4v10.4z" />
            </svg>
          }
        />
        <QuotaServiceCard
          name="Vercel Functions"
          quota={quotas.vercel}
          icon={
            <svg
              className="w-6 h-6 text-black"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0L24 24H0L12 0z" />
            </svg>
          }
        />
        <QuotaServiceCard
          name="Supabase"
          quota={quotas.supabase}
          icon={
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
          }
        />
      </div>

      {/* 說明文字 */}
      <div className="mt-4 text-xs text-gray-500 border-t pt-4">
        <p>
          💡 提示：額度使用量每 5 分鐘自動更新一次。Vercel Functions
          的使用量因 API 限制無法即時查詢。
        </p>
      </div>
    </div>
  )
}
