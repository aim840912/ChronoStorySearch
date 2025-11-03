'use client'

import { useState, useEffect } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 隱私設定 Modal
 *
 * 功能：
 * - 顯示目前的 Cookie 同意狀態
 * - 允許使用者修改同意設定
 * - 說明收集的資料類型
 * - 提供撤回同意的選項
 *
 * 符合 GDPR 要求：
 * - 使用者可隨時撤回同意
 * - 清楚說明資料用途
 * - 提供簡單的管理介面
 */

interface PrivacySettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PrivacySettingsModal({ isOpen, onClose }: PrivacySettingsModalProps) {
  const { t } = useLanguage()
  const [consentStatus, setConsentStatus] = useState<'accepted' | 'declined' | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 載入目前的同意狀態
  useEffect(() => {
    if (isOpen) {
      const consent = localStorage.getItem('analytics-consent')
      if (consent === 'accepted') {
        setConsentStatus('accepted')
      } else if (consent === 'declined') {
        setConsentStatus('declined')
      } else {
        setConsentStatus(null)
      }
    }
  }, [isOpen])

  /**
   * 處理接受分析 Cookie
   */
  const handleAccept = () => {
    setIsLoading(true)
    localStorage.setItem('analytics-consent', 'accepted')
    window.dispatchEvent(new Event('storage'))
    setConsentStatus('accepted')

    // 重新載入頁面以載入 GA4
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  /**
   * 處理拒絕/撤回同意
   */
  const handleDecline = () => {
    setIsLoading(true)
    localStorage.setItem('analytics-consent', 'declined')
    window.dispatchEvent(new Event('storage'))
    setConsentStatus('declined')

    // 重新載入頁面以移除 GA4
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {t('privacy.title')}
        </h2>

        {/* 目前狀態 */}
        <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('privacy.currentStatus')}:
          </p>
          <div className="flex items-center gap-2">
            {consentStatus === 'accepted' && (
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-sm font-medium">
                ✓ {t('privacy.statusAccepted')}
              </span>
            )}
            {consentStatus === 'declined' && (
              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full text-sm font-medium">
                ✗ {t('privacy.statusDeclined')}
              </span>
            )}
            {consentStatus === null && (
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-sm font-medium">
                ? {t('privacy.statusNotSet')}
              </span>
            )}
          </div>
        </div>

        {/* 說明 */}
        <div className="mb-6 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('privacy.whatWeCollect')}
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>{t('privacy.collect.pageViews')}</li>
              <li>{t('privacy.collect.interactions')}</li>
              <li>{t('privacy.collect.deviceInfo')}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('privacy.whatWeDoNotCollect')}
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>{t('privacy.notCollect.personalInfo')}</li>
              <li>{t('privacy.notCollect.passwords')}</li>
              <li>{t('privacy.notCollect.financial')}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('privacy.purpose')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('privacy.purposeDescription')}
            </p>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3 flex-wrap">
          {consentStatus !== 'accepted' && (
            <button
              onClick={handleAccept}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg
                         font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('privacy.acceptButton')}
            </button>
          )}

          {consentStatus === 'accepted' && (
            <button
              onClick={handleDecline}
              disabled={isLoading}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg
                         font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('privacy.revokeButton')}
            </button>
          )}

          {(consentStatus === null || consentStatus === 'declined') && (
            <button
              onClick={handleDecline}
              disabled={isLoading}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg
                         font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('privacy.declineButton')}
            </button>
          )}

          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50
                       dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg
                       font-medium transition-colors"
          >
            {t('common.close')}
          </button>
        </div>

        {/* 提示訊息 */}
        {isLoading && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-400">
              {t('privacy.reloading')}...
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  )
}
