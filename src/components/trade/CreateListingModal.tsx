'use client'

import { useState } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { ItemSearchInput } from './ItemSearchInput'
import { ItemStatsInput } from './ItemStatsInput'
import { ExtendedUniqueItem, TradeType, WantedItem } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import type { ItemStats } from '@/types/item-stats'

/**
 * 建立刊登 Modal
 *
 * 功能:
 * - 選擇交易類型: sell, buy, exchange
 * - 使用 ItemSearchInput 選擇物品
 * - exchange 模式需選擇想要的物品
 * - 輸入價格/數量
 * - 選擇聯絡方式: discord, ingame
 * - 輸入聯絡資訊
 * - 可選: Webhook URL
 * - 表單驗證
 * - 呼叫 POST /api/listings
 * - 成功後關閉 Modal 並刷新列表
 *
 * 參考文件:
 * - docs/architecture/交易系統/10-物品整合設計.md
 * - docs/architecture/交易系統/03-API設計.md
 */

interface CreateListingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface CreateListingRequest {
  trade_type: TradeType
  item_id: number
  quantity: number
  ingame_name?: string | null  // 遊戲內角色名（選填）
  price?: number
  wanted_items?: WantedItem[]
  webhook_url?: string
  item_stats?: ItemStats
}

export function CreateListingModal({
  isOpen,
  onClose,
  onSuccess
}: CreateListingModalProps) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [tradeType, setTradeType] = useState<TradeType>('sell')
  const [selectedItem, setSelectedItem] = useState<ExtendedUniqueItem | null>(null)
  const [wantedItems, setWantedItems] = useState<Array<{ item: ExtendedUniqueItem; quantity: number }>>([])
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState<number | null>(null)
  const [ingameName, setIngameName] = useState('')  // 遊戲內角色名（選填）
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itemStats, setItemStats] = useState<ItemStats | null>(null)
  const [showStatsInput, setShowStatsInput] = useState(false)

  // Discord 聯絡方式（唯讀，來自 OAuth）
  const discordContact = user?.discord_username || user?.discord_id || ''

  const handleSubmit = async () => {
    // 重置錯誤訊息
    setError(null)

    // 1. 驗證必填欄位
    if (!selectedItem) {
      setError(t('listing.validation.selectItem'))
      return
    }

    // Discord 聯絡方式不需要驗證（自動填充且必定有值）
    // ingame_name 是選填的，不需要驗證

    // 驗證交易類型特定欄位
    if (tradeType === 'exchange') {
      if (wantedItems.length === 0) {
        setError(t('listing.validation.selectAtLeastOneWantedItem'))
        return
      }
    } else {
      // sell 或 buy 模式需要價格
      if (!price || price <= 0) {
        setError(t('listing.validation.enterValidPrice'))
        return
      }
    }

    if (quantity <= 0) {
      setError(t('listing.validation.quantityMustBePositive'))
      return
    }

    // 2. 準備請求資料
    const requestBody: CreateListingRequest = {
      trade_type: tradeType,
      item_id: selectedItem.itemId,
      quantity,
      ingame_name: ingameName.trim() || null  // Discord 由後端自動處理
    }

    // 根據交易類型添加對應欄位
    if (tradeType === 'exchange') {
      requestBody.wanted_items = wantedItems.map(w => ({
        item_id: w.item.itemId,
        quantity: w.quantity
      }))
    } else {
      requestBody.price = price!
    }

    // 可選欄位：Webhook URL
    if (webhookUrl.trim()) {
      requestBody.webhook_url = webhookUrl.trim()
    }

    // 可選欄位：物品屬性
    if (itemStats) {
      requestBody.item_stats = itemStats
    }

    // 3. 呼叫 API
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        // 處理錯誤回應
        const errorMessage = data.error || t('listing.error.createFailed')

        // 針對特定錯誤提供更詳細的說明
        if (errorMessage.includes('Discord 帳號年齡不足')) {
          setError(`${errorMessage}${t('listing.error.discordAgeTip')}`)
        } else if (errorMessage.includes('加入指定的 Discord 伺服器')) {
          setError(`${errorMessage}${t('listing.error.discordServerTip')}`)
        } else if (errorMessage.includes('刊登配額上限')) {
          setError(`${errorMessage}${t('listing.error.quotaTip')}`)
        } else {
          setError(errorMessage)
        }
        return
      }

      // 4. 成功：呼叫 onSuccess 回調並關閉 Modal
      if (onSuccess) {
        onSuccess()
      }
      onClose()

      // 重置表單
      setTradeType('sell')
      setSelectedItem(null)
      setWantedItems([])
      setQuantity(1)
      setPrice(null)
      setIngameName('')
      setWebhookUrl('')
      setItemStats(null)
      setShowStatsInput(false)
    } catch (err) {
      console.error('Failed to create listing:', err)
      setError(t('listing.error.networkError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-2rem)] scrollbar-hide">
        <h2 className="text-2xl font-bold mb-4">{t('listing.create')}</h2>

        {/* 未登入提示 */}
        {!user && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200">{t('listing.loginToView')}</p>
          </div>
        )}

        {/* 錯誤訊息顯示 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* 交易類型選擇 */}
        <div className="mb-6">
          <label className="block mb-2 font-semibold">{t('listing.tradeType')}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTradeType('sell')}
              className={`px-4 py-2 rounded-lg ${
                tradeType === 'sell'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              {t('trade.type.sell')}
            </button>
            <button
              onClick={() => setTradeType('buy')}
              className={`px-4 py-2 rounded-lg ${
                tradeType === 'buy'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              {t('trade.type.buy')}
            </button>
            <button
              onClick={() => setTradeType('exchange')}
              className={`px-4 py-2 rounded-lg ${
                tradeType === 'exchange'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              {t('trade.type.exchange')}
            </button>
          </div>
        </div>

        {/* 選擇物品 */}
        <div className="mb-6">
          <label className="block mb-2 font-semibold">
            {tradeType === 'sell' && t('listing.itemToSell')}
            {tradeType === 'buy' && t('listing.itemToBuy')}
            {tradeType === 'exchange' && t('listing.itemIHave')}
          </label>
          <ItemSearchInput
            value={selectedItem}
            onSelect={setSelectedItem}
            placeholder={t('listing.searchItemPlaceholder')}
          />
        </div>

        {/* 交換模式 - 選擇想要的物品（多個） */}
        {tradeType === 'exchange' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold">{t('listing.wantedItemsLabel')}</label>
              {wantedItems.length > 0 && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('listing.wantedItemsCount', { count: wantedItems.length })}
                </span>
              )}
            </div>

            {/* 已選擇的想要物品列表 */}
            {wantedItems.map((wantedItem, index) => (
              <div key={index} className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {wantedItem.item.chineseItemName || wantedItem.item.itemName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <label className="text-sm text-gray-600 dark:text-gray-400">
                        {t('listing.quantityLabel')}:
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={wantedItem.quantity}
                        onChange={(e) => {
                          const newQuantity = parseInt(e.target.value) || 1
                          setWantedItems(prev =>
                            prev.map((item, i) =>
                              i === index ? { ...item, quantity: newQuantity } : item
                            )
                          )
                        }}
                        className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setWantedItems(prev => prev.filter((_, i) => i !== index))
                    }}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                  >
                    {t('listing.removeWantedItem')}
                  </button>
                </div>
              </div>
            ))}

            {/* 新增想要物品按鈕與搜尋框 */}
            {wantedItems.length < 3 ? (
              <ItemSearchInput
                value={null}
                onSelect={(item) => {
                  if (item && !wantedItems.some(w => w.item.itemId === item.itemId)) {
                    setWantedItems(prev => [...prev, { item, quantity: 1 }])
                  }
                }}
                placeholder={t('listing.searchExchangeItemPlaceholder')}
                excludeItemId={selectedItem?.itemId}
              />
            ) : (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {t('listing.maxWantedItemsReached')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 物品屬性 (可選) */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowStatsInput(!showStatsInput)}
            className="flex items-center gap-2 mb-2 font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showStatsInput ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {t('listing.itemStatsOptional')}
            {itemStats && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                {t('listing.itemStatsFilled')}
              </span>
            )}
          </button>

          {showStatsInput && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('listing.itemStatsDescription')}
              </p>
              <ItemStatsInput
                value={itemStats}
                onChange={setItemStats}
                locale="zh-TW"
                simpleMode={true}
              />
            </div>
          )}
        </div>

        {/* 數量和價格 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block mb-2 font-semibold">{t('listing.quantityLabel')}</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg
                         dark:bg-gray-800 dark:border-gray-600"
            />
          </div>
          {tradeType !== 'exchange' && (
            <div>
              <label className="block mb-2 font-semibold">{t('listing.priceLabel')}</label>
              <input
                type="number"
                min="0"
                value={price || ''}
                onChange={(e) => setPrice(parseInt(e.target.value) || null)}
                className="w-full px-4 py-2 border rounded-lg
                           dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
          )}
        </div>

        {/* Discord 聯絡方式（唯讀） */}
        <div className="mb-4">
          <label className="block mb-2 font-semibold text-sm text-gray-700 dark:text-gray-300">
            {t('listing.discordContactLabel')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={discordContact}
              readOnly
              disabled
              className="w-full px-4 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700
                         dark:border-gray-600 cursor-not-allowed opacity-75 text-gray-700 dark:text-gray-300"
            />
            <span className="absolute right-3 top-2.5 text-xs text-gray-500 dark:text-gray-400">
              {t('listing.autoFilled')}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('listing.discordContactHint')}
          </p>
        </div>

        {/* 遊戲內角色名（選填） */}
        <div className="mb-6">
          <label className="block mb-2 font-semibold text-sm text-gray-700 dark:text-gray-300">
            {t('listing.ingameNameLabel')}
            <span className="text-gray-400 ml-1 text-xs">({t('listing.optional')})</span>
          </label>
          <input
            type="text"
            value={ingameName}
            onChange={(e) => setIngameName(e.target.value)}
            placeholder={t('listing.ingameNamePlaceholder')}
            maxLength={50}
            className="w-full px-4 py-2 border rounded-lg
                       dark:bg-gray-800 dark:border-gray-600
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('listing.ingameNameHint')}
          </p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <div className="text-sm font-medium text-red-800 dark:text-red-200 whitespace-pre-line">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 提交按鈕 */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg
                       hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!user || isSubmitting || !selectedItem}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg
                       hover:bg-blue-600 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
          >
            {isSubmitting ? t('listing.submitting') : t('listing.create')}
          </button>
        </div>
      </div>
    </BaseModal>
  )
}
