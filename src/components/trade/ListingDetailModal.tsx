'use client'

import { useState, useEffect } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { useDataManagement } from '@/hooks/useDataManagement'
import { useItemsData } from '@/hooks/useItemsData'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { ExchangeMatchModal } from './ExchangeMatchModal'
import type { ItemStats } from '@/types/item-stats'
import type { WantedItem } from '@/types'
import { clientLogger } from '@/lib/logger'
import { toast } from 'react-hot-toast'
import { ListingItemInfo } from './detail/ListingItemInfo'
import { ExchangeInfoCard } from './detail/ExchangeInfoCard'
import { ListingItemStats } from './detail/ListingItemStats'
import { ListingNotes } from './detail/ListingNotes'
import { SellerInfoCard } from './detail/SellerInfoCard'
import { InterestRegistrationCard } from './detail/InterestRegistrationCard'
import { ExchangeMatchCard } from './detail/ExchangeMatchCard'

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
  // 刊登備註
  notes?: string | null
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
  const [showContact, setShowContact] = useState(false)

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
        clientLogger.error('Failed to fetch listing detail:', err)
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
      setShowContact(true) // 自動展開聯絡方式
    } catch (err) {
      clientLogger.error('Failed to fetch contact info:', err)
      setError('網路錯誤')
    } finally {
      setIsLoadingContact(false)
    }
  }

  // 切換聯絡方式顯示
  const handleToggleContact = async () => {
    if (!contactInfo) {
      // 首次點擊：載入聯絡方式
      await handleViewContact()
    } else {
      // 後續點擊：切換展開/收合
      setShowContact(!showContact)
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

      if (listing) {
        toast.success(t(`listing.registerInterestSuccess.${listing.trade_type}`))
      }
      setInterestMessage('')
      onInterestRegistered?.()
      onClose()
    } catch (err) {
      clientLogger.error('Failed to register interest:', err)
      setError('網路錯誤')
    } finally {
      setIsRegisteringInterest(false)
    }
  }

  if (!listing && !isLoadingListing) {
    return null
  }

  const item = listing ? getItemById(listing.item_id) : null

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
              <ExchangeInfoCard
                offeredItem={item}
                offeredItemId={listing.item_id}
                offeredQuantity={listing.quantity}
                wantedItems={listing.wanted_items}
                viewCount={listing.view_count}
                interestCount={listing.interest_count}
                getItemById={getItemById}
              />
            ) : (
              /* 買賣模式：一般物品資訊 */
              <ListingItemInfo
                item={item}
                itemId={listing.item_id}
                quantity={listing.quantity}
                price={listing.price}
                tradeType={listing.trade_type}
                viewCount={listing.view_count}
                interestCount={listing.interest_count}
              />
            )}

            {/* 裝備屬性 */}
            <ListingItemStats
              itemStats={listing.item_stats}
              locale={language}
            />

            {/* 刊登備註 */}
            <ListingNotes notes={listing.notes} />

            {/* 賣家資訊與聯絡方式 */}
            <SellerInfoCard
              sellerUsername={listing.seller.discord_username}
              isOwnListing={listing.is_own_listing}
              contactInfo={contactInfo}
              showContact={showContact}
              isLoadingContact={isLoadingContact}
              onToggleContact={handleToggleContact}
            />

            {/* 登記交易意向 */}
            {(!listing.is_own_listing || process.env.NODE_ENV === 'development') && (
              <InterestRegistrationCard
                tradeType={listing.trade_type}
                message={interestMessage}
                onMessageChange={setInterestMessage}
                onSubmit={handleRegisterInterest}
                isSubmitting={isRegisteringInterest}
              />
            )}

            {/* 交換匹配按鈕 */}
            {listing.trade_type === 'exchange' && (!listing.is_own_listing || process.env.NODE_ENV === 'development') && (
              <ExchangeMatchCard
                onViewMatch={() => setExchangeMatchOpen(true)}
              />
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
