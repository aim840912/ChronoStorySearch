/**
 * 管理員系統設定頁面 - 錯誤處理
 *
 * Next.js 會在 Server Component 發生錯誤時自動顯示此元件
 *
 * 使用時機：
 * - 伺服器端驗證失敗
 * - 資料庫查詢失敗
 * - 其他伺服器端錯誤
 */

'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // 記錄錯誤到 console（生產環境應使用錯誤追蹤服務）
    console.error('Admin page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        {/* 錯誤圖示 */}
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-red-500"
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
        </div>

        {/* 錯誤標題 */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">發生錯誤</h1>

        {/* 錯誤訊息 */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">載入管理員頁面時發生錯誤</p>

        {/* 操作按鈕 */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            重試
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            返回首頁
          </button>
        </div>
      </div>
    </div>
  )
}
