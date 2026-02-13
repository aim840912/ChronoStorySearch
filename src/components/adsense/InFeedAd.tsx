'use client'

import { useEffect, useRef } from 'react'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const INFEED_SLOT = process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false'
const IS_DEV = process.env.NODE_ENV === 'development'

interface InFeedAdProps {
  className?: string
}

/**
 * 動態內廣告元件（In-Feed Ad）
 *
 * 用於卡片列表中穿插顯示，融入卡片網格佈局。
 * 每個廣告單元只初始化一次，避免重複 push。
 * 開發模式下顯示模擬框架。
 */
export function InFeedAd({ className = '' }: InFeedAdProps) {
  const adRef = useRef<HTMLModElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (IS_DEV) return
    if (!ADS_ENABLED || !ADSENSE_CLIENT_ID || !INFEED_SLOT) return
    if (initialized.current) return

    try {
      const adsbygoogle = (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle
      if (adsbygoogle) {
        adsbygoogle.push({})
        initialized.current = true
      }
    } catch {
      // AdSense 尚未載入或被阻擋
    }
  }, [])

  if (!ADS_ENABLED) return null

  if (IS_DEV) {
    return (
      <div
        className={`min-h-[140px] flex items-center justify-center rounded-lg border-2 border-dashed border-yellow-500/50 bg-yellow-500/5 ${className}`}
      >
        <span className="text-xs text-yellow-600 dark:text-yellow-400">
          Ad: In-Feed ({INFEED_SLOT || 'no slot'})
        </span>
      </div>
    )
  }

  if (!ADSENSE_CLIENT_ID || !INFEED_SLOT) return null

  return (
    <div className={`min-h-[140px] flex items-center justify-center ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key="-6t+ed+2i-1n-4w"
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={INFEED_SLOT}
      />
    </div>
  )
}
