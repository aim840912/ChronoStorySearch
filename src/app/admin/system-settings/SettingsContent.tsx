/**
 * 管理員系統設定頁面 - Client Component（互動內容）
 *
 * 功能：
 * - 接收 Server Component 傳遞的系統設定
 * - 處理所有使用者互動（Toggle, Input, Button）
 * - 呼叫 API 更新設定
 * - 顯示 Toast 通知
 *
 * 架構：Server Component (page.tsx) 負責認證和資料載入
 *       Client Component (SettingsContent.tsx) 負責互動和更新
 */

'use client'

import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { TradingSystemCard } from '@/components/admin/TradingSystemCard'
import { MaintenanceModeCard } from '@/components/admin/MaintenanceModeCard'
import { MaxListingsCard } from '@/components/admin/MaxListingsCard'
import { ListingsStatisticsCard } from '@/components/admin/ListingsStatisticsCard'
import { ListingExpirationCard } from '@/components/admin/ListingExpirationCard'
import { FreeQuotaCard } from '@/components/admin/FreeQuotaCard'
import { LoginBannerCard } from '@/components/admin/LoginBannerCard'
import { clientLogger } from '@/lib/logger'

export default function SettingsContent() {
  const router = useRouter()
  const { t } = useLanguage()
  const { settings, isLoading, isUpdating, error, updateSetting } = useSystemSettings()

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

  // 處理登入使用者公告開關切換
  const handleToggleLoginBanner = async (enabled: boolean) => {
    try {
      await updateSetting('login_banner_enabled', enabled)
      clientLogger.info('登入使用者公告狀態已更新', { enabled })
    } catch (err) {
      clientLogger.error('更新登入使用者公告狀態失敗', { error: err })
    }
  }

  // 處理登入使用者公告訊息更新
  const handleUpdateLoginBannerMessage = async (message: string) => {
    try {
      await updateSetting('login_banner_message', message)
      clientLogger.info('登入使用者公告訊息已更新', { messageLength: message.length })
    } catch (err) {
      clientLogger.error('更新登入使用者公告訊息失敗', { error: err })
    }
  }

  // 處理最大刊登數量更新
  const handleUpdateMaxListings = async (value: number) => {
    try {
      await updateSetting('max_active_listings_per_user', value)
      clientLogger.info('最大刊登數量已更新', { value })
    } catch (err) {
      clientLogger.error('更新最大刊登數量失敗', { error: err })
    }
  }

  // 處理刊登過期天數更新
  const handleUpdateExpirationDays = async (value: number) => {
    try {
      await updateSetting('listing_expiration_days', value)
      clientLogger.info('刊登過期天數已更新', { value })
    } catch (err) {
      clientLogger.error('更新刊登過期天數失敗', { error: err })
    }
  }

  // 獲取設定值的輔助函數
  const getSettingValue = (key: string): boolean | string | number | undefined => {
    const setting = settings.find((s) => s.key === key)
    return setting?.value
  }

  const getSettingUpdatedAt = (key: string): string => {
    const setting = settings.find((s) => s.key === key)
    return setting?.updated_at || new Date().toISOString()
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
          <div className="space-y-6">
            {/* 免費額度監控卡片 - 全寬顯示 */}
            <FreeQuotaCard />

            {/* 刊登統計卡片 - 全寬顯示 */}
            <ListingsStatisticsCard />

            {/* 系統設定卡片 - 2 欄佈局 */}
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

              {/* 登入使用者公告卡片 */}
              <LoginBannerCard
                enabled={getSettingValue('login_banner_enabled') === true}
                message={(getSettingValue('login_banner_message') as string) || ''}
                updatedAt={getSettingUpdatedAt('login_banner_enabled')}
                onToggle={handleToggleLoginBanner}
                onUpdateMessage={handleUpdateLoginBannerMessage}
                isUpdating={isUpdating}
              />

              {/* 最大刊登數量卡片 */}
              <MaxListingsCard
                maxListings={Number(getSettingValue('max_active_listings_per_user')) || 5}
                updatedAt={getSettingUpdatedAt('max_active_listings_per_user')}
                onUpdate={handleUpdateMaxListings}
                isUpdating={isUpdating}
              />

              {/* 刊登過期天數卡片 */}
              <ListingExpirationCard
                expirationDays={Number(getSettingValue('listing_expiration_days')) || 30}
                updatedAt={getSettingUpdatedAt('listing_expiration_days')}
                onUpdate={handleUpdateExpirationDays}
                isUpdating={isUpdating}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
