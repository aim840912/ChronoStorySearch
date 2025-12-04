'use client'

import { useImageFormat } from '@/contexts/ImageFormatContext'
import { useLanguage } from '@/contexts/LanguageContext'
import type { ImageFormat } from '@/lib/image-utils'

/**
 * 圖片格式切換按鈕
 * 點擊後循環切換怪物圖片格式：PNG → 待機 → 受擊 → 死亡
 */
export function ImageFormatToggle() {
  const { format, toggleFormat } = useImageFormat()
  const { t } = useLanguage()

  // 根據當前語言取得格式標籤
  const formatLabels: Record<ImageFormat, string> = {
    png: t('imageFormat.png'),
    stand: t('imageFormat.stand'),
    hit: t('imageFormat.hit'),
    die: t('imageFormat.die')
  }

  // 根據格式返回對應的圖標
  const renderIcon = () => {
    switch (format) {
      case 'png':
        // 圖片框架圖標
        return (
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )
      case 'stand':
        // GIF 文字圖標（待機）
        return (
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
            <text x="2" y="17" fontSize="12" fontWeight="bold">GIF</text>
          </svg>
        )
      case 'hit':
        // 閃電圖標（受擊）
        return (
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        )
      case 'die':
        // X 標記圖標（死亡）
        return (
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      className="p-1.5 sm:p-2 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 flex items-center gap-1.5"
      title={formatLabels[format]}
      aria-label={t('imageFormat.toggle')}
    >
      {renderIcon()}
    </button>
  )
}
