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
      title={t('imageFormat.toggle')}
    >
      {formatLabels[format]}
    </button>
  )
}
