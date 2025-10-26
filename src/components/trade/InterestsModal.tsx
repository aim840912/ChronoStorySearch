'use client'

import { useState, useEffect } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { useDataManagement } from '@/hooks/useDataManagement'
import { useItemsData } from '@/hooks/useItemsData'
import { getItemImageUrl } from '@/lib/image-utils'
import { useAuth } from '@/contexts/AuthContext'

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
  }
}

export function InterestsModal({ isOpen, onClose }: InterestsModalProps) {
  const { user } = useAuth()
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

        if (!response.ok || !data.success) {
          setError(data.error || '載入購買意向失敗')
          return
        }

        if (activeTab === 'my-interests') {
          setMyInterests(data.data || [])
        } else {
          setReceivedInterests(data.data || [])
        }
      } catch (err) {
        console.error('Failed to fetch interests:', err)
        setError('網路錯誤，請檢查您的連線')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInterests()
  }, [isOpen, user, activeTab])

  // 格式化狀態文字
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待處理'
      case 'contacted': return '已聯絡'
      case 'completed': return '已完成'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  // 格式化狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'contacted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">購買意向</h2>

        {/* 未登入提示 */}
        {!user && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200">請先登入才能查看購買意向</p>
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
            我的意向
          </button>
          <button
            onClick={() => setActiveTab('received-interests')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'received-interests'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            收到的意向
          </button>
        </div>

        {/* 意向列表 */}
        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">載入中...</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {/* 我的意向 Tab */}
            {activeTab === 'my-interests' && (
              <>
                {myInterests.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                    目前沒有登記購買意向
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
                                  {item?.chineseItemName || item?.itemName || `物品 #${interest.listings.item_id}`}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  數量: {interest.listings.quantity}
                                </p>
                                {interest.listings.price && (
                                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                                    {interest.listings.price.toLocaleString()} 楓幣
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
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">我的留言:</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{interest.message}</p>
                              </div>
                            )}

                            {/* 時間資訊 */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              登記時間: {new Date(interest.created_at).toLocaleString('zh-TW')}
                            </p>

                            {/* 刊登狀態提示 */}
                            {interest.listings.status !== 'active' && (
                              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                                <p className="text-xs text-yellow-800 dark:text-yellow-400">
                                  此刊登已結束 ({interest.listings.status === 'sold' ? '已售出' : interest.listings.status === 'cancelled' ? '已取消' : interest.listings.status})
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
                    目前沒有收到購買意向
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
                                  {item?.chineseItemName || item?.itemName || `物品 #${interest.listing.item_id}`}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  數量: {interest.listing.quantity}
                                </p>
                                {interest.listing.price && (
                                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                                    {interest.listing.price.toLocaleString()} 楓幣
                                  </p>
                                )}
                              </div>

                              {/* 狀態標籤 */}
                              <span className={`px-2 py-1 text-xs rounded ${getStatusColor(interest.status)}`}>
                                {getStatusText(interest.status)}
                              </span>
                            </div>

                            {/* 買家資訊 */}
                            <div className="mt-3 flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                                {interest.buyer.discord_username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">買家:</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {interest.buyer.discord_username}
                                </p>
                              </div>
                            </div>

                            {/* 買家留言 */}
                            {interest.message && (
                              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">買家留言:</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{interest.message}</p>
                              </div>
                            )}

                            {/* 時間資訊 */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              登記時間: {new Date(interest.created_at).toLocaleString('zh-TW')}
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
