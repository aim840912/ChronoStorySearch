'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { ImageFormat } from '@/lib/image-utils'

interface ImageFormatContextType {
  /** 當前圖片格式 */
  format: ImageFormat
  /** 切換圖片格式（循環切換） */
  toggleFormat: () => void
  /** 設定圖片格式 */
  setFormat: (format: ImageFormat) => void
}

const ImageFormatContext = createContext<ImageFormatContextType | undefined>(undefined)

interface ImageFormatProviderProps {
  children: ReactNode
  /** 預設圖片格式 */
  defaultFormat?: ImageFormat
}

// 格式循環順序
const formatCycle: ImageFormat[] = ['png', 'stand', 'die']

/**
 * 圖片格式 Provider
 * 提供全域的圖片格式設定（PNG/Stand/Die）
 */
export function ImageFormatProvider({
  children,
  defaultFormat = 'png'
}: ImageFormatProviderProps) {
  const [format, setFormat] = useState<ImageFormat>(defaultFormat)

  const toggleFormat = useCallback(() => {
    setFormat(prev => {
      const currentIndex = formatCycle.indexOf(prev)
      const nextIndex = (currentIndex + 1) % formatCycle.length
      return formatCycle[nextIndex]
    })
  }, [])

  return (
    <ImageFormatContext.Provider value={{ format, toggleFormat, setFormat }}>
      {children}
    </ImageFormatContext.Provider>
  )
}

/**
 * 使用圖片格式 Hook
 * @returns 圖片格式 Context
 */
export function useImageFormat(): ImageFormatContextType {
  const context = useContext(ImageFormatContext)

  if (context === undefined) {
    throw new Error('useImageFormat must be used within an ImageFormatProvider')
  }

  return context
}
