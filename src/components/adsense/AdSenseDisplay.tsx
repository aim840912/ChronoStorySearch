'use client'

import { useEffect, useRef } from 'react'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const ADSENSE_DISPLAY_SLOT = process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT

interface AdSenseDisplayProps {
  className?: string
  /** 廣告寬度，預設 160 */
  width?: number
  /** 廣告高度，預設 600 */
  height?: number
}

/**
 * Display 廣告元件（Skyscraper 160x600）
 *
 * 用於 Modal 旁邊的固定尺寸廣告
 * - 開發環境：顯示佔位區塊（方便調整位置）
 * - 生產環境：沒有設定 slot ID 時返回 null 不影響版面
 * - 響應式：預設在 < 1120px 時隱藏
 */
export function AdSenseDisplay({
  className,
  width = 160,
  height = 600,
}: AdSenseDisplayProps) {
  const isAdLoaded = useRef(false)

  useEffect(() => {
    // 開發環境或沒有設定 slot ID 時，不載入廣告
    if (process.env.NODE_ENV === 'development') return
    if (!ADSENSE_CLIENT_ID || !ADSENSE_DISPLAY_SLOT) return
    if (isAdLoaded.current) return

    try {
      // @ts-expect-error - adsbygoogle is a global variable injected by AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({})
      isAdLoaded.current = true
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [])

  // 開發環境：顯示佔位區塊（方便調整位置）
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className={className}>
        <div
          className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100/90 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-400"
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          <div className="text-center">
            <div>展示廣告</div>
            <div className="text-xs opacity-70">位置預覽</div>
            <div className="mt-1 text-[10px] opacity-50">
              {width}×{height}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 生產環境：沒有設定時不渲染，不影響版面
  if (!ADSENSE_CLIENT_ID || !ADSENSE_DISPLAY_SLOT) {
    return null
  }

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'inline-block',
          width: `${width}px`,
          height: `${height}px`,
        }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={ADSENSE_DISPLAY_SLOT}
      />
    </div>
  )
}
