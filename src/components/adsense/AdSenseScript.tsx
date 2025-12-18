'use client'

import Script from 'next/script'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false'

/**
 * Google AdSense 腳本載入元件
 *
 * 用於 AdSense 驗證和廣告載入
 * 需要在 .env.local 設定 NEXT_PUBLIC_ADSENSE_CLIENT_ID
 */
export function AdSenseScript() {
  // 廣告已關閉或沒有設定 Client ID
  if (!ADS_ENABLED || !ADSENSE_CLIENT_ID) {
    return null
  }

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  )
}
