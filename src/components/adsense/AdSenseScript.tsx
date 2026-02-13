'use client'

import { useEffect } from 'react'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false'

/**
 * Google AdSense 腳本載入元件
 *
 * 包含：
 * 1. AdSense 基本腳本 - 用於廣告載入
 * 2. Funding Choices 腳本 - 用於廣告封鎖復原功能
 *
 * 使用 useEffect 動態載入，避免 Next.js Script 元件
 * 添加 data-nscript 屬性導致 AdSense 警告
 *
 * 需要在 .env.local 設定 NEXT_PUBLIC_ADSENSE_CLIENT_ID
 */
export function AdSenseScript() {
  useEffect(() => {
    if (!ADS_ENABLED || !ADSENSE_CLIENT_ID) return

    // 防止重複載入（用 src 屬性檢查，避免在 AdSense script 上加自訂 data-* 屬性觸發警告）
    if (document.querySelector('script[src*="adsbygoogle"]')) return

    // AdSense 基本腳本
    const adsenseScript = document.createElement('script')
    adsenseScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`
    adsenseScript.async = true
    adsenseScript.crossOrigin = 'anonymous'
    document.head.appendChild(adsenseScript)

    // Funding Choices 腳本 - 廣告封鎖復原
    const fcScript = document.createElement('script')
    fcScript.src = `https://fundingchoicesmessages.google.com/i/${ADSENSE_CLIENT_ID}?ers=1`
    fcScript.async = true
    document.head.appendChild(fcScript)

    // Funding Choices Signal - 偵測廣告封鎖器
    const signalScript = document.createElement('script')
    signalScript.textContent = `(function(){function signalGooglefcPresent(){if(!window.frames['googlefcPresent']){if(document.body){const iframe=document.createElement('iframe');iframe.style='width:0;height:0;border:none;z-index:-1000;left:-1000px;top:-1000px;';iframe.style.display='none';iframe.name='googlefcPresent';document.body.appendChild(iframe);}else{setTimeout(signalGooglefcPresent,0);}}}signalGooglefcPresent();})();`
    document.head.appendChild(signalScript)
  }, [])

  return null
}
