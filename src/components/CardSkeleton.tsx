'use client'

import { memo } from 'react'

/**
 * 卡片骨架屏元件
 * 在資料載入時顯示，提升使用者感知載入速度
 */
export const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="h-[120px] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-5 border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="flex items-center gap-3">
        {/* 圖片佔位 */}
        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0" />
        {/* 文字佔位 */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  )
})
