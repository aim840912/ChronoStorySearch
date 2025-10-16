'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          {/* 錯誤圖示 */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full">
              <svg
                className="w-10 h-10 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* 錯誤標題 */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            糟糕！出現錯誤了
          </h1>

          {/* 錯誤訊息 */}
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            載入角色資料時發生錯誤
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 font-mono">
            {error.message}
          </p>

          {/* 重試按鈕 */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={reset}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              重試
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors duration-200"
            >
              返回首頁
            </button>
          </div>

          {/* 額外資訊 */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              如果問題持續發生，請聯繫技術支援
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
