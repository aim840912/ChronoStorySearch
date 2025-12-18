'use client'

import { useEffect, useRef } from 'react'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const ADSENSE_INFEED_SLOT = process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false'

interface AdSenseCardProps {
  className?: string
}

/**
 * 信息流廣告卡片元件
 *
 * 在卡片列表中插入，與其他卡片混合顯示
 * - 開發環境：顯示佔位區塊（方便調整位置）
 * - 生產環境：沒有設定 slot ID 時返回 null 不影響版面
 */
export function AdSenseCard({ className }: AdSenseCardProps) {
  const isAdLoaded = useRef(false)

  useEffect(() => {
    // 開發環境或沒有設定 slot ID 時，不載入廣告
    if (process.env.NODE_ENV === 'development') return
    if (!ADSENSE_CLIENT_ID || !ADSENSE_INFEED_SLOT) return
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

  // 開發環境：顯示模擬廣告佈局（更接近實際效果）
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className={className}>
        <div className="min-h-[140px] rounded-xl border border-dashed border-gray-300/80 bg-white/60 p-4 shadow-sm backdrop-blur-sm dark:border-gray-600/80 dark:bg-gray-800/60">
          {/* 模擬廣告佈局：圖片 + 文字 */}
          <div className="flex gap-4">
            {/* 圖片佔位 */}
            <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-gray-200/80 dark:bg-gray-700/80" />
            {/* 文字區域 */}
            <div className="flex flex-1 flex-col justify-center gap-2">
              <div className="h-4 w-3/4 rounded bg-gray-200/80 dark:bg-gray-700/80" />
              <div className="h-3 w-full rounded bg-gray-200/60 dark:bg-gray-700/60" />
              <div className="h-3 w-2/3 rounded bg-gray-200/60 dark:bg-gray-700/60" />
            </div>
          </div>
          {/* 廣告標示 */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span className="rounded bg-gray-200/80 px-1.5 py-0.5 dark:bg-gray-700/80">Ad</span>
            <span>信息流廣告預覽</span>
          </div>
        </div>
      </div>
    )
  }

  // 生產環境：沒有設定時不渲染，不影響版面
  if (!ADSENSE_CLIENT_ID || !ADSENSE_INFEED_SLOT) {
    return null
  }

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={ADSENSE_INFEED_SLOT}
        data-ad-format="fluid"
        data-ad-layout-key="-fb+5w+4e-db+86"
      />
    </div>
  )
}
