'use client'

import { useState, useEffect } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { useDataManagement } from '@/hooks/useDataManagement'
import { useItemsData } from '@/hooks/useItemsData'
import { getItemImageUrl } from '@/lib/image-utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { ExchangeMatchModal } from './ExchangeMatchModal'
import { StatsComparisonCard } from './StatsComparisonCard'
import type { ItemStats } from '@/types/item-stats'
import type { WantedItem } from '@/types'

/**
 * 刊登詳情 Modal
 *
 * 功能:
 * - 顯示物品詳細資訊
 * - 顯示價格/交換資訊
 * - 顯示賣家資訊和信譽
 * - 顯示聯絡方式 (需檢查配額)
 * - 登記購買意向按鈕
 * - 舉報按鈕 (TODO: 階段 3)
 * - 交換匹配按鈕 (TODO: 階段 1)
 *
 * 參考文件:
 * - docs/architecture/交易系統/03-API設計.md
 */

interface ListingDetailModalProps {
  isOpen: boolean
  onClose: () => void
  listingId: number | null
  onInterestRegistered?: () => void
  zIndex?: string
}

interface ListingDetail {
  id: number
  user_id: string
  trade_type: 'sell' | 'buy' | 'exchange'
  item_id: number
  quantity: number
  price?: number
  wanted_items?: WantedItem[]
  discord_contact: string      // Discord 聯絡方式（必填）
  ingame_name: string | null   // 遊戲內角色名（選填）
  seller_discord_id: string | null  // Discord User ID（用於 Deep Link）
  status: string
  view_count: number
  interest_count: number
  created_at: string
  seller: {
    discord_username: string
    reputation_score: number
  }
  is_own_listing: boolean
  // 裝備屬性
  item_stats?: ItemStats | null
}

interface ContactInfo {
  discord: string              // Discord 聯絡方式（必定有值）
  ingame: string | null        // 遊戲內角色名（選填）
  discordId?: string | null    // Discord User ID（用於 Deep Link）
  quota_remaining: number
  is_own_listing: boolean
}

