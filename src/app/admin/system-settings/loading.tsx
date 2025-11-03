/**
 * 管理員系統設定頁面 - Loading 狀態
 *
 * Next.js 會在 Server Component 載入時自動顯示此元件
 *
 * 使用時機：
 * - 伺服器端驗證 session
 * - 伺服器端檢查管理員權限
 * - 伺服器端載入資料
 */

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* 載入動畫 */}
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>

        {/* 載入文字 */}
        <p className="mt-4 text-gray-600 dark:text-gray-400">載入中...</p>
      </div>
    </div>
  )
}
