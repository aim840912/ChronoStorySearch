'use client'

import { useImageFormat } from '@/contexts/ImageFormatContext'
import type { ImageFormat } from '@/lib/image-utils'

// 格式顯示名稱
const formatLabels: Record<ImageFormat, string> = {
  png: 'PNG',
  stand: '待機',
  die: '死亡'
}

/**
 * 圖片格式切換按鈕
 * 點擊後循環切換怪物圖片格式：PNG → 待機 → 死亡
 */
export function ImageFormatToggle() {
  const { format, toggleFormat } = useImageFormat()

  return (
    <button
      onClick={toggleFormat}
      className="px-3 py-1.5 rounded-lg
                 bg-gray-100 dark:bg-gray-800
                 hover:bg-gray-200 dark:hover:bg-gray-700
                 border border-gray-300 dark:border-gray-600
                 transition-colors duration-200
                 text-sm font-medium
                 text-gray-700 dark:text-gray-300
                 cursor-pointer
                 focus:outline-none focus:ring-2 focus:ring-blue-500
                 active:scale-95"
      title="切換怪物圖片格式"
    >
      {formatLabels[format]}
    </button>
  )
}
