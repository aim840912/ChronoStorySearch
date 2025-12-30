'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { useBlacklist } from '@/hooks/useBlacklist'
import { tradeService } from '@/lib/supabase/trade-service'
import { TradeListingList } from './TradeListingList'
import { TradeListingForm } from './TradeListingForm'
import { BlacklistModal } from './BlacklistModal'
import type { TradeType, TradeListingWithFavorite, TradeListing, EquipmentStatsFilter, EquipmentStats } from '@/types/trade'
import type { ExtendedUniqueItem, ItemAttributesEssential } from '@/types'

type TabType = 'browse' | 'favorites' | 'my' | 'create'

interface TradeSectionProps {
  searchItems: (query: string, limit?: number) => ExtendedUniqueItem[]
  // 篩選狀態（由 Header 控制）
  typeFilter: TradeType | 'all'
  searchQuery: string
  statsFilter?: EquipmentStatsFilter
  // 物品屬性（用於判斷裝備類型及取得基本素質）
  itemAttributesMap: Map<number, ItemAttributesEssential>
  // 瀏覽歷史記錄（選擇物品時記錄）
  onRecordView?: (type: 'monster' | 'item', id: number, name: string) => void
}

/**
 * 檢查裝備素質是否符合篩選條件
 * 每個啟用的篩選條件都要求 >= 該最小值
 */
function matchesStatsFilter(
  equipmentStats: EquipmentStats | undefined,
  filter: EquipmentStatsFilter
): boolean {
  // 沒有篩選條件時，所有項目都符合
  const filterKeys = Object.keys(filter) as Array<keyof EquipmentStatsFilter>
  const activeFilters = filterKeys.filter(key => filter[key] !== undefined && filter[key] !== null)

  if (activeFilters.length === 0) return true

  // 有篩選條件但沒有裝備素質時，不符合
  if (!equipmentStats) return false

  // 檢查每個篩選條件
  return activeFilters.every(key => {
    const minValue = filter[key]!
    const actualValue = equipmentStats[key as keyof EquipmentStats]
    // 如果該素質不存在或小於最小值，則不符合
    if (actualValue === undefined || actualValue === null) return false
    return (actualValue as number) >= minValue
  })
}

const ITEMS_PER_PAGE = 20

/**
 * 交易市場區塊（全頁面版本）
 * 包含四個標籤：瀏覽全部、我的收藏、我的刊登、發布新刊登
 */
