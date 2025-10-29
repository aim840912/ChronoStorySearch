/**
 * 管理員系統設定頁面
 *
 * 路由：/admin/system-settings
 *
 * 功能：
 * - 檢查管理員權限
 * - 顯示系統設定卡片（交易系統、維護模式）
 * - 提供即時更新功能
 *
 * 權限：僅管理員（Admin/Moderator）可存取
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { TradingSystemCard } from '@/components/admin/TradingSystemCard'
import { MaintenanceModeCard } from '@/components/admin/MaintenanceModeCard'
import { clientLogger } from '@/lib/logger'

export default function SystemSettingsPage() {
  const router = useRouter()
  const { user, loading: isAuthLoading } = useAuth()
  const { t } = useLanguage()
  const { settings, isLoading, isUpdating, error, updateSetting } = useSystemSettings()

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true)

  // 檢查管理員權限
  useEffect(() => {
    async function checkAdminStatus() {
      // 等待認證完成
      if (isAuthLoading) return

      // 未登入，重導向到首頁
      if (!user) {
        clientLogger.warn('未登入使用者嘗試存取管理員頁面')
        router.push('/')
        return
      }

      try {
        // 呼叫 API 檢查角色
        const response = await fetch('/api/auth/me/roles', {
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error('Failed to check admin status')
        }

        const data = await response.json()

        if (data.success && data.data.isAdmin) {
          setIsAdmin(true)
          clientLogger.info('管理員權限確認', { userId: user.id })
        } else {
          setIsAdmin(false)
          clientLogger.warn('非管理員嘗試存取管理員頁面', { userId: user.id })
          // 延遲重導向，讓使用者看到錯誤訊息
          setTimeout(() => router.push('/'), 2000)
        }
      } catch (err) {
        clientLogger.error('檢查管理員權限失敗', { error: err })
        setIsAdmin(false)
        setTimeout(() => router.push('/'), 2000)
      } finally {
        setIsCheckingAdmin(false)
      }
    }

    checkAdminStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthLoading]) // 移除 router 依賴，避免循環

  // 處理交易系統開關切換
  const handleToggleTrading = async (enabled: boolean) => {
    try {
      await updateSetting('trading_system_enabled', enabled)
      clientLogger.info('交易系統狀態已更新', { enabled })
    } catch (err) {
      clientLogger.error('更新交易系統狀態失敗', { error: err })
    }
  }

  // 處理維護模式開關切換
  const handleToggleMaintenance = async (enabled: boolean) => {
    try {
      await updateSetting('maintenance_mode', enabled)
      clientLogger.info('維護模式狀態已更新', { enabled })
    } catch (err) {
      clientLogger.error('更新維護模式狀態失敗', { error: err })
    }
  }

  // 處理維護訊息更新
  const handleUpdateMaintenanceMessage = async (message: string) => {
    try {
      await updateSetting('maintenance_message', message)
      clientLogger.info('維護訊息已更新', { messageLength: message.length })
    } catch (err) {
      clientLogger.error('更新維護訊息失敗', { error: err })
    }
  }

  // 獲取設定值的輔助函數
  const getSettingValue = (key: string): boolean | string | undefined => {
    const setting = settings.find((s) => s.key === key)
    return setting?.value
  }

  const getSettingUpdatedAt = (key: string): string => {
    const setting = settings.find((s) => s.key === key)
    return setting?.updated_at || new Date().toISOString()
  }

  // 載入中或檢查權限中
  if (isAuthLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {t('common.loading')}
          </p>
        </div>
      </div>
    )
  }

  // 非管理員
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('admin.accessDenied')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('admin.accessDeniedMessage')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            {t('admin.redirecting')}
          </p>
        </div>
      </div>
    )
  }

  // 載入系統設定失敗
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('admin.loadError')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  // 管理員頁面主內容
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 頁面標題 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('admin.systemSettings.title')}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('admin.systemSettings.subtitle')}
              </p>
            </div>

            {/* 返回首頁按鈕 */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              {t('common.backToHome')}
            </button>
          </div>
        </div>
      </div>

      {/* 設定卡片區域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {t('admin.loadingSettings')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 交易系統卡片 */}
            <TradingSystemCard
              enabled={getSettingValue('trading_system_enabled') === true}
              updatedAt={getSettingUpdatedAt('trading_system_enabled')}
              onToggle={handleToggleTrading}
              isUpdating={isUpdating}
            />

            {/* 維護模式卡片 */}
            <MaintenanceModeCard
              enabled={getSettingValue('maintenance_mode') === true}
              message={(getSettingValue('maintenance_message') as string) || ''}
              updatedAt={getSettingUpdatedAt('maintenance_mode')}
              onToggle={handleToggleMaintenance}
              onUpdateMessage={handleUpdateMaintenanceMessage}
              isUpdating={isUpdating}
            />
          </div>
        )}
      </div>
    </div>
  )
}
