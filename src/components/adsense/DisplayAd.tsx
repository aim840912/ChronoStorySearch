'use client'

import { useEffect, useRef } from 'react'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const DISPLAY_SLOT = process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false'
const IS_DEV = process.env.NODE_ENV === 'development'

interface DisplayAdProps {
  className?: string
}

/**
 * 展示廣告元件（Display Ad）
 *
 * 橫幅式廣告，適合放在內容區塊之間的分界處。
 * 開發模式下顯示模擬框架。
 */
export function DisplayAd({ className = '' }: DisplayAdProps) {
  const initialized = useRef(false)

  useEffect(() => {
    if (IS_DEV) return
    if (!ADS_ENABLED || !ADSENSE_CLIENT_ID || !DISPLAY_SLOT) return
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
      <div className={`mx-auto mt-6 sm:mt-8 ${className}`}>
        <div className="flex h-[90px] items-center justify-center rounded-lg border-2 border-dashed border-purple-500/50 bg-purple-500/5">
          <span className="text-xs text-purple-600 dark:text-purple-400">
            Ad: Display ({DISPLAY_SLOT || 'no slot'}) — 區塊分界橫幅
          </span>
        </div>
      </div>
    )
  }

  if (!ADSENSE_CLIENT_ID || !DISPLAY_SLOT) return null

  return (
    <div className={`mx-auto mt-6 sm:mt-8 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={DISPLAY_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
