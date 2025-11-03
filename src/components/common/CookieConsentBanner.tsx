'use client'

import { useEffect, useState } from 'react'
import CookieConsent from 'react-cookie-consent'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * Cookie Consent Banner 元件
 *
 * 功能：
 * - 符合 GDPR 要求的 Cookie 同意橫幅
 * - 支援繁體中文/英文雙語
 * - 深色模式支援
 * - 儲存同意狀態到 localStorage
 * - 提供明確的「接受」和「拒絕」選項
 *
 * 同意狀態：
 * - localStorage key: 'analytics-consent'
 * - 值: 'accepted' | 'declined' | null (未選擇)
 *
 * 整合：
 * - GoogleAnalytics 元件會檢查此狀態決定是否載入 GA4
 */
export function CookieConsentBanner() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  // 避免 hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  /**
   * 處理接受 Cookie
   */
  const handleAccept = () => {
    localStorage.setItem('analytics-consent', 'accepted')
    // 觸發 storage 事件通知其他元件
    window.dispatchEvent(new Event('storage'))

    // 重新載入頁面以載入 GA4（簡單可靠的方式）
    window.location.reload()
  }

  /**
   * 處理拒絕 Cookie
   */
  const handleDecline = () => {
    localStorage.setItem('analytics-consent', 'declined')
    window.dispatchEvent(new Event('storage'))
  }

  return (
    <CookieConsent
      location="bottom"
      cookieName="CookieConsentBanner"
      expires={365}
      onAccept={handleAccept}
      onDecline={handleDecline}
      enableDeclineButton
      buttonText={t('cookie.accept')}
      declineButtonText={t('cookie.decline')}
      style={{
        background: 'rgba(31, 41, 55, 0.95)', // dark:bg-gray-800 with opacity
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(75, 85, 99, 0.3)',
        padding: '1rem 0',
        alignItems: 'center',
        zIndex: 9999
      }}
      buttonStyle={{
        background: '#3b82f6', // bg-blue-500
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: '500',
        borderRadius: '0.5rem',
        padding: '0.5rem 1.5rem',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
      }}
      declineButtonStyle={{
        background: 'transparent',
        color: '#9ca3af', // text-gray-400
        fontSize: '14px',
        fontWeight: '500',
        borderRadius: '0.5rem',
        padding: '0.5rem 1.5rem',
        border: '1px solid rgba(156, 163, 175, 0.3)',
        cursor: 'pointer',
        marginRight: '1rem',
        transition: 'all 0.2s'
      }}
      contentStyle={{
        flex: '1 1 auto',
        margin: '0 1rem',
        maxWidth: '800px'
      }}
    >
      <div className="text-sm text-gray-200">
        <p className="mb-2">
          <strong>{t('cookie.title')}</strong>
        </p>
        <p className="text-gray-300">
          {t('cookie.message')}
        </p>
      </div>
    </CookieConsent>
  )
}
