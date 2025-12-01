'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getMonsterImageUrl, getItemImageUrl } from '@/lib/image-utils'
import type { SuggestionItem } from '@/types'

interface SuggestionListProps {
  suggestions: SuggestionItem[]
  isVisible: boolean
  focusedIndex: number
  onSelect: (name: string, suggestion?: SuggestionItem) => void
  onFocusedIndexChange: (index: number) => void
}

/**
 * 搜尋建議下拉列表元件
 * 顯示搜尋建議並處理圖片載入
 */
export function SuggestionList({
  suggestions,
  isVisible,
  focusedIndex,
  onSelect,
  onFocusedIndexChange,
}: SuggestionListProps) {
  const { t } = useLanguage()
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set())

  const handleImageError = (type: 'monster' | 'item', id: number) => {
    setFailedImageIds(prev => {
      const newSet = new Set(prev)
      newSet.add(`${type}-${id}`)
      return newSet
    })
  }

  const hasImageFailed = (type: 'monster' | 'item', id: number) => {
    return failedImageIds.has(`${type}-${id}`)
  }

  if (!isVisible || suggestions.length === 0) {
    return null
  }

  return (
    <div className="absolute z-50 w-full mt-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl max-h-80 overflow-y-auto">
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.type}-${suggestion.name}`}
          onClick={() => onSelect(suggestion.name, suggestion)}
          onMouseEnter={() => onFocusedIndexChange(index)}
          className={`flex items-center justify-between px-4 py-2 cursor-pointer transition-colors ${
            focusedIndex === index
              ? 'bg-blue-50/80 dark:bg-blue-900/30'
              : 'hover:bg-gray-50/80 dark:hover:bg-gray-700/50'
          } ${index === 0 ? 'rounded-t-xl' : ''} ${
            index === suggestions.length - 1 ? 'rounded-b-xl' : 'border-b border-gray-200/30 dark:border-gray-700/30'
          }`}
        >
          <div className="flex items-center gap-3 flex-1">
            {/* 怪物圖示 */}
            {suggestion.type === 'monster' ? (
              suggestion.id !== undefined && !hasImageFailed('monster', suggestion.id) ? (
                <img
                  src={getMonsterImageUrl(suggestion.id)}
                  alt={suggestion.name}
                  className="w-8 h-8 object-contain flex-shrink-0"
                  onError={() => handleImageError('monster', suggestion.id!)}
                />
              ) : (
                <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                </svg>
              )
            ) : suggestion.type === 'item' ? (
              /* 物品圖示 */
              suggestion.id !== undefined && !hasImageFailed('item', suggestion.id) ? (
                <img
                  src={getItemImageUrl(suggestion.id)}
                  alt={suggestion.name}
                  className="w-8 h-8 object-contain flex-shrink-0"
                  onError={() => handleImageError('item', suggestion.id!)}
                />
              ) : (
                <svg className="w-6 h-6 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                </svg>
              )
            ) : (
              /* 轉蛋機圖示 */
              <svg className="w-6 h-6 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
              </svg>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {suggestion.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {suggestion.type === 'monster'
                  ? `${t('suggestion.monster')} · ${suggestion.count} ${t('suggestion.records')}`
                  : suggestion.type === 'item'
                  ? `${t('suggestion.item')} · ${suggestion.count} ${t('suggestion.records')}`
                  : `${t('suggestion.gacha')} · ${suggestion.machineName || t('suggestion.machine')}`
                }
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
