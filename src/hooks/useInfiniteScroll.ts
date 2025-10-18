'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const ITEMS_PER_PAGE = 50

interface UseInfiniteScrollParams<T> {
  items: T[]
  enabled?: boolean
}

/**
 * 無限滾動 Hook
 * 職責：
 * - 分頁顯示大量資料
 * - 使用 Intersection Observer 偵測滾動
 * - 自動載入下一頁資料
 */
export function useInfiniteScroll<T>({ items, enabled = true }: UseInfiniteScrollParams<T>) {
  const [displayedItems, setDisplayedItems] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observerTarget = useRef<HTMLDivElement>(null)

  // 重置分頁（當資料來源變更時）
  useEffect(() => {
    if (!enabled) {
      setDisplayedItems(items)
      setHasMore(false)
      return
    }

    const initialItems = items.slice(0, ITEMS_PER_PAGE)
    setDisplayedItems(initialItems)
    setPage(1)
    setHasMore(items.length > ITEMS_PER_PAGE)
  }, [items, enabled])

  // 載入更多資料
  const loadMore = useCallback(() => {
    if (!hasMore || !enabled) return

    const nextPage = page + 1
    const endIndex = nextPage * ITEMS_PER_PAGE
    const nextItems = items.slice(0, endIndex)

    setDisplayedItems(nextItems)
    setPage(nextPage)
    setHasMore(endIndex < items.length)
  }, [items, page, hasMore, enabled])

  // Intersection Observer 設定
  useEffect(() => {
    if (!enabled) return

    const target = observerTarget.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(target)

    return () => {
      if (target) {
        observer.unobserve(target)
      }
    }
  }, [loadMore, hasMore, enabled])

  return {
    displayedItems: enabled ? displayedItems : items,
    hasMore: enabled ? hasMore : false,
    loadMore,
    observerTarget,
  }
}
