'use client'

import { useState, useEffect } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { useDataManagement } from '@/hooks/useDataManagement'
import { useItemsData } from '@/hooks/useItemsData'
import { getItemImageUrl } from '@/lib/image-utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLanguageToggle } from '@/hooks/useLanguageToggle'
import { ListingDetailModal } from './ListingDetailModal'
import type { ItemStats, StatsGrade } from '@/types/item-stats'
import { STAT_LABELS_ZH, STAT_LABELS_EN } from '@/types/item-stats'

/**
 * 市場瀏覽 Modal
 *
 * 功能:
 * - Tab 切換: 全部, 販售, 收購, 交換
 * - 顯示刊登列表 (分頁)
 * - 顯示物品圖片和名稱
 * - 顯示價格/交換資訊
 * - 顯示賣家資訊和信譽
 * - 客戶端合併物品資訊
 *
 * 參考文件:
 * - docs/architecture/交易系統/10-物品整合設計.md
 * - docs/architecture/交易系統/03-API設計.md
 */

interface MarketBrowserModalProps {
  isOpen: boolean
  onClose: () => void
}

type TradeTypeFilter = 'all' | 'sell' | 'buy' | 'exchange'

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
  seller: {
    discord_username: string
    reputation_score: number
  }
  // 裝備屬性
  item_stats?: ItemStats | null
  stats_grade?: StatsGrade | null
  stats_score?: number | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export function MarketBrowserModal({
  isOpen,
  onClose
}: MarketBrowserModalProps) {
  const { user } = useAuth()
  const { language, t } = useLanguage()
  const toggleLanguage = useLanguageToggle()
  const [tradeTypeFilter, setTradeTypeFilter] = useState<TradeTypeFilter>('all')
  const [listings, setListings] = useState<Listing[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // 刊登詳情 Modal 狀態
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null)

  // 載入物品資料
  const { allDrops, gachaMachines, loadGachaMachines } = useDataManagement()
  const { getItemById } = useItemsData({ allDrops, gachaMachines })

  // 確保轉蛋機資料已載入
  useEffect(() => {
    if (isOpen && gachaMachines.length === 0) {
      loadGachaMachines()
    }
  }, [isOpen, gachaMachines.length, loadGachaMachines])

  // 載入市場列表
  useEffect(() => {
    const fetchListings = async () => {
      if (!isOpen || !user) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/market/search?trade_type=${tradeTypeFilter}&page=${page}&limit=20`,
          { credentials: 'include' }
        )

        const data = await response.json()

        if (!response.ok || !data.success) {
          setError(data.error || '載入市場列表失敗')
          return
        }

        setListings(data.data || [])
        setPagination(data.pagination)
      } catch (err) {
        console.error('Failed to fetch market listings:', err)
        setError('網路錯誤，請檢查您的連線')
      } finally {
        setIsLoading(false)
      }
    }

    fetchListings()
  }, [isOpen, user, tradeTypeFilter, page])

  // 切換 Tab 時重置頁碼
  const handleTradeTypeChange = (type: TradeTypeFilter) => {
    setTradeTypeFilter(type)
    setPage(1)
  }

  // 打開刊登詳情
  const handleOpenDetail = (listingId: number) => {
    setSelectedListingId(listingId)
    setDetailModalOpen(true)
  }

  // 購買意向登記成功後重新載入列表
  const handleInterestRegistered = () => {
    // 觸發重新載入 (通過改變 page 來觸發 useEffect)
    setPage((p) => p)
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

  // 格式化裝備屬性為精簡文字
  const formatStatsCompact = (stats: ItemStats, locale: 'zh-TW' | 'en'): string[] => {
    const labels = locale === 'zh-TW' ? STAT_LABELS_ZH : STAT_LABELS_EN
    const parts: string[] = []

    // 只顯示實際值（不顯示最大值），按優先順序排列
    const displayKeys = ['watk', 'matk', 'str', 'dex', 'int', 'luk', 'hp', 'mp', 'wdef', 'mdef', 'acc', 'avoid', 'speed', 'jump'] as const

    for (const key of displayKeys) {
      const value = stats[key as keyof ItemStats]
      if (value !== undefined && value !== null && typeof value === 'number') {
        const label = labels[key] || key
        parts.push(`${label}+${value}`)
      }
    }

    return parts
  }

  return (
    <>
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-6xl" zIndex="z-[60]">
      {/* Modal Header - Sticky */}
      <div className="sticky top-0 z-10 bg-blue-500 dark:bg-blue-600 p-6">
        {/* 三欄式 Header 佈局 */}
        <div className="flex items-center justify-between">
          {/* 左欄：預留空間 */}
          <div className="flex-1 flex items-center">
            {/* 未來可擴展返回按鈕 */}
          </div>

          {/* 中欄：標題 + 副標題 */}
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white">{t('market.title')}</h2>
            {pagination && (
              <p className="text-blue-100 text-xs sm:text-sm">
                {t('market.totalListings', { count: pagination.total })}
              </p>
            )}
          </div>

          {/* 右欄：語言切換 + 關閉按鈕 */}
          <div className="flex-1 flex items-center gap-2 justify-end">
            {/* 語言切換按鈕 */}
            <button
              onClick={toggleLanguage}
              className="p-3 min-h-[44px] min-w-[44px] rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30 flex items-center justify-center"
              aria-label={language === 'zh-TW' ? 'Switch to English' : '切換到中文'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>

            {/* 關閉按鈕 */}
            <button
              onClick={onClose}
              className="p-3 min-h-[44px] min-w-[44px] text-white hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 border border-white/30"
              aria-label="關閉"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Trade Type Filter - 移到 Header 外部 */}
      {/* Desktop: 按鈕群組 */}
      <div className="hidden lg:flex gap-2 px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {[
          { value: 'all', label: t('trade.type.all') },
          { value: 'sell', label: t('trade.type.sell') },
          { value: 'buy', label: t('trade.type.buy') },
          { value: 'exchange', label: t('trade.type.exchange') }
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTradeTypeChange(tab.value as TradeTypeFilter)}
            className={`px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
              tradeTypeFilter === tab.value
                ? 'bg-blue-600 text-white font-semibold border border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile: 下拉選單 */}
      <div className="lg:hidden px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <select
          value={tradeTypeFilter}
          onChange={(e) => handleTradeTypeChange(e.target.value as TradeTypeFilter)}
          className="w-full px-4 py-3 rounded-lg bg-gray-100 text-gray-900 border border-gray-300
                     dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600
                     hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                     appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23666666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.5em 1.5em',
            paddingRight: '2.5rem'
          }}
        >
          <option value="all">{t('trade.type.all')}</option>
          <option value="sell">{t('trade.type.sell')}</option>
          <option value="buy">{t('trade.type.buy')}</option>
          <option value="exchange">{t('trade.type.exchange')}</option>
        </select>
      </div>

      {/* Modal Content - Scrollable */}
      <div className="p-3 sm:p-6 overflow-y-auto scrollbar-hide flex-1">
        {/* 未登入提示 */}
        {!user && (
          <div className="mb-4 p-4 bg-white/20 border border-white/30 rounded-lg">
            <p className="text-gray-700 dark:text-gray-300">{t('market.loginRequired')}</p>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-300 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* 刊登列表 */}
        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {listings.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                {t('market.noListings')}
              </div>
            ) : (
              listings.map((listing) => {
                const item = getItemById(listing.item_id)
                const wantedItem = listing.wanted_item_id ? getItemById(listing.wanted_item_id) : null

                return (
                  <div
                    key={listing.id}
                    onClick={() => handleOpenDetail(listing.id)}
                    className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer
                               dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                    {/* 四欄佈局：交易類型 | 物品 | 價格 | 賣家 */}
                    <div className="flex items-center gap-4">
                      {/* 第一欄：交易類型標籤 */}
                      <div className="flex-shrink-0 flex items-center justify-center min-w-[80px]">
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          listing.trade_type === 'sell' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          listing.trade_type === 'buy' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                          'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                        }`}>
                          {listing.trade_type === 'sell' ? t('trade.type.sell') : listing.trade_type === 'buy' ? t('trade.type.buy') : t('trade.type.exchange')}
                        </span>
                      </div>

                      {/* 第二欄：物品圖片 + 名稱 + 數量 + 屬性 */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                          src={getItemImageUrl(listing.item_id)}
                          alt={item?.itemName || String(listing.item_id)}
                          className="w-12 h-12 object-contain flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect width="48" height="48" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {getDisplayItemName(item, listing.item_id)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('listing.quantity')}: {listing.quantity}
                          </p>

                          {/* 裝備屬性（精簡顯示） */}
                          {listing.item_stats && (
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {formatStatsCompact(listing.item_stats, language).slice(0, 4).map((stat, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs text-gray-600 dark:text-gray-400"
                                >
                                  {stat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 第三欄：價格或交換資訊 */}
                      <div className="flex-shrink-0 text-center min-w-[120px]">
                        {listing.trade_type === 'exchange' && wantedItem ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">{t('trade.type.exchange')}</span>
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                              {getDisplayItemName(wantedItem)}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {listing.price?.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('listing.meso')}</p>
                          </div>
                        )}
                      </div>

                      {/* 第四欄：賣家資訊 */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-1 min-w-[100px]">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                            {listing.seller.discord_username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[70px]">
                            {listing.seller.discord_username}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {listing.seller.reputation_score}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* 分頁控制 */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev || isLoading}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg
                         hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200 dark:disabled:hover:bg-gray-700"
            >
              {t('pagination.previous')}
            </button>
            <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
              {t('pagination.page', { current: pagination.page, total: pagination.totalPages })}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNext || isLoading}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg
                         hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200 dark:disabled:hover:bg-gray-700"
            >
              {t('pagination.next')}
            </button>
          </div>
        )}
      </div>
      {/* End of Scrollable Content */}
    </BaseModal>

      {/* 刊登詳情 Modal */}
      <ListingDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        listingId={selectedListingId}
        onInterestRegistered={handleInterestRegistered}
        zIndex="z-[60]"
      />
    </>
  )
}
