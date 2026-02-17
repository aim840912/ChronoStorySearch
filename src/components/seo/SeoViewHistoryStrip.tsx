'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useViewHistory } from '@/hooks/useViewHistory'
import { ViewHistoryStrip } from '@/components/ViewHistoryStrip'

interface SeoViewHistoryStripProps {
  /** 當前頁面資訊，傳入後會自動記錄到瀏覽歷史 */
  currentPage?: {
    type: 'monster' | 'item'
    id: number
    name: string
  }
}

/**
 * SEO 頁面用的瀏覽紀錄圖示列
 * 包裝 ViewHistoryStrip，提供 useViewHistory 資料和頁面導航
 * 用於 Server Component 頁面（monster/item detail pages）
 * 傳入 currentPage 會自動記錄當前頁面到瀏覽歷史
 */
export function SeoViewHistoryStrip({ currentPage }: SeoViewHistoryStripProps) {
  const router = useRouter()
  const { history, recordView, clearHistory } = useViewHistory()

  // 自動記錄當前頁面到瀏覽歷史
  // 用個別屬性作為 deps，避免 Server Component 每次建立新物件導致無限 re-render
  useEffect(() => {
    if (currentPage) {
      recordView(currentPage.type, currentPage.id, currentPage.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage?.type, currentPage?.id, currentPage?.name, recordView])

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
