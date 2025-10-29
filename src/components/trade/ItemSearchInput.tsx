'use client'

import { useState, useEffect, useRef } from 'react'
import { ExtendedUniqueItem } from '@/types'
import { useDataManagement } from '@/hooks/useDataManagement'
import { useItemsData } from '@/hooks/useItemsData'
import { getItemImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 物品搜尋輸入元件
 *
 * 功能:
 * - 即時搜尋建議 (輸入 2 字後顯示)
 * - 支援中英文搜尋 (itemName + chineseItemName)
 * - 顯示物品圖片 (整合 Cloudflare R2)
 * - 選擇確認後填入表單
 * - 支援排除特定物品 (交換功能用)
 * - 顯示已選擇的物品
 * - 移除已選擇的物品
 *
 * 參考文件:
 * - docs/architecture/交易系統/10-物品整合設計.md
 */

interface ItemSearchInputProps {
  value?: ExtendedUniqueItem | null
  onSelect: (item: ExtendedUniqueItem | null) => void
  placeholder?: string
  disabled?: boolean
  excludeItemId?: number
}

export function ItemSearchInput({
  value,
  onSelect,
  placeholder = '搜尋物品...',
  disabled = false,
  excludeItemId
}: ItemSearchInputProps) {
  const { language } = useLanguage()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ExtendedUniqueItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 載入物品資料（整合現有的資料管理 hook）
  const { allDrops, gachaMachines, loadGachaMachines } = useDataManagement()
  const { searchItems } = useItemsData({ allDrops, gachaMachines })

  // 當開始搜尋時，確保轉蛋機資料已載入（延遲載入）
  useEffect(() => {
    if (query.length >= 2 && gachaMachines.length === 0) {
      loadGachaMachines()
    }
  }, [query, gachaMachines.length, loadGachaMachines])

  // 即時搜尋邏輯
  useEffect(() => {
    if (query.length >= 2) {
      const results = searchItems(query, 10)
        .filter(item => item.itemId !== excludeItemId)
      setSuggestions(results)
      setIsOpen(results.length > 0)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [query, excludeItemId, searchItems])

  const handleSelect = (item: ExtendedUniqueItem) => {
    onSelect(item)
    setQuery('')
    setIsOpen(false)
  }

  // 點擊外部關閉建議列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 根據語言選擇物品名稱
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getDisplayItemName = (item: any, itemId?: number) => {
    if (!item) {
      return itemId ? (language === 'zh-TW' ? `物品 #${itemId}` : `Item #${itemId}`) : (language === 'zh-TW' ? '未知物品' : 'Unknown Item')
    }
    if (language === 'zh-TW') {
      return item.chineseItemName || item.itemName || (itemId ? `物品 #${itemId}` : '未知物品')
    }
    return item.itemName || (itemId ? `Item #${itemId}` : 'Unknown Item')
  }

  return (
    <div className="relative" ref={inputRef}>
      {/* 已選擇的物品顯示 */}
      {value && (
        <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg mb-2">
          {/* 物品圖片 */}
          <img
            src={getItemImageUrl(value.itemId)}
            alt={value.itemName}
            className="w-10 h-10 object-contain"
            onError={(e) => {
              // 圖片載入失敗時使用占位圖
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect width="40" height="40" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
            }}
          />
          <div className="flex-1">
            <p className="font-semibold">
              {getDisplayItemName(value)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID: {value.itemId}
            </p>
          </div>
          <button
            onClick={() => onSelect(null)}
            className="px-3 py-1 text-sm text-red-600 dark:text-red-400
                       hover:text-red-800 dark:hover:text-red-300
                       hover:bg-red-50 dark:hover:bg-red-900/20
                       rounded transition-colors"
            type="button"
          >
            移除
          </button>
        </div>
      )}

      {/* 搜尋輸入框 */}
      {!value && (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-4 py-2 border rounded-lg
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       dark:bg-gray-800 dark:border-gray-600
                       dark:text-white dark:placeholder-gray-400
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {/* 建議列表 */}
          {isOpen && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800
                            border dark:border-gray-600 rounded-lg shadow-lg
                            max-h-60 overflow-y-auto">
              {suggestions.map((item) => (
                <button
                  key={item.itemId}
                  onClick={() => handleSelect(item)}
                  type="button"
                  className="w-full flex items-center gap-3 p-3
                             hover:bg-gray-100 dark:hover:bg-gray-700
                             text-left transition-colors
                             border-b last:border-b-0 dark:border-gray-700"
                >
                  {/* 物品圖片 */}
                  <img
                    src={getItemImageUrl(item.itemId)}
                    alt={item.itemName}
                    className="w-8 h-8 object-contain flex-shrink-0"
                    onError={(e) => {
                      // 圖片載入失敗時使用占位圖
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {getDisplayItemName(item, item.itemId)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {language === 'zh-TW' && item.itemName !== item.chineseItemName && item.itemName}
                      {language === 'zh-TW' && item.itemName !== item.chineseItemName && ' · '}
                      ID: {item.itemId}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 無結果提示 */}
          {query.length >= 2 && !isOpen && suggestions.length === 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800
                            border dark:border-gray-600 rounded-lg shadow-lg p-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                找不到符合「{query}」的物品
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
