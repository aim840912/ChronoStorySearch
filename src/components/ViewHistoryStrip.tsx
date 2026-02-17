'use client'

import { useState, useRef, useEffect } from 'react'
import type { ViewHistoryItem } from '@/types'
import { getMonsterImageUrl, getItemImageUrl } from '@/lib/image-utils'
import { getStorageItem, setStorageItem } from '@/lib/storage'
import { useLanguage } from '@/contexts/LanguageContext'

const STORAGE_KEY = 'chronostory-view-history-collapsed'

interface ViewHistoryStripProps {
  history: ViewHistoryItem[]
  onMonsterClick: (mobId: number, mobName: string) => void
  onItemClick: (itemId: number, itemName: string) => void
  onClear: () => void
}

/**
 * 瀏覽紀錄圖示列
 * 在首頁卡片 grid 上方顯示最近瀏覽的怪物/物品小圖示
 * 支援水平捲動、收合/展開、清除紀錄
 */
export function ViewHistoryStrip({
  history,
  onMonsterClick,
  onItemClick,
  onClear,
}: ViewHistoryStripProps) {
  const { t } = useLanguage()
  const [collapsed, setCollapsed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 從 localStorage 讀取收合狀態（延遲到 mount 後，避免 hydration mismatch）
  useEffect(() => {
    const saved = getStorageItem<boolean>(STORAGE_KEY, false)
    if (saved) setCollapsed(saved)
  }, [])

  // 無歷史時不渲染
  if (history.length === 0) return null

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      setStorageItem(STORAGE_KEY, next)
      return next
    })
  }

  const handleClick = (item: ViewHistoryItem) => {
    if (item.type === 'monster') {
      onMonsterClick(item.id, item.name)
    } else {
      onItemClick(item.id, item.name)
    }
  }

  return (
    <div className="mt-6 mb-2">
      {/* Header: 標題 + toggle */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {t('viewHistory.title')} ({history.length})
        </span>
        <button
          onClick={toggleCollapsed}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
          aria-label={collapsed ? 'Expand history' : 'Collapse history'}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 圖示列 */}
      {!collapsed && (
        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1"
        >
          {/* 清除按鈕 */}
          <button
            onClick={onClear}
            className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 flex items-center justify-center transition-colors group"
            title={t('viewHistory.clear')}
            aria-label={t('viewHistory.clear')}
          >
            <svg
              className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          {/* 歷史圖示 */}
          {history.map((item) => {
            const imgSrc = item.type === 'monster'
              ? getMonsterImageUrl(item.id)
              : getItemImageUrl(item.id)

            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => handleClick(item)}
                className="flex-shrink-0 w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md flex items-center justify-center overflow-hidden transition-all"
                title={item.name}
              >
                <img
                  src={imgSrc}
                  alt=""
                  className="w-8 h-8 object-contain"
                  loading="lazy"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
