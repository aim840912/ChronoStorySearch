'use client'

import { useState, useEffect } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { useDataManagement } from '@/hooks/useDataManagement'
import { useItemsData } from '@/hooks/useItemsData'
import { getItemImageUrl } from '@/lib/image-utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { ListingDetailModal } from './ListingDetailModal'

/**
 * 交換匹配 Modal
 *
 * 功能:
 * - 顯示與我的交換刊登互相匹配的刊登
 * - 智能匹配算法: 我有 A 想要 B ↔ 對方有 B 想要 A
 * - 顯示匹配分數 (0-100)
 * - 顯示對方信譽資訊
 * - 點擊查看詳情
 *
 * 參考文件:
 * - docs/architecture/交易系統/03-API設計.md (exchange-matches endpoint)
 * - docs/architecture/交易系統/09-設計決策記錄.md (DDR-004)
 */

interface ExchangeMatchModalProps {
  isOpen: boolean
  onClose: () => void
  listingId: number | null
}

interface MyListing {
  id: number
  item_id: number
  wanted_item_id: number
  quantity: number
  wanted_quantity: number
}

interface Match {
  id: number
  user_id: string
  trade_type: string
  item_id: number
  wanted_item_id: number
  quantity: number
  wanted_quantity: number
  status: string
  view_count: number
  interest_count: number
  created_at: string
  seller: {
    discord_username: string
    reputation_score: number
  }
  match_score: number
}

