'use client'

import { useImageFormat } from '@/contexts/ImageFormatContext'
import { useLanguage } from '@/contexts/LanguageContext'
import type { ImageFormat } from '@/lib/image-utils'

/**
 * 圖片格式切換按鈕
 * 點擊後循環切換怪物圖片格式：PNG → 待機 → 死亡
 */
export function ImageFormatToggle() {
  const { format, toggleFormat } = useImageFormat()
  const { t } = useLanguage()

  // 根據當前語言取得格式標籤
  const formatLabels: Record<ImageFormat, string> = {
    png: t('imageFormat.png'),
    stand: t('imageFormat.stand'),
    die: t('imageFormat.die')
  }

  // 根據格式返回對應的圖標
  const renderIcon = () => {
    if (format === 'png') {
      // 圖片框架圖標
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      )
    } else if (format === 'stand') {
      // GIF 文字圖標
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <text x="2" y="17" fontSize="12" fontWeight="bold">GIF</text>
        </svg>
      )
    } else {
      // X 標記圖標（死亡）
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )
    }
  }

  return (
    <button
      onClick={toggleFormat}
      className="p-2 sm:px-3 sm:py-1.5 rounded-full sm:rounded-lg
                 bg-gray-100 dark:bg-gray-800
                 hover:bg-gray-200 dark:hover:bg-gray-700
                 border border-gray-300 dark:border-gray-600
                 transition-colors duration-200
                 text-sm font-medium
                 text-gray-700 dark:text-gray-300
                 cursor-pointer
                 focus:outline-none focus:ring-2 focus:ring-blue-500
                 active:scale-95
                 flex items-center gap-2"
      title={t('imageFormat.toggle')}
    >
      {renderIcon()}
      <span className="hidden sm:inline">{formatLabels[format]}</span>
    </button>
  )
}
