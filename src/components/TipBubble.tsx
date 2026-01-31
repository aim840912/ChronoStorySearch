'use client'

import { useEffect, useState } from 'react'
import { hasTipBeenShown, markTipAsShown } from '@/lib/storage'
import { useLanguage } from '@/contexts/LanguageContext'

interface TipBubbleProps {
  tipId: string
  message: string
  /** 必須先顯示過這個提示才會顯示（用於依序顯示多個提示） */
  prerequisiteTipId?: string
  /** 定位方式：center（置中，預設）或 right（靠右對齊） */
  position?: 'center' | 'right'
  onDismiss?: () => void
}

export function TipBubble({ tipId, message, prerequisiteTipId, position = 'center', onDismiss }: TipBubbleProps) {
  const { t } = useLanguage()
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // 檢查是否已顯示過此提示
    if (hasTipBeenShown(tipId)) {
      return undefined
    }

    // 如果有前置提示，檢查前置提示是否已顯示過
    if (prerequisiteTipId && !hasTipBeenShown(prerequisiteTipId)) {
      return undefined
    }

    // 延遲顯示，讓頁面先載入完成
    const timer = setTimeout(() => {
      setIsVisible(true)
      setIsAnimating(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [tipId, prerequisiteTipId])

  const handleDismiss = () => {
    setIsAnimating(false)
    // 等待動畫完成後隱藏
    setTimeout(() => {
      setIsVisible(false)
      markTipAsShown(tipId)
      onDismiss?.()
    }, 200)
  }

  if (!isVisible) return null

  // 根據 position 決定定位方式
  const positionClasses = position === 'right'
    ? 'right-0'
    : 'left-1/2 -translate-x-1/2'

  const arrowClasses = position === 'right'
    ? 'right-3'
    : 'left-1/2 -translate-x-1/2'

  return (
    <div
      className={`
        absolute ${positionClasses} top-full mt-2 z-50
        transition-all duration-200 ease-out
        ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
      onClick={handleDismiss}
    >
      {/* 箭頭 */}
      <div className={`absolute ${arrowClasses} -top-2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-purple-600`} />

      {/* 氣泡本體 */}
      <div className="bg-purple-600 text-white rounded-lg shadow-lg px-4 py-3 min-w-[200px] max-w-[300px] cursor-pointer">
        <p className="text-sm leading-relaxed">{message}</p>
        <p className="text-[10px] text-purple-200 mt-1.5 text-center">{t('tip.clickToClose')}</p>
      </div>
    </div>
  )
}