export function ExchangeMatchModal({
  isOpen,
  onClose,
  listingId
}: ExchangeMatchModalProps) {
  const { user } = useAuth()
  const { language } = useLanguage()
  const [myListing, setMyListing] = useState<MyListing | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 刊登詳情 Modal 狀態
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)

  // 載入物品資料
  const { allDrops, gachaMachines, loadGachaMachines } = useDataManagement()
  const { getItemById } = useItemsData({ allDrops, gachaMachines })

  // 確保轉蛋機資料已載入
  useEffect(() => {
    if (isOpen && gachaMachines.length === 0) {
      loadGachaMachines()
    }
  }, [isOpen, gachaMachines.length, loadGachaMachines])

  // 載入交換匹配
  useEffect(() => {
    const fetchMatches = async () => {
      if (!isOpen || !listingId || !user) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/market/exchange-matches?listing_id=${listingId}`,
          { credentials: 'include' }
        )

        const data = await response.json()

        if (!response.ok || !data.success) {
          setError(data.error || '載入匹配失敗')
          return
        }

        setMyListing(data.data.my_listing)
        setMatches(data.data.matches || [])
      } catch (err) {
        console.error('Failed to fetch exchange matches:', err)
        setError('網路錯誤，請檢查您的連線')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMatches()
  }, [isOpen, listingId, user])

  // 獲取匹配分數顏色
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  // 獲取匹配分數背景色
  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-900/20'
    if (score >= 70) return 'bg-blue-100 dark:bg-blue-900/20'
    if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/20'
    return 'bg-gray-100 dark:bg-gray-700'
  }

  // 打開匹配詳情
  const handleOpenDetail = (matchId: number) => {
    setSelectedMatchId(matchId)
    setDetailModalOpen(true)
  }

  // 根據語言選擇物品名稱
  const getDisplayItemName = (item: any, itemId?: number) => {
    if (!item) {
      return itemId ? (language === 'zh-TW' ? `物品 #${itemId}` : `Item #${itemId}`) : (language === 'zh-TW' ? '未知物品' : 'Unknown Item')
    }
    if (language === 'zh-TW') {
      return item.chineseItemName || item.itemName || (itemId ? `物品 #${itemId}` : '未知物品')
    }
    return item.itemName || (itemId ? `Item #${itemId}` : 'Unknown Item')
  }

  const myItem = myListing ? getItemById(myListing.item_id) : null
  const myWantedItem = myListing ? getItemById(myListing.wanted_item_id) : null

  return (
    <>
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">交換匹配</h2>

        {/* 未登入提示 */}
        {!user && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200">請先登入才能查看交換匹配</p>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* 我的交換刊登 */}
        {myListing && myItem && myWantedItem && (
          <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold mb-3 text-purple-900 dark:text-purple-200">我的交換刊登</h3>
            <div className="flex items-center justify-center gap-6">
              {/* 我有的物品 */}
              <div className="flex items-center gap-3">
                <img
                  src={getItemImageUrl(myListing.item_id)}
                  alt={myItem.itemName}
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                  }}
                />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">我有</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {getDisplayItemName(myItem)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">× {myListing.quantity}</p>
                </div>
              </div>

              {/* 交換箭頭 */}
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">交換</p>
              </div>

              {/* 我想要的物品 */}
              <div className="flex items-center gap-3">
                <img
                  src={getItemImageUrl(myListing.wanted_item_id)}
                  alt={myWantedItem.itemName}
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                  }}
                />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">我想要</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {getDisplayItemName(myWantedItem)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">× {myListing.wanted_quantity || '任意'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 匹配列表 */}
        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">尋找匹配中...</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {matches.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mb-2 font-medium">目前沒有找到匹配的交換刊登</p>
                <p className="text-sm">
                  系統會持續尋找，有新匹配時會通知您
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    找到 <span className="font-semibold text-purple-600 dark:text-purple-400">{matches.length}</span> 個匹配的交換刊登
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>90+</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>70+</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span>50+</span>
                    </div>
                  </div>
                </div>

                {matches.map((match) => {
                  const matchItem = getItemById(match.item_id)
                  const matchWantedItem = getItemById(match.wanted_item_id)

                  return (
                    <div
                      key={match.id}
                      onClick={() => handleOpenDetail(match.id)}
                      className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800
                                 hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <div className="flex gap-4">
                        {/* 匹配分數徽章 */}
                        <div className={`flex-shrink-0 w-20 h-20 rounded-lg ${getScoreBgColor(match.match_score)} flex flex-col items-center justify-center`}>
                          <p className={`text-2xl font-bold ${getScoreColor(match.match_score)}`}>
                            {match.match_score}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">匹配度</p>
                        </div>

                        {/* 交換物品資訊 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-6 mb-3">
                            {/* 對方有的物品 (我想要的) */}
                            <div className="flex items-center gap-2 flex-1">
                              <img
                                src={getItemImageUrl(match.item_id)}
                                alt={matchItem?.itemName || String(match.item_id)}
                                className="w-12 h-12 object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect width="48" height="48" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 dark:text-gray-400">對方有 (你想要)</p>
                                <p className="font-semibold text-gray-900 dark:text-white truncate">
                                  {getDisplayItemName(matchItem, match.item_id)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">× {match.quantity}</p>
                              </div>
                            </div>

                            {/* 箭頭 */}
                            <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>

                            {/* 對方想要的物品 (我有的) */}
                            <div className="flex items-center gap-2 flex-1">
                              <img
                                src={getItemImageUrl(match.wanted_item_id)}
                                alt={matchWantedItem?.itemName || String(match.wanted_item_id)}
                                className="w-12 h-12 object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect width="48" height="48" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 dark:text-gray-400">對方想要 (你有)</p>
                                <p className="font-semibold text-gray-900 dark:text-white truncate">
                                  {getDisplayItemName(matchWantedItem, match.wanted_item_id)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">× {match.wanted_quantity || '任意'}</p>
                              </div>
                            </div>
                          </div>

                          {/* 賣家資訊 */}
                          <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                                {match.seller.discord_username.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {match.seller.discord_username}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {match.seller.reputation_score}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(match.created_at).toLocaleDateString('zh-TW')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </BaseModal>

    {/* 匹配詳情 Modal */}
    <ListingDetailModal
      isOpen={detailModalOpen}
      onClose={() => setDetailModalOpen(false)}
      listingId={selectedMatchId}
    />
    </>
  )
}
