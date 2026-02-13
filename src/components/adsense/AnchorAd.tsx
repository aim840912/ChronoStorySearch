'use client'

import { useEffect, useRef } from 'react'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const ANCHOR_SLOT = process.env.NEXT_PUBLIC_ADSENSE_ANCHOR_SLOT
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false'
const IS_DEV = process.env.NODE_ENV === 'development'

/**
 * 錨點廣告元件（Anchor Ad）
 *
 * 固定在 viewport 底部的小橫幅廣告，使用者可關閉。
 * 全站只需掛載一次（建議放在 layout 的 body 中）。
 * 開發模式下顯示模擬框架。
 */
export function AnchorAd() {
  const initialized = useRef(false)

  useEffect(() => {
    if (IS_DEV) return
    if (!ADS_ENABLED || !ADSENSE_CLIENT_ID || !ANCHOR_SLOT) return
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
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center border-t-2 border-dashed border-green-500/50 bg-green-500/10 backdrop-blur-sm py-2">
        <span className="text-xs text-green-600 dark:text-green-400">
          Ad: Anchor ({ANCHOR_SLOT || 'no slot'}) — 固定在底部，使用者可關閉
        </span>
      </div>
    )
  }

  if (!ADSENSE_CLIENT_ID || !ANCHOR_SLOT) return null

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={ANCHOR_SLOT}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
