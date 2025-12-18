'use client'

import Script from 'next/script'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false'

/**
 * Google AdSense 腳本載入元件
 *
 * 包含：
 * 1. AdSense 基本腳本 - 用於廣告載入
 * 2. Funding Choices 腳本 - 用於廣告封鎖復原功能
 *
 * 需要在 .env.local 設定 NEXT_PUBLIC_ADSENSE_CLIENT_ID
 */
export function AdSenseScript() {
  // 廣告已關閉或沒有設定 Client ID
  if (!ADS_ENABLED || !ADSENSE_CLIENT_ID) {
    return null
  }

  return (
    <>
      {/* AdSense 基本腳本 */}
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      {/* Funding Choices 腳本 - 廣告封鎖復原 */}
      <Script
        async
        src={`https://fundingchoicesmessages.google.com/i/${ADSENSE_CLIENT_ID}?ers=1`}
        strategy="afterInteractive"
      />
      {/* Funding Choices Signal - 偵測廣告封鎖器 */}
      <Script
        id="funding-choices-signal"
        strategy="afterInteractive"
      >{`(function(){function signalGooglefcPresent(){if(!window.frames['googlefcPresent']){if(document.body){const iframe=document.createElement('iframe');iframe.style='width:0;height:0;border:none;z-index:-1000;left:-1000px;top:-1000px;';iframe.style.display='none';iframe.name='googlefcPresent';document.body.appendChild(iframe);}else{setTimeout(signalGooglefcPresent,0);}}}signalGooglefcPresent();})();`}</Script>
    </>
  )
}
