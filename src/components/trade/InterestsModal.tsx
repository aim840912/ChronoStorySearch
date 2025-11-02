'use client'

import { useState, useEffect } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { useDataManagement } from '@/hooks/useDataManagement'
import { useItemsData } from '@/hooks/useItemsData'
import { getItemImageUrl } from '@/lib/image-utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { clientLogger } from '@/lib/logger'
import type { ExtendedUniqueItem } from '@/types'

/**
 * 購買意向管理 Modal
 *
 * 功能:
 * - Tab 切換: 我的意向, 收到的意向
 * - 我的意向: 顯示我登記的購買意向
 * - 收到的意向: 顯示別人對我的刊登登記的意向
 * - 顯示意向狀態: pending, contacted, completed, cancelled
 * - 顯示物品資訊和價格
 * - 顯示對方資訊
 * - TODO: 標記已聯絡/已完成按鈕 (階段 2 選做)
 *
 * 參考文件:
 * - docs/architecture/交易系統/03-API設計.md
 */

interface InterestsModalProps {
  isOpen: boolean
  onClose: () => void
}

type InterestTab = 'my-interests' | 'received-interests'

interface MyInterest {
  id: number
  listing_id: number
  buyer_id: string
  message: string | null
  status: string
  created_at: string
  updated_at: string
  listings: {
    id: number
    trade_type: 'sell' | 'buy' | 'exchange'
    item_id: number
    quantity: number
    price?: number
    status: string
  }
}

interface ReceivedInterest {
  id: number
  listing_id: number
  buyer_id: string
  message: string | null
  status: string
  created_at: string
  updated_at: string
  listing: {
    id: number
    user_id: string
    trade_type: 'sell' | 'buy' | 'exchange'
    item_id: number
    quantity: number
    price?: number
    wanted_item_id?: number
    status: string
  }
  buyer: {
    discord_username: string
    discord_id?: string | null
  }
}

