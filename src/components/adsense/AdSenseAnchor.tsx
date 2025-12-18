'use client'

import { useEffect, useRef } from 'react'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const ADSENSE_ANCHOR_SLOT = process.env.NEXT_PUBLIC_ADSENSE_ANCHOR_SLOT
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false'

interface AdSenseAnchorProps {
  className?: string
}

/**
 * Anchor 廣告元件（水平橫幅）
 *
 * 用於 Modal 頂部的固定位置廣告
 * - 開發環境：顯示佔位區塊
 * - 生產環境：沒有設定 slot ID 時返回 null
 */
export function AdSenseAnchor({ className }: AdSenseAnchorProps) {
  const isAdLoaded = useRef(false)

  useEffect(() => {
    // 開發環境或沒有設定 slot ID 時，不載入廣告
    if (process.env.NODE_ENV === 'development') return
    if (!ADSENSE_CLIENT_ID || !ADSENSE_ANCHOR_SLOT) return
    if (isAdLoaded.current) return

    try {
      // @ts-expect-error - adsbygoogle is a global variable injected by AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({})
      isAdLoaded.current = true
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [])

  // 廣告已關閉
  if (!ADS_ENABLED) return null

  // 開發環境：顯示佔位區塊
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className={className}>
        <div className="flex h-[50px] items-center justify-center rounded-lg border border-dashed border-gray-300/80 bg-white/60 text-xs text-gray-400 backdrop-blur-sm dark:border-gray-600/80 dark:bg-gray-800/60 dark:text-gray-500">
          <span className="mr-2 rounded bg-gray-200/80 px-1.5 py-0.5 dark:bg-gray-700/80">Ad</span>
          <span>錨定廣告預覽 (320×50)</span>
        </div>
      </div>
    )
  }

  // 生產環境：沒有設定時不渲染，不影響版面
  if (!ADSENSE_CLIENT_ID || !ADSENSE_ANCHOR_SLOT) {
    return null
  }

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={ADSENSE_ANCHOR_SLOT}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  )
}