export function ListingDetailModal({
  isOpen,
  onClose,
  listingId,
  onInterestRegistered,
  zIndex = 'z-50'
}: ListingDetailModalProps) {
  const { user } = useAuth()
  const { language, t } = useLanguage()
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null)
  const [isLoadingListing, setIsLoadingListing] = useState(false)
  const [isLoadingContact, setIsLoadingContact] = useState(false)
  const [isRegisteringInterest, setIsRegisteringInterest] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [interestMessage, setInterestMessage] = useState('')
  const [exchangeMatchOpen, setExchangeMatchOpen] = useState(false)

  // 載入物品資料
  const { allDrops, gachaMachines, loadGachaMachines } = useDataManagement()
  const { getItemById } = useItemsData({ allDrops, gachaMachines })

  // 確保轉蛋機資料已載入
  useEffect(() => {
    if (isOpen && gachaMachines.length === 0) {
      loadGachaMachines()
    }
  }, [isOpen, gachaMachines.length, loadGachaMachines])

  // 載入刊登詳情
  useEffect(() => {
    const fetchListing = async () => {
      if (!isOpen || !listingId || !user) return

      setIsLoadingListing(true)
      setError(null)
      setContactInfo(null)

      try {
        const response = await fetch(`/api/listings/${listingId}`, {
          credentials: 'include'
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          setError(data.error || '載入刊登詳情失敗')
          return
        }

        setListing(data.data)
      } catch (err) {
        console.error('Failed to fetch listing detail:', err)
        setError('網路錯誤，請檢查您的連線')
      } finally {
        setIsLoadingListing(false)
      }
    }

    fetchListing()
  }, [isOpen, listingId, user])

  // 查看聯絡方式
  const handleViewContact = async () => {
    if (!listingId) return

    setIsLoadingContact(true)
    setError(null)

    try {
      const response = await fetch(`/api/listings/${listingId}/contact`, {
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || '查看聯絡方式失敗')
        return
      }

      setContactInfo(data.data)
    } catch (err) {
      console.error('Failed to fetch contact info:', err)
      setError('網路錯誤')
    } finally {
      setIsLoadingContact(false)
    }
  }

  // 登記購買意向
  const handleRegisterInterest = async () => {
    if (!listingId) return

    setIsRegisteringInterest(true)
    setError(null)

    try {
      const response = await fetch('/api/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          listing_id: listingId,
          message: interestMessage.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || t('listing.createError'))
        return
      }

      alert(t('listing.registerInterestSuccess'))
      setInterestMessage('')
      onInterestRegistered?.()
      onClose()
    } catch (err) {
      console.error('Failed to register interest:', err)
      setError('網路錯誤')
    } finally {
      setIsRegisteringInterest(false)
    }
  }

  if (!listing && !isLoadingListing) {
    return null
  }

  const item = listing ? getItemById(listing.item_id) : null

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

  return (
    <>
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" zIndex={zIndex}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">{t('listing.detail')}</h2>

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

        {/* 載入中 */}
        {isLoadingListing ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
          </div>
        ) : listing ? (
          <div className="space-y-6">
            {/* 交換模式：雙向箭頭顯示 */}
            {listing.trade_type === 'exchange' ? (
              <div className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
                <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">{t('listing.exchangeFor')}</h3>

                {/* 我提供的物品 */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2 text-purple-700 dark:text-purple-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    <span className="font-medium">{t('listing.iProvide')}</span>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <img
                        src={getItemImageUrl(listing.item_id)}
                        alt={item?.itemName || String(listing.item_id)}
                        className="w-16 h-16 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {getDisplayItemName(item, listing.item_id)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('listing.quantity')}: {listing.quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 雙向箭頭 */}
                <div className="flex justify-center my-3">
                  <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>

                {/* 我想要的物品 */}
                <div>
                  <div className="flex items-center gap-2 mb-2 text-purple-700 dark:text-purple-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="font-medium">{t('listing.iWant')}</span>
                  </div>
                  {listing.wanted_items && listing.wanted_items.length > 0 ? (
                    <div className="space-y-2">
                      {listing.wanted_items.map((wantedItem, index) => {
                        const wantedItemData = getItemById(wantedItem.item_id)
                        return (
                          <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {getDisplayItemName(wantedItemData, wantedItem.item_id)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {t('listing.quantity')}: {wantedItem.quantity}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        {language === 'zh-TW' ? '此交換刊登尚未設定想要的物品' : 'No wanted items specified for this exchange listing'}
                      </p>
                    </div>
                  )}
                </div>

                {/* 統計資訊 */}
                <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                  <span>{t('listing.viewCount')}: {listing.view_count}</span>
                  <span>{t('listing.interestCount')}: {listing.interest_count}</span>
                </div>
              </div>
            ) : (
              /* 買賣模式：一般物品資訊 */
              <div className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('listing.itemInfo')}</h3>
                <div className="flex items-center gap-4">
                  <img
                    src={getItemImageUrl(listing.item_id)}
                    alt={item?.itemName || String(listing.item_id)}
                    className="w-20 h-20 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {getDisplayItemName(item, listing.item_id)}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">{t('listing.quantity')}: {listing.quantity}</p>

                    {/* 價格 */}
                    {listing.price && (
                      <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {listing.price.toLocaleString()} {t('listing.meso')}
                      </p>
                    )}

                    {/* 交易類型標籤 */}
                    <div className="mt-2">
                      <span className={`inline-block px-2 py-1 text-xs rounded ${
                        listing.trade_type === 'sell' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                        {listing.trade_type === 'sell' ? t('trade.type.sell') : t('trade.type.buy')}
                      </span>
                    </div>

                    {/* 統計資訊 */}
                    <div className="flex gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>{t('listing.viewCount')}: {listing.view_count}</span>
                      <span>{t('listing.interestCount')}: {listing.interest_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 裝備屬性 */}
            {listing.item_stats && (
              <div className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('listing.itemStats')}</h3>
                <StatsComparisonCard
                  stats={listing.item_stats}
                  locale={language}
                  showMaxValues={false}
                  compact={true}
                />
              </div>
            )}

            {/* 賣家資訊 */}
            <div className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('listing.sellerInfo')}</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-semibold">
                  {listing.seller.discord_username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {listing.seller.discord_username}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('listing.reputationScore')}: {listing.seller.reputation_score}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 聯絡方式 */}
            {(!listing.is_own_listing || process.env.NODE_ENV === 'development') && (
              <div className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('listing.contactMethod')}</h3>
                {contactInfo ? (
                  <div className="space-y-3">
                    {/* Discord 聯絡方式 */}
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      <div className="flex-1">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Discord</div>
                        <div className="font-medium text-gray-900 dark:text-white">{contactInfo.discord}</div>
                        {contactInfo.discordId && (
                          <div className="mt-2 flex gap-2">
                            <a
                              href={`discord://users/${contactInfo.discordId}`}
                              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                            >
                              {t('listing.openInDiscord')}
                            </a>
                            <span className="text-sm text-gray-400">|</span>
                            <a
                              href={`https://discord.com/users/${contactInfo.discordId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                            >
                              {t('listing.openInWeb')}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 遊戲內角色名（如果有） */}
                    {contactInfo.ingame && (
                      <div className="flex items-start gap-3 pt-2 border-t dark:border-gray-700">
                        <svg className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                        </svg>
                        <div className="flex-1">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t('listing.ingameName')}
                          </div>
                          <div className="font-medium text-gray-900 dark:text-white">{contactInfo.ingame}</div>
                        </div>
                      </div>
                    )}
                    {/* 只有不是自己的刊登才顯示配額資訊 */}
                    {!contactInfo.is_own_listing && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('listing.quotaRemaining')}: {t('listing.quotaFormat', { remaining: contactInfo.quota_remaining })}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleViewContact}
                    disabled={isLoadingContact}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg
                               hover:bg-green-600 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingContact ? t('listing.loadingContact') : t('listing.viewContact')}
                  </button>
                )}
              </div>
            )}

            {/* 登記購買意向 */}
            {(!listing.is_own_listing || process.env.NODE_ENV === 'development') && (
              <div className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('listing.registerInterest')}</h3>
                <textarea
                  value={interestMessage}
                  onChange={(e) => setInterestMessage(e.target.value)}
                  placeholder={t('listing.messageToSeller')}
                  className="w-full p-3 border rounded-lg dark:border-gray-600
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             placeholder-gray-400 dark:placeholder-gray-500
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('listing.characterLimit', { current: interestMessage.length, max: 500 })}
                </p>
                <button
                  onClick={handleRegisterInterest}
                  disabled={isRegisteringInterest}
                  className="mt-3 w-full px-4 py-2 bg-blue-500 text-white rounded-lg
                             hover:bg-blue-600 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegisteringInterest ? t('listing.registering') : t('listing.registerInterestBtn')}
                </button>
              </div>
            )}

            {/* 交換匹配按鈕 */}
            {listing.trade_type === 'exchange' && (!listing.is_own_listing || process.env.NODE_ENV === 'development') && (
              <div className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('listing.exchangeMatch')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('listing.exchangeMatchDesc')}
                </p>
                <button
                  onClick={() => setExchangeMatchOpen(true)}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg
                             hover:bg-purple-600 transition-colors
                             flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  {t('listing.viewExchangeMatch')}
                </button>
              </div>
            )}

            {/* 自己的刊登提示 */}
            {listing.is_own_listing && process.env.NODE_ENV !== 'development' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-blue-800 dark:text-blue-200">{t('listing.ownListing')}</p>
              </div>
            )}

            {/* TODO: 舉報按鈕 (階段 3) */}
          </div>
        ) : null}
      </div>
    </BaseModal>

    {/* 交換匹配 Modal */}
    {listing && listing.trade_type === 'exchange' && (
      <ExchangeMatchModal
        isOpen={exchangeMatchOpen}
        onClose={() => setExchangeMatchOpen(false)}
        listingId={listing.id}
      />
    )}
    </>
  )
}
