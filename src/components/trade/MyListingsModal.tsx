'use client'

import { useState, useEffect } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { useDataManagement } from '@/hooks/useDataManagement'
import { useItemsData } from '@/hooks/useItemsData'
import { getItemImageUrl } from '@/lib/image-utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 我的刊登 Modal
 *
 * 功能:
 * - 顯示我的刊登列表
 * - 支援篩選: active, sold, cancelled, all
 * - 編輯刊登（更新價格、數量等）
 * - 刪除刊登
 * - 標記已售出
 * - 顯示瀏覽次數和購買意向數
 *
 * 參考文件:
 * - docs/architecture/交易系統/03-API設計.md
 */

interface MyListingsModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateNew?: () => void
}

type StatusFilter = 'active' | 'sold' | 'cancelled' | 'all'

interface Listing {
  id: number
  trade_type: 'sell' | 'buy' | 'exchange'
  item_id: number
  quantity: number
  price?: number
  wanted_item_id?: number
  wanted_quantity?: number
  status: string
  view_count: number
  interest_count: number
  created_at: string
  updated_at: string
}

export function MyListingsModal({ isOpen, onClose, onCreateNew }: MyListingsModalProps) {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 載入物品資料
  const { allDrops, gachaMachines, loadGachaMachines } = useDataManagement()
  const { getItemById } = useItemsData({ allDrops, gachaMachines })

  // 確保轉蛋機資料已載入
  useEffect(() => {
    if (isOpen && gachaMachines.length === 0) {
      loadGachaMachines()
    }
  }, [isOpen, gachaMachines.length, loadGachaMachines])

  // 載入我的刊登
  useEffect(() => {
    const fetchMyListings = async () => {
      if (!isOpen || !user) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/listings?status=${statusFilter}`,
          { credentials: 'include' }
        )

        const data = await response.json()

        if (!response.ok || !data.success) {
          setError(data.error || '載入刊登失敗')
          return
        }

        setListings(data.data || [])
      } catch (err) {
        console.error('Failed to fetch my listings:', err)
        setError('網路錯誤，請檢查您的連線')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMyListings()
  }, [isOpen, user, statusFilter])

  // 刪除刊登
  const handleDelete = async (listingId: number) => {
    if (!confirm(t('listing.deleteConfirm'))) return

    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        alert(data.error || t('listing.deleteError'))
        return
      }

      // 重新載入列表
      setListings(prev => prev.filter(l => l.id !== listingId))
      alert(t('listing.deleteSuccess'))
    } catch (err) {
      console.error('Failed to delete listing:', err)
      alert(t('common.error'))
    }
  }

  // 標記為已售出
  const handleMarkAsSold = async (listingId: number) => {
    if (!confirm(t('listing.markAsSoldConfirm'))) return

    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'sold' })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        alert(data.error || t('listing.deleteError'))
        return
      }

      // 更新列表
      setListings(prev => prev.map(l =>
        l.id === listingId ? { ...l, status: 'sold' } : l
      ))
      alert(t('listing.markAsSoldSuccess'))
    } catch (err) {
      console.error('Failed to update listing:', err)
      alert(t('common.error'))
    }
  }

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
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{t('listing.myListingsTitle')}</h2>
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg
                         hover:bg-blue-600 transition-colors"
            >
              {t('listing.createNewBtn')}
            </button>
          )}
        </div>

        {/* 未登入提示 */}
        {!user && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200">{t('listing.loginToView')}</p>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* 狀態篩選 */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { value: 'all', label: t('listing.statusAll') },
            { value: 'active', label: t('listing.statusActive') },
            { value: 'sold', label: t('listing.statusSold') },
            { value: 'cancelled', label: t('listing.statusCancelled') }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value as StatusFilter)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                statusFilter === tab.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 刊登列表 */}
        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {listings.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                {statusFilter === 'all' ? t('listing.noListings') : t('listing.noListingsFiltered', { status: t(`listing.status${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`) })}
              </div>
            ) : (
              listings.map((listing) => {
                const item = getItemById(listing.item_id)
                const wantedItem = listing.wanted_item_id ? getItemById(listing.wanted_item_id) : null

                return (
                  <div
                    key={listing.id}
                    className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                    <div className="flex gap-4">
                      {/* 物品資訊 */}
                      <div className="flex items-center gap-3 flex-1">
                        <img
                          src={getItemImageUrl(listing.item_id)}
                          alt={item?.itemName || String(listing.item_id)}
                          className="w-16 h-16 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {getDisplayItemName(item, listing.item_id)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('listing.quantity')}: {listing.quantity}
                          </p>

                          {/* 價格或交換資訊 */}
                          {listing.trade_type === 'exchange' && wantedItem ? (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {t('listing.exchange')}: {getDisplayItemName(wantedItem)}
                            </p>
                          ) : (
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {listing.price?.toLocaleString()} {t('listing.meso')}
                            </p>
                          )}

                          {/* 統計資訊 */}
                          <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span>{t('listing.viewCount')}: {listing.view_count}</span>
                            <span>{t('listing.interestCount')}: {listing.interest_count}</span>
                          </div>
                        </div>
                      </div>

                      {/* 狀態標籤 */}
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          listing.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          listing.status === 'sold' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {listing.status === 'active' ? t('listing.statusActive') : listing.status === 'sold' ? t('listing.statusSold') : t('listing.statusCancelled')}
                        </span>

                        {/* 操作按鈕 */}
                        {listing.status === 'active' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleMarkAsSold(listing.id)}
                              className="px-3 py-1 text-sm bg-green-500 text-white rounded
                                         hover:bg-green-600 transition-colors"
                            >
                              {t('listing.markAsSold')}
                            </button>
                            <button
                              onClick={() => handleDelete(listing.id)}
                              className="px-3 py-1 text-sm bg-red-500 text-white rounded
                                         hover:bg-red-600 transition-colors"
                            >
                              {t('listing.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </BaseModal>
  )
}
