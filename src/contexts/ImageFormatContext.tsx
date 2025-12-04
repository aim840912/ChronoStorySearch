'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { ImageFormat } from '@/lib/image-utils'
import { getImageFormat, setImageFormat as saveImageFormat } from '@/lib/storage'

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
const formatCycle: ImageFormat[] = ['png', 'stand', 'hit', 'die']

/**
 * 圖片格式 Provider
 * 提供全域的圖片格式設定（PNG/Stand/Die）
 * 自動從 localStorage 載入並持久化用戶設定
 */
export function ImageFormatProvider({
  children,
  defaultFormat = 'png'
}: ImageFormatProviderProps) {
  const [format, setFormatState] = useState<ImageFormat>(defaultFormat)

  // 從 localStorage 載入已儲存的格式
  useEffect(() => {
    const savedFormat = getImageFormat()
    setFormatState(savedFormat)
  }, [])

  // 設定格式並儲存到 localStorage
  const setFormat = useCallback((newFormat: ImageFormat) => {
    setFormatState(newFormat)
    saveImageFormat(newFormat)
  }, [])

  // 切換格式並儲存到 localStorage
  const toggleFormat = useCallback(() => {
    setFormatState(prev => {
      const currentIndex = formatCycle.indexOf(prev)
      const nextIndex = (currentIndex + 1) % formatCycle.length
      const newFormat = formatCycle[nextIndex]
      saveImageFormat(newFormat)
      return newFormat
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
