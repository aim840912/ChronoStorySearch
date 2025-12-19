'use client'

import { useEffect, useRef } from 'react'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const ADSENSE_MULTIPLEX_SLOT = process.env.NEXT_PUBLIC_ADSENSE_MULTIPLEX_SLOT
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false'

interface AdSenseMultiplexProps {
  className?: string
}

/**
 * Multiplex 多重廣告元件
 *
 * 在列表結束後顯示 4×1 橫向單列廣告
 * - 開發環境：顯示佔位區塊（方便調整位置）
 * - 生產環境：沒有設定 slot ID 時返回 null 不影響版面
 * - 響應式：手機 2 欄，桌面 4 欄
 */
export function AdSenseMultiplex({ className }: AdSenseMultiplexProps) {
  const isAdLoaded = useRef(false)

  useEffect(() => {
    // 開發環境或沒有設定 slot ID 時，不載入廣告
    if (process.env.NODE_ENV === 'development') return
    if (!ADSENSE_CLIENT_ID || !ADSENSE_MULTIPLEX_SLOT) return
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

  // 開發環境：顯示佔位區塊（4 個 300×250 網格）
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className={className}>
        <div className="mx-auto rounded-xl border-2 border-dashed border-gray-300 bg-gray-100/90 p-4 dark:border-gray-600 dark:bg-gray-800/90">
          {/* 4×1 橫向單列（響應式：手機 2 欄） */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex aspect-[300/250] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white/80 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-700/80 dark:text-gray-400"
              >
                <div className="text-center">
                  <div>廣告 {i}</div>
                  <div className="mt-1 text-[10px] opacity-50">300×250</div>
                </div>
              </div>
            ))}
          </div>
          {/* 廣告標示 */}
          <div className="mt-3 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
            <span className="rounded bg-gray-200/80 px-1.5 py-0.5 dark:bg-gray-700/80">
              Multiplex 多重廣告預覽
            </span>
          </div>
        </div>
      </div>
    )
  }

  // 生產環境：沒有設定時不渲染，不影響版面
  if (!ADSENSE_CLIENT_ID || !ADSENSE_MULTIPLEX_SLOT) {
    return null
  }

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={ADSENSE_MULTIPLEX_SLOT}
        data-ad-format="autorelaxed"
      />
    </div>
  )
}
