'use client'

import { useEffect, useRef } from 'react'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const MULTIPLEX_SLOT = process.env.NEXT_PUBLIC_ADSENSE_MULTIPLEX_SLOT
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false'
const IS_DEV = process.env.NODE_ENV === 'development'

interface MultiplexAdProps {
  className?: string
}

/**
 * Multiplex 廣告元件
 *
 * 格狀多則廣告，適合放在頁面底部或列表結尾。
 * 外觀類似「推薦內容」區塊。
 * 開發模式下顯示模擬框架。
 */
export function MultiplexAd({ className = '' }: MultiplexAdProps) {
  const initialized = useRef(false)

  useEffect(() => {
    if (IS_DEV) return
    if (!ADS_ENABLED || !ADSENSE_CLIENT_ID || !MULTIPLEX_SLOT) return
    if (initialized.current) return

    try {
      ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
        (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || []).push({})
      initialized.current = true
    } catch {
      // AdSense 尚未載入或被阻擋
    }
  }, [])

  if (!ADS_ENABLED) return null

  if (IS_DEV) {
    return (
      <div className={`mx-auto mt-8 ${className}`}>
        <div className="flex h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-blue-500/50 bg-blue-500/5">
          <div className="text-center">
            <span className="text-xs text-blue-600 dark:text-blue-400">
              Ad: Multiplex ({MULTIPLEX_SLOT || 'no slot'})
            </span>
            <div className="mt-2 grid grid-cols-4 gap-1 px-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-6 w-10 rounded bg-blue-500/10"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!ADSENSE_CLIENT_ID || !MULTIPLEX_SLOT) return null

  return (
    <div className={`mx-auto mt-8 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format="autorelaxed"
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={MULTIPLEX_SLOT}
      />
    </div>
  )
}
