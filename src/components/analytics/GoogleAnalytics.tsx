/**
 * Google Analytics 4 元件
 *
 * 負責載入 GA4 追蹤腳本（符合 GDPR 的條件載入）
 * 使用 Next.js Script 元件進行優化
 * 支援開發/生產環境切換
 *
 * 隱私合規：
 * - 只有在使用者明確同意後才載入 GA4
 * - 檢查 localStorage 中的 'analytics-consent' 狀態
 * - 支援即時反應同意狀態變化
 *
 * 使用方式：
 * ```tsx
 * // src/app/layout.tsx
 * import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <head>
 *         <GoogleAnalytics />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   )
 * }
 * ```
 */

'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { apiLogger } from '@/lib/logger'

export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
  const [hasConsent, setHasConsent] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // 標記為客戶端環境
    setIsClient(true)

    // 檢查使用者同意狀態
    const checkConsent = () => {
      const consent = localStorage.getItem('analytics-consent')
      const accepted = consent === 'accepted'
      setHasConsent(accepted)

      // 開發環境下記錄同意狀態
      if (process.env.NODE_ENV !== 'production') {
        apiLogger.info('[GA4] 同意狀態檢查', {
          consent,
          hasConsent: accepted,
          measurementId: measurementId || 'not-set'
        })
      }
    }

    // 初始檢查
    checkConsent()

    // 監聽 storage 事件（其他 tabs 或同頁面的變更）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'analytics-consent') {
        checkConsent()
      }
    }

    // 監聽自訂事件（同頁面的即時變更）
    const handleConsentChange = () => {
      checkConsent()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('storage', handleConsentChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('storage', handleConsentChange)
    }
  }, [measurementId])

  // SSR 時不渲染（避免 hydration mismatch）
  if (!isClient) {
    return null
  }

  // 如果沒有設定 Measurement ID，不載入腳本
  if (!measurementId) {
    return null
  }

  // 如果使用者未同意或拒絕，不載入 GA4
  if (!hasConsent) {
    if (process.env.NODE_ENV !== 'production') {
      apiLogger.info('[GA4] 未取得使用者同意，不載入 GA4 腳本')
    }
    return null
  }

  return (
    <>
      {/* Google Tag (gtag.js) */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />

      {/* GA4 初始化腳本（含隱私增強設定） */}
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
            send_page_view: true,
            anonymize_ip: true,                      // IP 匿名化
            allow_google_signals: false,             // 停用 Google Signals
            allow_ad_personalization_signals: false  // 停用廣告個人化
          });
        `}
      </Script>
    </>
  )
}
