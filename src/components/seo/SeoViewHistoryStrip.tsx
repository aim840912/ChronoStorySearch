'use client'

import { useRouter } from 'next/navigation'
import { useViewHistory } from '@/hooks/useViewHistory'
import { ViewHistoryStrip } from '@/components/ViewHistoryStrip'

/**
 * SEO 頁面用的瀏覽紀錄圖示列
 * 包裝 ViewHistoryStrip，提供 useViewHistory 資料和頁面導航
 * 用於 Server Component 頁面（monster/item detail pages）
 */
export function SeoViewHistoryStrip() {
  const router = useRouter()
  const { history, clearHistory } = useViewHistory()

  const handleMonsterClick = (mobId: number) => {
    router.push(`/monster/${mobId}`)
  }

  const handleItemClick = (itemId: number) => {
    router.push(`/item/${itemId}`)
  }

  return (
    <div data-testid="seo-view-history-strip">
      <ViewHistoryStrip
        history={history}
        onMonsterClick={handleMonsterClick}
        onItemClick={handleItemClick}
        onClear={clearHistory}
      />
    </div>
  )
}
