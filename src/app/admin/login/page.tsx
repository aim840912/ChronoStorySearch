/**
 * 管理員專用登入頁面
 *
 * 路徑：/admin/login
 * 功能：只有此頁面提供 Discord OAuth 登入
 * 權限：登入後會在 OAuth callback 驗證 Discord 伺服器角色
 */
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminLoginPage() {
  const { user, loading, login } = useAuth()
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 如果已登入，重導向至首頁
  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  // 檢查 URL 參數中的錯誤訊息
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const message = params.get('message')

    if (error === 'unauthorized' && message === 'admin_only') {
      setErrorMessage('登入失敗：您沒有管理員權限')
      // 清除 URL 參數
      window.history.replaceState({}, '', '/admin/login')
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-gray-600 dark:text-gray-400">載入中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        {/* Logo 或標題 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            ChronoStory Search
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            管理員登入
          </p>
        </div>

        {/* 錯誤訊息 */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {errorMessage}
            </p>
          </div>
        )}

        {/* 登入按鈕 */}
        <button
          onClick={login}
          className="w-full p-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-3 bg-[#5865F2] text-white hover:bg-[#4752C4] shadow-md hover:shadow-lg"
          aria-label="使用 Discord 登入"
        >
          {/* Discord Icon */}
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <span>使用 Discord 登入</span>
        </button>

        {/* 說明文字 */}
        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          此頁面僅供管理員使用<br/>
          登入後將自動驗證您的管理員權限
        </p>
      </div>
    </div>
  )
}
