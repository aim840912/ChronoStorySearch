'use client'

import { memo } from 'react'
import type { OcrConfidenceProps } from '@/types/exp-tracker'
import { getConfidenceLevel } from '@/types/exp-tracker'

/**
 * OCR 信心度指示器
 * 以顏色標示辨識準確度
 */
export const OcrConfidence = memo(function OcrConfidence({
  confidence,
  t,
}: OcrConfidenceProps) {
  const level = getConfidenceLevel(confidence)

  const getColor = () => {
    switch (level) {
      case 'high':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-700 dark:text-green-300',
          bar: 'bg-green-500',
        }
      case 'medium':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-700 dark:text-yellow-300',
          bar: 'bg-yellow-500',
        }
      case 'low':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-300',
          bar: 'bg-red-500',
        }
    }
  }

  const colors = getColor()

  return (
    <div className={`p-3 rounded-lg ${colors.bg}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-medium ${colors.text}`}>
          {t('confidence')}
        </span>
        <span className={`text-sm font-bold ${colors.text}`}>
          {confidence.toFixed(0)}% ({t(`confidence${level.charAt(0).toUpperCase() + level.slice(1)}`)})
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${colors.bar}`}
          style={{ width: `${Math.min(100, confidence)}%` }}
        ></div>
      </div>
    </div>
  )
})
