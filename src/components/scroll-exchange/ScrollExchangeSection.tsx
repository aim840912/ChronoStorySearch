'use client'

import { useState, useMemo, useCallback, Fragment } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { matchesAllKeywords } from '@/lib/search-utils'
import type { ScrollExchangeItem } from '@/lib/scroll-exchange-utils'
import scrollExchangeData from '../../../data/sheets-scroll-exchange.json'

const data = scrollExchangeData as ScrollExchangeItem[]

/** 所有類別（排序） */
const ALL_CATEGORIES = [...new Set(data.map(d => d.Category))].sort()

/** 所有捲軸屬性（排序） */
const ALL_SCROLL_TYPES = [...new Set(data.map(d => d.ScrollType))].sort()

interface ScrollExchangeSectionProps {
  onClose: () => void
  onItemClick?: (itemId: number, itemName: string) => void
  /** 可從怪物掉落的物品 ID 集合 */
  droppableItemIds?: Set<number>
}

/**
 * 捲軸兌換區域元件
 * 顯示在 SearchHeader 和 ContentDisplay 之間（替換主內容區）
 */
export function ScrollExchangeSection({
  onClose,
  onItemClick,
  droppableItemIds,
}: ScrollExchangeSectionProps) {
  const { t, language } = useLanguage()

  // 搜尋詞
  const [searchTerm, setSearchTerm] = useState('')

  // 篩選狀態
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedScrollType, setSelectedScrollType] = useState<string>('all')

  // 排序狀態（null = 預設分組模式）
  type SortColumn = 'name' | 'type' | 'percent' | 'rate' | 'voucher'
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // 排序點擊（三態：升序 → 降序 → 回預設分組）
  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortColumn(null)
        setSortDirection('asc')
      }
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }, [sortColumn, sortDirection])

  // 篩選 + 搜尋
  const filteredData = useMemo(() => {
    let result = data

    // Category 篩選
    if (selectedCategory !== 'all') {
      result = result.filter(d => d.Category === selectedCategory)
    }

    // ScrollType 篩選
    if (selectedScrollType !== 'all') {
      result = result.filter(d => d.ScrollType === selectedScrollType)
    }

    // 搜尋
    if (searchTerm.trim()) {
      result = result.filter(d =>
        matchesAllKeywords(d.ItemName, searchTerm) ||
        matchesAllKeywords(d.Category, searchTerm) ||
        matchesAllKeywords(d.ScrollType, searchTerm)
      )
    }

    return result
  }, [searchTerm, selectedCategory, selectedScrollType])

  // 按 Category 分組（組內依排序狀態排列）
  const groupedData = useMemo(() => {
    const groups = new Map<string, ScrollExchangeItem[]>()
    for (const item of filteredData) {
      const existing = groups.get(item.Category)
      if (existing) {
        existing.push(item)
      } else {
        groups.set(item.Category, [item])
      }
    }
    // 組內排序：有排序欄位時依該欄位，否則預設按成功率降序
    for (const items of groups.values()) {
      if (sortColumn) {
        items.sort((a, b) => {
          let cmp = 0
          switch (sortColumn) {
            case 'name': cmp = a.ItemName.localeCompare(b.ItemName); break
            case 'type': cmp = a.ScrollType.localeCompare(b.ScrollType); break
            case 'percent': cmp = a.ScrollPercent - b.ScrollPercent; break
            case 'rate': cmp = a.ExchangeRate - b.ExchangeRate; break
            case 'voucher': cmp = a.ScrollVoucherReq - b.ScrollVoucherReq; break
          }
          return sortDirection === 'asc' ? cmp : -cmp
        })
      } else {
        items.sort((a, b) => b.ScrollPercent - a.ScrollPercent)
      }
    }
    return groups
  }, [filteredData, sortColumn, sortDirection])

  /** 排序指示器 SVG */
  const SortIcon = ({ column }: { column: SortColumn }) => {
    const isActive = sortColumn === column
    if (!isActive) {
      return (
        <svg className="w-3 h-3 ml-0.5 inline opacity-30" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5-5 5 5H7zM7 14l5 5 5-5H7z" />
        </svg>
      )
    }
    return sortDirection === 'asc' ? (
      <svg className="w-3 h-3 ml-0.5 inline text-amber-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 14l5-5 5 5H7z" />
      </svg>
    ) : (
      <svg className="w-3 h-3 ml-0.5 inline text-amber-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 10l5 5 5-5H7z" />
      </svg>
    )
  }

  /** 桌面版表格行 */
  const TableRow = ({ item }: { item: ScrollExchangeItem }) => (
    <tr
      className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
      onClick={() => onItemClick?.(item.ItemID, item.ItemName)}
    >
      <td className="px-6 py-2.5 text-gray-900 dark:text-white">
        <span className="inline-flex items-center gap-1.5">
          {item.ItemName}
          {droppableItemIds?.has(item.ItemID) && (
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 whitespace-nowrap">
              {t('scrollExchange.droppable')}
            </span>
          )}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getScrollTypeColor(item.ScrollType)}`}>
          {item.ScrollType}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className={`font-medium ${getPercentColor(item.ScrollPercent)}`}>
          {item.ScrollPercent}%
        </span>
      </td>
      <td className="px-3 py-2.5 text-center font-mono text-gray-700 dark:text-gray-300">
        {item.ExchangeRate}
      </td>
      <td className="px-3 py-2.5 text-center">
        {item.ScrollVoucherReq > 0 ? (
          <span className="text-amber-600 dark:text-amber-400 font-medium">{item.ScrollVoucherReq}</span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">-</span>
        )}
      </td>
    </tr>
  )

  /** 手機版卡片 */
  const MobileCard = ({ item }: { item: ScrollExchangeItem }) => (
    <button
      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      onClick={() => onItemClick?.(item.ItemID, item.ItemName)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-900 dark:text-white truncate">
            {item.ItemName}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${getScrollTypeColor(item.ScrollType)}`}>
              {item.ScrollType}
            </span>
            <span className={`text-xs font-medium ${getPercentColor(item.ScrollPercent)}`}>
              {item.ScrollPercent}%
            </span>
            {droppableItemIds?.has(item.ItemID) && (
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {t('scrollExchange.droppable')}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">
            {language === 'zh-TW' ? '兌換' : 'Rate'}: {item.ExchangeRate}
          </p>
          {item.ScrollVoucherReq > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Voucher: {item.ScrollVoucherReq}
            </p>
          )}
        </div>
      </div>
    </button>
  )

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('scrollExchange.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredData.length} / {data.length} {t('scrollExchange.items')}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 搜尋 + 篩選列 */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
        {/* 搜尋輸入 */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('scrollExchange.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 篩選下拉選單 */}
        <div className="flex flex-wrap gap-2">
          {/* Category 篩選 */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">{t('scrollExchange.allCategories')}</option>
            {ALL_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* ScrollType 篩選 */}
          <select
            value={selectedScrollType}
            onChange={(e) => setSelectedScrollType(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">{t('scrollExchange.allTypes')}</option>
            {ALL_SCROLL_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* 重置按鈕（有篩選時顯示） */}
          {(selectedCategory !== 'all' || selectedScrollType !== 'all' || searchTerm || sortColumn) && (
            <button
              onClick={() => {
                setSelectedCategory('all')
                setSelectedScrollType('all')
                setSearchTerm('')
                setSortColumn(null)
                setSortDirection('asc')
              }}
              className="text-sm px-3 py-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
            >
              {t('scrollExchange.reset')}
            </button>
          )}
        </div>
      </div>

      {/* 表格內容 */}
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {t('scrollExchange.noResults')}
          </div>
        ) : (
          <>
            {/* 桌面版：單一表格 */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-20 bg-white dark:bg-gray-800">
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th
                      className="px-6 py-2 font-medium cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 select-none transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      {t('scrollExchange.col.name')}
                      <SortIcon column="name" />
                    </th>
                    <th
                      className="px-3 py-2 font-medium text-center cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 select-none transition-colors"
                      onClick={() => handleSort('type')}
                    >
                      {t('scrollExchange.col.type')}
                      <SortIcon column="type" />
                    </th>
                    <th
                      className="px-3 py-2 font-medium text-center cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 select-none transition-colors"
                      onClick={() => handleSort('percent')}
                    >
                      {t('scrollExchange.col.percent')}
                      <SortIcon column="percent" />
                    </th>
                    <th
                      className="px-3 py-2 font-medium text-center cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 select-none transition-colors"
                      onClick={() => handleSort('rate')}
                    >
                      {t('scrollExchange.col.rate')}
                      <SortIcon column="rate" />
                    </th>
                    <th
                      className="px-3 py-2 font-medium text-center cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 select-none transition-colors"
                      onClick={() => handleSort('voucher')}
                    >
                      {t('scrollExchange.col.voucher')}
                      <SortIcon column="voucher" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(groupedData.entries()).map(([category, items]) => (
                    <Fragment key={category}>
                      <tr>
                        <td colSpan={5} className="px-6 py-2 bg-gray-100 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-600">
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            {category}
                            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">({items.length})</span>
                          </span>
                        </td>
                      </tr>
                      {items.map((item) => (
                        <TableRow key={item.ItemID} item={item} />
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 手機版：卡片 */}
            <div className="sm:hidden">
              {Array.from(groupedData.entries()).map(([category, items]) => (
                <div key={category}>
                  <div className="sticky top-0 px-4 py-2 bg-gray-100 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-600 z-10">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {category}
                      <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">({items.length})</span>
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {items.map((item) => (
                      <MobileCard key={item.ItemID} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** 根據捲軸屬性返回顏色 class */
function getScrollTypeColor(type: string): string {
  const colors: Record<string, string> = {
    STR: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    DEX: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    INT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    LUK: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    ATT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    Magic: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    Defense: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    Accuracy: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    Avoidability: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    Jump: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    Mobility: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  }
  return colors[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

/** 根據成功率返回顏色 class */
function getPercentColor(percent: number): string {
  if (percent >= 100) return 'text-green-600 dark:text-green-400'
  if (percent >= 60) return 'text-blue-600 dark:text-blue-400'
  if (percent >= 30) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}