export function InterestsModal({ isOpen, onClose }: InterestsModalProps) {
  const { user } = useAuth()
  const { language, t } = useLanguage()
  const [activeTab, setActiveTab] = useState<InterestTab>('my-interests')
  const [myInterests, setMyInterests] = useState<MyInterest[]>([])
  const [receivedInterests, setReceivedInterests] = useState<ReceivedInterest[]>([])
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

  // 載入購買意向
  useEffect(() => {
    const fetchInterests = async () => {
      if (!isOpen || !user) return

      setIsLoading(true)
      setError(null)

      try {
        const endpoint = activeTab === 'my-interests'
          ? '/api/interests'
          : '/api/interests/received'

        const response = await fetch(endpoint, {
          credentials: 'include'
        })

        const data = await response.json()

        // 除錯：輸出購買意向資料和狀態值
        clientLogger.debug(`[InterestsModal] ${activeTab} 資料`, {
          data: data.data,
          count: data.data?.length
        })
        clientLogger.debug('[InterestsModal] Status 值分佈', {
          statuses: data.data?.map((i: MyInterest | ReceivedInterest) => i.status)
        })

        if (!response.ok || !data.success) {
          setError(data.error || t('interest.loadError'))
          return
        }

        if (activeTab === 'my-interests') {
          setMyInterests(data.data || [])
        } else {
          setReceivedInterests(data.data || [])
        }
      } catch (err) {
        clientLogger.error('Failed to fetch interests:', err)
        setError(t('interest.networkError'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchInterests()
  }, [isOpen, user, activeTab, t])

  // 格式化狀態文字
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t('interest.status.pending')
      case 'contacted': return t('interest.status.contacted')
      case 'completed': return t('interest.status.completed')
      case 'cancelled': return t('interest.status.cancelled')
      default: return status
    }
  }

  // 格式化狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700'
      case 'contacted': return 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700'
      case 'completed': return 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700'
      case 'cancelled': return 'bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
      default: return 'bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
    }
  }

  // 根據語言選擇物品名稱
  const getDisplayItemName = (item: ExtendedUniqueItem | undefined, itemId?: number) => {
    if (!item) {
      return itemId ? (language === 'zh-TW' ? `物品 #${itemId}` : `Item #${itemId}`) : (language === 'zh-TW' ? '未知物品' : 'Unknown Item')
    }
    if (language === 'zh-TW') {
      return item.chineseItemName || item.itemName || (itemId ? `物品 #${itemId}` : '未知物品')
    }
    return item.itemName || (itemId ? `Item #${itemId}` : 'Unknown Item')
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">{t('interest.title')}</h2>

        {/* 未登入提示 */}
        {!user && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200">{t('interest.loginRequired')}</p>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Tab 切換 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('my-interests')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'my-interests'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {t('interest.tab.myInterests')}
          </button>
          <button
            onClick={() => setActiveTab('received-interests')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'received-interests'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {t('interest.tab.receivedInterests')}
          </button>
        </div>

        {/* 意向列表 */}
        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {/* 我的意向 Tab */}
            {activeTab === 'my-interests' && (
              <>
                {myInterests.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                    {t('interest.empty.myInterests')}
                  </div>
                ) : (
                  myInterests.map((interest) => {
                    const item = getItemById(interest.listings.item_id)

                    return (
                      <div
                        key={interest.id}
                        className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800"
                      >
                        <div className="flex gap-4">
                          {/* 物品圖片 */}
                          <img
                            src={getItemImageUrl(interest.listings.item_id)}
                            alt={item?.itemName || String(interest.listings.item_id)}
                            className="w-16 h-16 object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                            }}
                          />

                          {/* 物品資訊 */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {getDisplayItemName(item, interest.listings.item_id)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {t('listing.quantity')}: {interest.listings.quantity}
                                </p>
                                {interest.listings.price && (
                                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                                    {interest.listings.price.toLocaleString()} {t('listing.meso')}
                                  </p>
                                )}
                              </div>

                              {/* 狀態標籤 */}
                              <span className={`px-2 py-1 text-xs rounded ${getStatusColor(interest.status)}`}>
                                {getStatusText(interest.status)}
                              </span>
                            </div>

                            {/* 留言內容 */}
                            {interest.message && (
                              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('interest.myMessage')}</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{interest.message}</p>
                              </div>
                            )}

                            {/* 時間資訊 */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              {t('interest.registeredAt')} {new Date(interest.created_at).toLocaleString('zh-TW')}
                            </p>

                            {/* 刊登狀態提示 */}
                            {interest.listings.status !== 'active' && (
                              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                                <p className="text-xs text-yellow-800 dark:text-yellow-400">
                                  {t('interest.listingEnded')} ({interest.listings.status === 'sold' ? t('listing.statusSold') : interest.listings.status === 'cancelled' ? t('listing.statusCancelled') : interest.listings.status})
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </>
            )}

            {/* 收到的意向 Tab */}
            {activeTab === 'received-interests' && (
              <>
                {receivedInterests.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                    {t('interest.empty.receivedInterests')}
                  </div>
                ) : (
                  receivedInterests.map((interest) => {
                    const item = getItemById(interest.listing.item_id)

                    return (
                      <div
                        key={interest.id}
                        className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800"
                      >
                        <div className="flex gap-4">
                          {/* 物品圖片 */}
                          <img
                            src={getItemImageUrl(interest.listing.item_id)}
                            alt={item?.itemName || String(interest.listing.item_id)}
                            className="w-16 h-16 object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                            }}
                          />

                          {/* 物品和買家資訊 */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {getDisplayItemName(item, interest.listing.item_id)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {t('listing.quantity')}: {interest.listing.quantity}
                                </p>
                                {interest.listing.price && (
                                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                                    {interest.listing.price.toLocaleString()} {t('listing.meso')}
                                  </p>
                                )}
                              </div>

                              {/* 狀態標籤 */}
                              <span className={`px-2 py-1 text-xs rounded ${getStatusColor(interest.status)}`}>
                                {getStatusText(interest.status)}
                              </span>
                            </div>

                            {/* 買家資訊 */}
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                  {interest.buyer.discord_username.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('interest.buyer')}</p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {interest.buyer.discord_username}
                                  </p>
                                </div>
                              </div>

                              {/* 聯絡買家按鈕 */}
                              {interest.buyer.discord_id && interest.listing.status === 'active' && (
                                <div className="mt-3 flex gap-2">
                                  <a
                                    href={`discord://users/${interest.buyer.discord_id}`}
                                    className="flex-1 text-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                                    </svg>
                                    在 Discord 中開啟
                                  </a>
                                  <a
                                    href={`https://discord.com/users/${interest.buyer.discord_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 text-center px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    網頁版開啟
                                  </a>
                                </div>
                              )}

                              {/* 刊登狀態提示 */}
                              {interest.listing.status !== 'active' && (
                                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                      {t('interest.listingEnded')}
                                      {interest.listing.status === 'sold' && ` (${t('listing.statusSold')})`}
                                      {interest.listing.status === 'cancelled' && ` (${t('listing.statusCancelled')})`}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 買家留言 */}
                            {interest.message && (
                              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('interest.buyerMessage')}</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{interest.message}</p>
                              </div>
                            )}

                            {/* 時間資訊 */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              {t('interest.registeredAt')} {new Date(interest.created_at).toLocaleString('zh-TW')}
                            </p>

                            {/* TODO: 階段 2 選做 - 標記已聯絡/已完成按鈕 */}
                            {/*
                            {interest.status === 'pending' && (
                              <div className="mt-3 flex gap-2">
                                <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                                  標記已聯絡
                                </button>
                                <button className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">
                                  標記已完成
                                </button>
                              </div>
                            )}
                            */}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  )
}
