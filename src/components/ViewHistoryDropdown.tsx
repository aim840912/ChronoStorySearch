'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getItemImageUrl, getMonsterImageUrl, hasItemImage, hasMonsterImage } from '@/lib/image-utils'
import type { ViewHistoryItem } from '@/types'

interface ViewHistoryDropdownProps {
  history: ViewHistoryItem[]
  onItemClick: (item: ViewHistoryItem) => void
  onClearHistory: () => void
}

/**
 * 格式化相對時間
 * @param timestamp - 時間戳記（毫秒）
 * @returns 格式化的相對時間字串（例如：「3 分鐘前」）
 */
function formatRelativeTime(timestamp: number, language: string): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const isZh = language === 'zh-TW'

  if (days > 0) {
    return isZh ? `${days} 天前` : `${days}d ago`
  }
  if (hours > 0) {
    return isZh ? `${hours} 小時前` : `${hours}h ago`
  }
  if (minutes > 0) {
    return isZh ? `${minutes} 分鐘前` : `${minutes}m ago`
  }
  return isZh ? '剛剛' : 'Just now'
}

/**
 * 歷史項目圖片元件（帶錯誤處理）
 */
function HistoryItemImage({ item }: { item: ViewHistoryItem }) {
  const [imageError, setImageError] = useState(false)

  const hasImage = item.type === 'monster'
    ? hasMonsterImage(item.id)
    : hasItemImage(item.id)

  const imageUrl = item.type === 'monster'
    ? getMonsterImageUrl(item.id)
    : getItemImageUrl(item.id)

  // 如果沒有圖片或載入失敗，顯示 fallback SVG
  if (!hasImage || imageError) {
    return (
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        item.type === 'monster'
          ? 'bg-red-100 dark:bg-red-900/30'
          : 'bg-blue-100 dark:bg-blue-900/30'
      }`}>
        {item.type === 'monster' ? (
          // 怪物 fallback 圖示
          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          // 物品 fallback 圖示
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )}
      </div>
    )
  }

  // 顯示實際圖片
  // 注意：這裡使用原生 img 而非 Next.js Image 是因為：
  // 1. 圖片已透過 R2 CDN 優化
  // 2. 圖片很小 (< 3 KB) 且有完善的快取系統
  // 3. loading="lazy" 提供延遲載入
  return (
    <div className={`flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${
      item.type === 'monster'
        ? 'bg-red-100 dark:bg-red-900/30'
        : 'bg-blue-100 dark:bg-blue-900/30'
    }`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={item.name}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setImageError(true)}
      />
    </div>
  )
}

/**
 * 瀏覽歷史下拉選單元件
 *
 * 功能：
 * - 顯示最近瀏覽的怪物和物品
 * - 點擊項目可開啟對應的 Modal
 * - 顯示相對時間（幾分鐘前）
 * - 提供清除所有歷史的功能
 * - 使用實際圖片作為圖示（帶 fallback）
 */
export function ViewHistoryDropdown({
  history,
  onItemClick,
  onClearHistory,
}: ViewHistoryDropdownProps) {
  const { language } = useLanguage()

  // 只顯示最近 5 筆
  const displayHistory = history.slice(0, 5)

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
      {/* 標題 */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {language === 'zh-TW' ? '瀏覽歷史' : 'View History'}
          </h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {displayHistory.length} / {history.length}
        </span>
      </div>

      {/* 歷史列表 */}
      {displayHistory.length === 0 ? (
        // 空狀態
        <div className="px-4 py-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'zh-TW' ? '尚無瀏覽記錄' : 'No viewing history'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {language === 'zh-TW' ? '點擊卡片後會顯示在這裡' : 'Cards you view will appear here'}
          </p>
        </div>
      ) : (
        <div className="py-2">
          {displayHistory.map((item) => (
            <button
              key={`${item.type}-${item.id}-${item.viewedAt}`}
              onClick={() => onItemClick(item)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 text-left"
            >
              {/* 項目圖片 */}
              <HistoryItemImage item={item} />

              {/* 項目資訊 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    item.type === 'monster'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                  }`}>
                    {item.type === 'monster'
                      ? (language === 'zh-TW' ? '怪物' : 'Monster')
                      : (language === 'zh-TW' ? '物品' : 'Item')
                    }
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatRelativeTime(item.viewedAt, language)}
                </p>
              </div>

              {/* 箭頭圖示 */}
              <svg className="w-5 h-5 text-gray-400 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* 清除按鈕（只在有歷史時顯示） */}
      {history.length > 0 && (
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClearHistory()
            }}
            className="w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 border-2 border-red-500 hover:border-red-600 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-sm">
              {language === 'zh-TW' ? '清除所有歷史' : 'Clear All History'}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
