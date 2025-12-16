'use client'

import { useEffect, useRef } from 'react'

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const ADSENSE_INFEED_SLOT = process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT

interface AdSenseCardProps {
  className?: string
}

/**
 * 信息流廣告卡片元件
 *
 * 在卡片列表中插入，與其他卡片混合顯示
 * 如果沒有設定 slot ID，會返回 null 不影響版面
 */
export function AdSenseCard({ className }: AdSenseCardProps) {
  const isAdLoaded = useRef(false)

  useEffect(() => {
    // 如果沒有設定 slot ID，不載入廣告
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

  // 沒有設定時不渲染，不影響版面
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