export function TradeSection({ searchItems, typeFilter, searchQuery, statsFilter = {}, itemAttributesMap, onRecordView }: TradeSectionProps) {
  const { t, language } = useLanguage()
  const { user, isServerMember, isVerified, listingLimit, discordInviteUrl } = useAuth()
  const { showToast } = useToast()
  const { entries: blacklistEntries, isBlocked, addToBlacklist, removeFromBlacklist } = useBlacklist()
  const isZh = language === 'zh-TW'

  // 標籤狀態
  const [activeTab, setActiveTab] = useState<TabType>('browse')
  // 黑名單 Modal 狀態
  const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false)
  // 進行中刊登數量（用於限制刊登數量）
  const [activeListingCount, setActiveListingCount] = useState(0)

  // 列表狀態（原始資料，未經素質過濾）
  const [listings, setListings] = useState<TradeListingWithFavorite[]>([])

  // 套用素質篩選與黑名單過濾後的列表
  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      // 過濾黑名單用戶（瀏覽和收藏模式下生效，我的刊登不過濾）
      if (activeTab !== 'my' && isBlocked(listing.discordUsername)) {
        return false
      }
      // 過濾素質
      return matchesStatsFilter(listing.equipmentStats, statsFilter)
    })
  }, [listings, statsFilter, activeTab, isBlocked])
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

  // 載入用戶進行中的刊登數量
  const loadActiveListingCount = useCallback(async () => {
    if (!user || isServerMember !== true) {
      setActiveListingCount(0)
      return
    }
    const count = await tradeService.getActiveListingCount()
    setActiveListingCount(count)
  }, [user, isServerMember])

  useEffect(() => {
    loadActiveListingCount()
  }, [loadActiveListingCount])

  // 處理標籤切換
  const handleTabChange = useCallback((tab: TabType) => {
    // 需要登入的標籤
    if (tab !== 'browse' && !user) {
      showToast(t('trade.loginRequired'), 'info')
      return
    }
    // 需要伺服器成員資格的標籤（收藏、我的刊登、發布）
    if ((tab === 'favorites' || tab === 'my' || tab === 'create') && isServerMember === false) {
      showToast(t('trade.joinServerRequired'), 'info')
      return
    }
    // 發布標籤需要檢查刊登上限
    if (tab === 'create' && activeListingCount >= listingLimit && !editingListing) {
      showToast(t('trade.listingLimitReached'), 'info')
      return
    }
    setActiveTab(tab)
    setEditingListing(null)
    setOffset(0)
    setHasMore(true)
    setListings([])  // 立即清除舊資料，避免切換時顯示前一個標籤的內容
  }, [user, isServerMember, activeListingCount, listingLimit, editingListing, showToast, t])

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

  // 處理加入黑名單
  const handleAddToBlacklist = useCallback(async (discordUsername: string) => {
    const success = await addToBlacklist(discordUsername)
    if (success) {
      showToast(isZh ? '已加入黑名單' : 'Added to blacklist', 'success')
    } else {
      showToast(isZh ? '操作失敗' : 'Failed', 'error')
    }
  }, [addToBlacklist, showToast, isZh])

  // 處理表單儲存
  const handleFormSave = useCallback(() => {
    setEditingListing(null)
    setActiveTab('my')
    loadListings(true)
    loadActiveListingCount() // 刷新刊登數量
  }, [loadListings, loadActiveListingCount])

  // 處理表單取消
  const handleFormCancel = useCallback(() => {
    setEditingListing(null)
    if (activeTab === 'create') {
      setActiveTab('browse')
    }
  }, [activeTab])

  // 非伺服器成員無法使用收藏和發布功能
  const canUseFullFeatures = isServerMember !== false
  // 是否達到刊登上限（無法新增更多刊登，但可以編輯現有刊登）
  const isAtListingLimit = activeListingCount >= listingLimit

  const tabs: Array<{ key: TabType; label: string; requiresAuth: boolean; requiresServerMember: boolean; requiresNotAtLimit?: boolean }> = [
    { key: 'browse', label: t('trade.browse'), requiresAuth: false, requiresServerMember: false },
    { key: 'favorites', label: t('trade.favorites'), requiresAuth: true, requiresServerMember: true },
    { key: 'my', label: t('trade.myListings'), requiresAuth: true, requiresServerMember: true },
    { key: 'create', label: t('trade.create'), requiresAuth: true, requiresServerMember: true, requiresNotAtLimit: true },
  ]

  return (
    <div className="w-full">
      {/* 標籤列 */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 mb-4">
        <div className="flex overflow-x-auto flex-1">
          {tabs.map((tab) => {
            const isDisabled =
              (tab.requiresAuth && !user) ||
              (tab.requiresServerMember && !canUseFullFeatures) ||
              (tab.requiresNotAtLimit && isAtListingLimit)
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`min-w-fit px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : isDisabled
                    ? 'text-gray-400 dark:text-gray-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        {/* 刷新按鈕 + 黑名單按鈕 - 只在列表頁顯示 */}
        {activeTab !== 'create' && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => loadListings(true)}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isLoading ? t('common.loading') : t('trade.refresh')}
            </button>
            {/* 黑名單按鈕 - 只在登入時顯示 */}
            {user && (
              <button
                type="button"
                onClick={() => setIsBlacklistModalOpen(true)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors whitespace-nowrap"
              >
                {isZh ? '黑名單' : 'Blacklist'}
                {blacklistEntries.length > 0 && (
                  <span className="ml-1 text-xs">({blacklistEntries.length})</span>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 非伺服器成員提示橫幅 */}
      {user && isServerMember === false && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>{t('trade.joinServerBanner')}</span>
          </div>
          <a
            href={discordInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
          >
            {t('trade.joinServer')}
          </a>
        </div>
      )}

      {/* 刊登上限提示橫幅 - 只有伺服器成員才顯示 */}
      {user && isServerMember === true && isAtListingLimit && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              {t('trade.listingCount', { count: activeListingCount, limit: listingLimit })}
            </span>
          </div>
          {/* 未認證用戶顯示升級提示 */}
          {!isVerified && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              {t('trade.getVerifiedForMore')}
            </p>
          )}
        </div>
      )}

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
              listings={filteredListings}
              isLoading={isLoading}
              hasMore={hasMore}
              onLoadMore={() => loadListings(false)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMarkComplete={handleMarkComplete}
              onFavoriteToggle={handleFavoriteToggle}
              onAddToBlacklist={handleAddToBlacklist}
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

      {/* 黑名單 Modal */}
      <BlacklistModal
        isOpen={isBlacklistModalOpen}
        onClose={() => setIsBlacklistModalOpen(false)}
        entries={blacklistEntries}
        onRemove={removeFromBlacklist}
      />
    </div>
  )
}
