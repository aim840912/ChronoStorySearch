'use client'

import { memo } from 'react'

/**
 * 卡片骨架屏元件
 * 在資料載入時顯示，提升使用者感知載入速度
 * 使用玻璃擬態風格以匹配新卡片設計
 */
export const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="min-h-[140px] bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-gray-200/30 dark:shadow-gray-900/30 animate-pulse">
      {/* 頂部：等級標籤和收藏按鈕佔位 */}
      <div className="flex justify-between items-start mb-3">
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>

      {/* 內容：圖片和名稱佔位 */}
      <div className="flex items-center gap-4">
        {/* 圖片佔位 */}
        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
        {/* 文字佔位 */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    </div>
  )
})

/**
 * 骨架屏網格 - 顯示多個卡片骨架
 */
export const SkeletonGrid = memo(function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mt-8">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  )
})
