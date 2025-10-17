'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { RefObject, KeyboardEvent } from 'react'
import type { SuggestionItem } from '@/types'

interface SearchBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  suggestions: SuggestionItem[]
  showSuggestions: boolean
  onFocus: () => void
  onSelectSuggestion: (name: string, suggestion?: SuggestionItem) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  focusedIndex: number
  onFocusedIndexChange: (index: number) => void
  searchContainerRef: RefObject<HTMLDivElement | null>
}

/**
 * 搜尋列元件
 * 包含自動完成建議功能
 */
export function SearchBar({
  searchTerm,
  onSearchChange,
  suggestions,
  showSuggestions,
  onFocus,
  onSelectSuggestion,
  onKeyDown,
  focusedIndex,
  onFocusedIndexChange,
  searchContainerRef,
}: SearchBarProps) {
  const { t } = useLanguage()

  // 追蹤圖片載入失敗的 ID（使用 Set 記錄失敗的 ID）
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set())

  // 處理圖片載入錯誤
  const handleImageError = (type: 'monster' | 'item', id: number) => {
    setFailedImageIds(prev => {
      const newSet = new Set(prev)
      newSet.add(`${type}-${id}`)
      return newSet
    })
  }

  // 檢查圖片是否載入失敗
  const hasImageFailed = (type: 'monster' | 'item', id: number) => {
    return failedImageIds.has(`${type}-${id}`)
  }

  return (
    <div className="max-w-2xl mx-auto mb-6">
      <div className="relative" ref={searchContainerRef}>
        {/* 搜尋圖示 */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* 搜尋輸入框 */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder={t('search.placeholder')}
          className="w-full pl-12 pr-12 py-4 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 transition-all"
        />

        {/* 清除按鈕 */}
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* 建議列表 */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.type}-${suggestion.name}`}
                onClick={() => onSelectSuggestion(suggestion.name, suggestion)}
                onMouseEnter={() => onFocusedIndexChange(index)}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                  focusedIndex === index
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                } ${index === 0 ? 'rounded-t-lg' : ''} ${
                  index === suggestions.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* 怪物圖示 - 使用實際圖片 */}
                  {suggestion.type === 'monster' ? (
                    suggestion.id !== undefined && !hasImageFailed('monster', suggestion.id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/images/monsters/${suggestion.id}.png`}
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
                    /* 物品圖示 - 使用實際圖片 */
                    suggestion.id !== undefined && suggestion.id !== 0 && !hasImageFailed('item', suggestion.id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/images/items/${suggestion.id}.png`}
                        alt={suggestion.name}
                        className="w-8 h-8 object-contain flex-shrink-0"
                        onError={() => handleImageError('item', suggestion.id!)}
                      />
                    ) : (
                      suggestion.id === 0 ? (
                        <span className="text-xl flex-shrink-0">💰</span>
                      ) : (
                        <svg className="w-6 h-6 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                        </svg>
                      )
                    )
                  ) : (
                    /* 轉蛋機圖示 - 保持 SVG */
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
        )}
      </div>
    </div>
  )
}
