'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { tradeService } from '@/lib/supabase/trade-service'
import { TradeListingList } from './TradeListingList'
import { TradeListingForm } from './TradeListingForm'
import type { TradeType, TradeListingWithFavorite, TradeListing } from '@/types/trade'
import type { ExtendedUniqueItem, ItemAttributesEssential } from '@/types'

type TabType = 'browse' | 'favorites' | 'my' | 'create'

interface TradeSectionProps {
  searchItems: (query: string, limit?: number) => ExtendedUniqueItem[]
  // 篩選狀態（由 Header 控制）
  typeFilter: TradeType | 'all'
  searchQuery: string
  // 物品屬性（用於判斷裝備類型及取得基本素質）
  itemAttributesMap: Map<number, ItemAttributesEssential>
  // 瀏覽歷史記錄（選擇物品時記錄）
  onRecordView?: (type: 'monster' | 'item', id: number, name: string) => void
}

const ITEMS_PER_PAGE = 20

/**
 * 交易市場區塊（全頁面版本）
 * 包含四個標籤：瀏覽全部、我的收藏、我的刊登、發布新刊登
 */
export function TradeSection({ searchItems, typeFilter, searchQuery, itemAttributesMap, onRecordView }: TradeSectionProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { showToast } = useToast()

  // 標籤狀態
  const [activeTab, setActiveTab] = useState<TabType>('browse')

  // 列表狀態
  const [listings, setListings] = useState<TradeListingWithFavorite[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  // 編輯狀態
  const [editingListing, setEditingListing] = useState<TradeListing | null>(null)

  // 載入刊登列表
  const loadListings = useCallback(async (reset = false) => {
    const newOffset = reset ? 0 : offset

    setIsLoading(true)
    try {
      let result: { data: TradeListingWithFavorite[]; count: number }

      if (activeTab === 'favorites') {
        result = await tradeService.getFavorites(ITEMS_PER_PAGE, newOffset)
      } else if (activeTab === 'my') {
        const myResult = await tradeService.getMyListings(ITEMS_PER_PAGE, newOffset)
        result = {
          data: myResult.data.map(l => ({ ...l, isFavorited: false })),
          count: myResult.count,
        }
      } else {
        result = await tradeService.getListingsWithFavorites(
          {
            type: typeFilter === 'all' ? undefined : typeFilter,
            search: searchQuery || undefined,
          },
          ITEMS_PER_PAGE,
          newOffset
        )
      }

      if (reset) {
        setListings(result.data)
        setOffset(ITEMS_PER_PAGE)
      } else {
        // 合併時去重，避免分頁載入過程中產生重複項目
        setListings(prev => {
          const existingIds = new Set(prev.map(l => l.id))
          const newItems = result.data.filter(l => !existingIds.has(l.id))
          return [...prev, ...newItems]
        })
        setOffset(newOffset + ITEMS_PER_PAGE)
      }

      setHasMore(result.data.length === ITEMS_PER_PAGE && offset + ITEMS_PER_PAGE < result.count)
    } catch (error) {
      console.error('載入刊登失敗:', error)
      showToast(t('common.error'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, typeFilter, searchQuery, offset, showToast, t])

  // 載入資料
  useEffect(() => {
    if (activeTab !== 'create') {
      loadListings(true)
    }
  }, [activeTab, typeFilter, searchQuery])

  // 處理標籤切換
  const handleTabChange = useCallback((tab: TabType) => {
    if (tab !== 'browse' && !user) {
      showToast(t('trade.loginRequired'), 'info')
      return
    }
    setActiveTab(tab)
    setEditingListing(null)
    setOffset(0)
    setHasMore(true)
  }, [user, showToast, t])

  // 處理編輯
  const handleEdit = useCallback((listing: TradeListingWithFavorite) => {
    setEditingListing(listing)
    setActiveTab('create')
  }, [])

  // 處理刪除
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(t('trade.confirmDelete'))) return

    const success = await tradeService.deleteListing(id)
    if (success) {
      setListings(prev => prev.filter(l => l.id !== id))
      showToast(t('trade.deleteSuccess'), 'success')
    } else {
      showToast(t('common.error'), 'error')
    }
  }, [showToast, t])

  // 處理標記完成
  const handleMarkComplete = useCallback(async (id: string) => {
    const updated = await tradeService.updateListing(id, { status: 'completed' })
    if (updated) {
      setListings(prev => prev.filter(l => l.id !== id))
      showToast(t('trade.completeSuccess'), 'success')
    } else {
      showToast(t('common.error'), 'error')
    }
  }, [showToast, t])

  // 處理收藏切換
  const handleFavoriteToggle = useCallback((id: string, isFavorited: boolean) => {
    setListings(prev =>
      prev.map(l =>
        l.id === id ? { ...l, isFavorited } : l
      )
    )
  }, [])

  // 處理表單儲存
  const handleFormSave = useCallback(() => {
    setEditingListing(null)
    setActiveTab('my')
    loadListings(true)
  }, [loadListings])

  // 處理表單取消
  const handleFormCancel = useCallback(() => {
    setEditingListing(null)
    if (activeTab === 'create') {
      setActiveTab('browse')
    }
  }, [activeTab])

  const tabs: Array<{ key: TabType; label: string; requiresAuth: boolean }> = [
    { key: 'browse', label: t('trade.browse'), requiresAuth: false },
    { key: 'favorites', label: t('trade.favorites'), requiresAuth: true },
    { key: 'my', label: t('trade.myListings'), requiresAuth: true },
    { key: 'create', label: t('trade.create'), requiresAuth: true },
  ]

  return (
    <div className="w-full">
      {/* 標籤列 */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 mb-4">
        <div className="flex overflow-x-auto flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`min-w-fit px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : tab.requiresAuth && !user
                  ? 'text-gray-400 dark:text-gray-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* 刷新按鈕 - 只在列表頁顯示 */}
        {activeTab !== 'create' && (
          <button
            type="button"
            onClick={() => loadListings(true)}
            disabled={isLoading}
            className="ml-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isLoading ? t('common.loading') : t('trade.refresh')}
          </button>
        )}
      </div>

      {/* 內容區 */}
      <div>
        {activeTab === 'create' ? (
          // 發布/編輯表單
          <TradeListingForm
            editingListing={editingListing}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
            searchItems={searchItems}
            itemAttributesMap={itemAttributesMap}
            onRecordView={onRecordView}
          />
        ) : (
          // 列表區
          <TradeListingList
              listings={listings}
              isLoading={isLoading}
              hasMore={hasMore}
              onLoadMore={() => loadListings(false)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMarkComplete={handleMarkComplete}
              onFavoriteToggle={handleFavoriteToggle}
              emptyMessage={
                activeTab === 'favorites'
                  ? t('trade.noFavorites')
                  : activeTab === 'my'
                  ? t('trade.noMyListings')
                  : undefined
              }
            />
        )}
      </div>
    </div>
  )
}
