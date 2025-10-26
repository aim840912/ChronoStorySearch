'use client'

import { useState, useEffect } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { ItemSearchInput } from './ItemSearchInput'
import { ExtendedUniqueItem } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

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

type TradeType = 'sell' | 'buy' | 'exchange'
type ContactMethod = 'discord' | 'ingame'

interface CreateListingRequest {
  trade_type: TradeType
  item_id: number
  quantity: number
  contact_method: ContactMethod
  contact_info: string
  price?: number
  wanted_item_id?: number
  wanted_quantity?: number
  webhook_url?: string
}

export function CreateListingModal({
  isOpen,
  onClose,
  onSuccess
}: CreateListingModalProps) {
  const { user } = useAuth()
  const [tradeType, setTradeType] = useState<TradeType>('sell')
  const [selectedItem, setSelectedItem] = useState<ExtendedUniqueItem | null>(null)
  const [wantedItem, setWantedItem] = useState<ExtendedUniqueItem | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState<number | null>(null)
  const [contactMethod, setContactMethod] = useState<ContactMethod>('discord')
  const [contactInfo, setContactInfo] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userModifiedContact, setUserModifiedContact] = useState(false)

  // 自動填充 Discord 聯絡資訊
  useEffect(() => {
    // 當 user 載入完成，且 contactMethod 是 discord，且用戶尚未手動修改
    if (user && contactMethod === 'discord' && !userModifiedContact) {
      setContactInfo(user.discord_username)
    }
  }, [user, contactMethod, userModifiedContact])

  const handleSubmit = async () => {
    // 重置錯誤訊息
    setError(null)

    // 1. 驗證必填欄位
    if (!selectedItem) {
      setError('請選擇物品')
      return
    }

    if (!contactInfo.trim()) {
      setError('請輸入聯絡資訊')
      return
    }

    // 驗證交易類型特定欄位
    if (tradeType === 'exchange') {
      if (!wantedItem) {
        setError('交換模式需要選擇想要的物品')
        return
      }
    } else {
      // sell 或 buy 模式需要價格
      if (!price || price <= 0) {
        setError('請輸入有效的價格')
        return
      }
    }

    if (quantity <= 0) {
      setError('數量必須大於 0')
      return
    }

    // 2. 準備請求資料
    const requestBody: CreateListingRequest = {
      trade_type: tradeType,
      item_id: selectedItem.itemId,
      quantity,
      contact_method: contactMethod,
      contact_info: contactInfo.trim()
    }

    // 根據交易類型添加對應欄位
    if (tradeType === 'exchange') {
      requestBody.wanted_item_id = wantedItem!.itemId
      requestBody.wanted_quantity = 1 // 預設為 1
    } else {
      requestBody.price = price!
    }

    // 可選欄位：Webhook URL
    if (webhookUrl.trim()) {
      requestBody.webhook_url = webhookUrl.trim()
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
        setError(data.error || '建立刊登失敗，請稍後再試')
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
      setWantedItem(null)
      setQuantity(1)
      setPrice(null)
      setContactMethod('discord')
      setContactInfo('')
      setWebhookUrl('')
      setUserModifiedContact(false) // 重置手動修改標記
    } catch (err) {
      console.error('Failed to create listing:', err)
      setError('網路錯誤，請檢查您的連線')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">建立刊登</h2>

        {/* 未登入提示 */}
        {!user && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200">請先登入才能建立刊登</p>
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
          <label className="block mb-2 font-semibold">交易類型</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTradeType('sell')}
              className={`px-4 py-2 rounded-lg ${
                tradeType === 'sell'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              出售
            </button>
            <button
              onClick={() => setTradeType('buy')}
              className={`px-4 py-2 rounded-lg ${
                tradeType === 'buy'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              收購
            </button>
            <button
              onClick={() => setTradeType('exchange')}
              className={`px-4 py-2 rounded-lg ${
                tradeType === 'exchange'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              交換
            </button>
          </div>
        </div>

        {/* 選擇物品 */}
        <div className="mb-6">
          <label className="block mb-2 font-semibold">
            {tradeType === 'sell' && '我要販售的物品'}
            {tradeType === 'buy' && '我要收購的物品'}
            {tradeType === 'exchange' && '我有的物品'}
          </label>
          <ItemSearchInput
            value={selectedItem}
            onSelect={setSelectedItem}
            placeholder="搜尋物品名稱..."
          />
        </div>

        {/* 交換模式 - 選擇想要的物品 */}
        {tradeType === 'exchange' && (
          <div className="mb-6">
            <label className="block mb-2 font-semibold">我想要的物品</label>
            <ItemSearchInput
              value={wantedItem}
              onSelect={setWantedItem}
              placeholder="搜尋想交換的物品..."
              excludeItemId={selectedItem?.itemId}
            />
          </div>
        )}

        {/* 數量和價格 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block mb-2 font-semibold">數量</label>
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
              <label className="block mb-2 font-semibold">價格 (楓幣)</label>
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

        {/* 聯絡方式 */}
        <div className="mb-6">
          <label className="block mb-2 font-semibold">聯絡方式</label>
          <select
            value={contactMethod}
            onChange={(e) => {
              const newMethod = e.target.value as ContactMethod
              setContactMethod(newMethod)
              // 切換聯絡方式時，重置手動修改標記
              setUserModifiedContact(false)
              // 如果切換到遊戲內，清空聯絡資訊
              if (newMethod === 'ingame') {
                setContactInfo('')
              }
              // 如果切換到 Discord，會由 useEffect 自動填充
            }}
            className="w-full px-4 py-2 border rounded-lg mb-2
                       dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="discord">Discord</option>
            <option value="ingame">遊戲內</option>
          </select>
          <input
            type="text"
            value={contactInfo}
            onChange={(e) => {
              setContactInfo(e.target.value)
              // 用戶手動修改時，標記為已修改
              setUserModifiedContact(true)
            }}
            placeholder={
              contactMethod === 'discord'
                ? '請輸入 Discord 用戶名稱 (例: username#1234)'
                : '請輸入遊戲內角色名稱或私訊方式'
            }
            className="w-full px-4 py-2 border rounded-lg
                       dark:bg-gray-800 dark:border-gray-600"
          />
        </div>

        {/* 提交按鈕 */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg
                       hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!user || isSubmitting || !selectedItem}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg
                       hover:bg-blue-600 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
          >
            {isSubmitting ? '建立中...' : '建立刊登'}
          </button>
        </div>
      </div>
    </BaseModal>
  )
}
