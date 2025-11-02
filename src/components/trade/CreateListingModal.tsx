'use client'

import { useState, useEffect } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { ItemSearchInput } from './ItemSearchInput'
import { ExtendedUniqueItem, TradeType, WantedItem, GachaItem } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import type { ItemStats } from '@/types/item-stats'
import { useItemAttributesEssential, useLazyItemDetailed } from '@/hooks/useLazyData'
import { getItemCategoryGroup, getCategoryGroup } from '@/lib/item-categories'
import { useDataManagement } from '@/hooks/useDataManagement'
import { clientLogger } from '@/lib/logger'
import { TradeTypeSelector } from './create/TradeTypeSelector'
import { PriceQuantityInput } from './create/PriceQuantityInput'
import { ContactInfoInput } from './create/ContactInfoInput'
import { ListingNoteInput } from './create/ListingNoteInput'
import { WantedItemsManager } from './create/WantedItemsManager'
import { ItemStatsSection } from './create/ItemStatsSection'

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
  notes?: string | null  // 刊登備註（選填）
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
  const [notes, setNotes] = useState('')  // 刊登備註（選填）
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itemStats, setItemStats] = useState<ItemStats | null>(null)
  const [showStatsInput, setShowStatsInput] = useState(false)
  const [isEquipment, setIsEquipment] = useState(false)  // 是否為裝備類
  const [isRefreshingMembership, setIsRefreshingMembership] = useState(false)  // 是否正在刷新成員資格
  const [showMembershipRefreshButton, setShowMembershipRefreshButton] = useState(false)  // 是否顯示刷新按鈕
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null)  // 上次刷新時間
  const [refreshErrorCount, setRefreshErrorCount] = useState(0)  // 刷新錯誤計數
  const REFRESH_COOLDOWN = 60 * 1000  // 60 秒冷卻時間
  const MAX_ERROR_COUNT = 3  // 最多連續失敗 3 次

  // 載入物品分類資料
  const { essentialMap } = useItemAttributesEssential()

  // 載入轉蛋機資料（用於 essential/detailed 都不存在的物品）
  const { gachaMachines, loadGachaMachines } = useDataManagement()

  // 懶加載詳細資料（用於 essential 中不存在的物品，如轉蛋獨有物品）
  const { data: detailedData, isLoading: isLoadingDetailed } = useLazyItemDetailed(
    selectedItem && !essentialMap.has(selectedItem.itemId) ? selectedItem.itemId : null
  )

  // 當選中物品且 essential 中不存在時，確保轉蛋機資料已載入
  useEffect(() => {
    if (selectedItem && !essentialMap.has(selectedItem.itemId) && gachaMachines.length === 0) {
      loadGachaMachines()
    }
  }, [selectedItem, essentialMap, gachaMachines.length, loadGachaMachines])

  // Discord 聯絡方式（唯讀，來自 OAuth）
  const discordContact = user?.discord_username || user?.discord_id || ''

  // 判斷選中的物品是否為裝備類（apparel, weapon, accessory）
  useEffect(() => {
    if (!selectedItem) {
      setIsEquipment(false)
      return
    }

    // 優先使用 essential 資料（快速路徑）
    const itemData = essentialMap.get(selectedItem.itemId)

    if (itemData) {
      // Essential 資料存在，使用現有邏輯
      const itemCategory = getItemCategoryGroup(itemData)

      if (!itemCategory) {
        setIsEquipment(false)
        return
      }

      const categoryGroup = getCategoryGroup(itemCategory)
      const equipmentCategories = ['apparel', 'weapon', 'accessory']
      const isItemEquipment = categoryGroup ? equipmentCategories.includes(categoryGroup) : false

      setIsEquipment(isItemEquipment)

      if (!isItemEquipment) {
        setItemStats(null)
        setShowStatsInput(false)
      }
    } else if (isLoadingDetailed) {
      // 正在載入 detailed 資料，保持當前狀態，避免閃爍
      return
    } else if (detailedData) {
      // Essential 資料不存在，使用 detailed 資料作為後備
      const equipmentCategory = detailedData.equipment?.category

      if (!equipmentCategory) {
        setIsEquipment(false)
        setItemStats(null)
        setShowStatsInput(false)
        return
      }

      // 使用 equipment.category 判斷（如 "Cape", "Sword" 等）
      const itemCategory = getItemCategoryGroup({
        item_id: selectedItem.itemId.toString(),
        equipment_category: equipmentCategory,
      } as never)

      if (!itemCategory) {
        setIsEquipment(false)
        setItemStats(null)
        setShowStatsInput(false)
        return
      }

      const categoryGroup = getCategoryGroup(itemCategory)
      const equipmentCategories = ['apparel', 'weapon', 'accessory']
      const isItemEquipment = categoryGroup ? equipmentCategories.includes(categoryGroup) : false

      setIsEquipment(isItemEquipment)

      if (!isItemEquipment) {
        setItemStats(null)
        setShowStatsInput(false)
      }
    } else {
      // 最後嘗試：從轉蛋機資料中查找
      // 注意：雖然類型為 GachaItem，但運行時實際包含 EnhancedGachaItem 的所有屬性
      let gachaItemData: GachaItem | null = null

      for (const machine of gachaMachines) {
        const found = machine.items.find((item: GachaItem) =>
          String(item.itemId) === String(selectedItem.itemId)
        )
        if (found) {
          gachaItemData = found
          break
        }
      }

      // 使用類型守衛檢查 equipment 屬性（運行時存在）
      const hasEquipment = (item: GachaItem): item is GachaItem & { equipment: { category: string } } => {
        return 'equipment' in item && item.equipment !== null && typeof item.equipment === 'object' && 'category' in item.equipment
      }

      if (gachaItemData && hasEquipment(gachaItemData)) {
        // 使用轉蛋機資料中的 equipment.category
        const itemCategory = getItemCategoryGroup({
          item_id: selectedItem.itemId.toString(),
          equipment_category: gachaItemData.equipment.category,
        } as never)

        if (itemCategory) {
          const categoryGroup = getCategoryGroup(itemCategory)
          const equipmentCategories = ['apparel', 'weapon', 'accessory']
          const isItemEquipment = categoryGroup ? equipmentCategories.includes(categoryGroup) : false

          setIsEquipment(isItemEquipment)

          if (!isItemEquipment) {
            setItemStats(null)
            setShowStatsInput(false)
          }
        } else {
          setIsEquipment(false)
          setItemStats(null)
          setShowStatsInput(false)
        }
      } else {
        // 完全無法取得任何資料
        setIsEquipment(false)
        setItemStats(null)
        setShowStatsInput(false)
      }
    }
  }, [selectedItem, essentialMap, detailedData, isLoadingDetailed, gachaMachines])

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
      ingame_name: ingameName.trim() || null,  // Discord 由後端自動處理
      notes: notes.trim() || null  // 刊登備註（選填）
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

    // 可選欄位：物品屬性（只有裝備類才能帶有屬性）
    if (itemStats && isEquipment) {
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
          setShowMembershipRefreshButton(true)  // 顯示刷新按鈕
        } else if (errorMessage.includes('刊登配額上限')) {
          setError(`${errorMessage}${t('listing.error.quotaTip')}`)
        } else if (errorMessage.includes('已經刊登此物品') || errorMessage.includes('無法重複刊登')) {
          // 重複刊登錯誤：提供前往我的刊登頁面的提示
          setError(errorMessage)
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
      setNotes('')
      setWebhookUrl('')
      setItemStats(null)
      setShowStatsInput(false)
      setIsEquipment(false)
    } catch (err) {
      clientLogger.error('Failed to create listing:', err)
      setError(t('listing.error.networkError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 手動刷新 Discord 成員資格
  const handleRefreshMembership = async () => {
    // 檢查錯誤次數
    if (refreshErrorCount >= MAX_ERROR_COUNT) {
      setError(t('listing.error.tooManyFailures'))
      setShowMembershipRefreshButton(false)
      return
    }

    // 檢查冷卻時間
    const now = Date.now()
    if (lastRefreshTime && now - lastRefreshTime < REFRESH_COOLDOWN) {
      const remainingSeconds = Math.ceil((REFRESH_COOLDOWN - (now - lastRefreshTime)) / 1000)
      setError(t('listing.error.cooldownWait', { seconds: remainingSeconds }))
      return
    }

    setIsRefreshingMembership(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/discord/refresh-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setRefreshErrorCount(prev => prev + 1)  // 增加錯誤計數
        setError(data.error || t('listing.error.refreshMembershipFailed'))
        return
      }

      // 成功刷新
      if (data.data.is_member) {
        setLastRefreshTime(now)  // 記錄刷新時間
        setRefreshErrorCount(0)  // 重置錯誤計數
        setError(null)
        setShowMembershipRefreshButton(false)
        // 顯示成功訊息（可選）
        setError(t('listing.success.membershipRefreshed'))
        // 3 秒後清除成功訊息
        setTimeout(() => {
          setError(null)
        }, 3000)
      } else {
        // 刷新後仍然不是成員
        setError(t('listing.error.notDiscordMember'))
        setShowMembershipRefreshButton(false)
      }
    } catch (err) {
      clientLogger.error('Failed to refresh Discord membership:', err)
      setError(t('listing.error.networkError'))
    } finally {
      setIsRefreshingMembership(false)
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
            {showMembershipRefreshButton && (() => {
              const now = Date.now()
              const isInCooldown = Boolean(lastRefreshTime && now - lastRefreshTime < REFRESH_COOLDOWN)
              const remainingSeconds = isInCooldown
                ? Math.ceil((REFRESH_COOLDOWN - (now - lastRefreshTime!)) / 1000)
                : 0

              return (
                <button
                  onClick={handleRefreshMembership}
                  disabled={isRefreshingMembership || isInCooldown}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  {isRefreshingMembership ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>{t('listing.button.refreshing')}</span>
                    </>
                  ) : isInCooldown ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{t('listing.button.cooldownRemaining', { seconds: remainingSeconds })}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{t('listing.button.refreshMembership')}</span>
                    </>
                  )}
                </button>
              )
            })()}
          </div>
        )}

        {/* 交易類型選擇 */}
        <TradeTypeSelector
          value={tradeType}
          onChange={setTradeType}
        />

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
          <WantedItemsManager
            wantedItems={wantedItems}
            onUpdate={setWantedItems}
            excludeItemId={selectedItem?.itemId}
          />
        )}

        {/* 物品屬性 (可選) - 只有裝備類才顯示 */}
        <ItemStatsSection
          isEquipment={isEquipment}
          itemStats={itemStats}
          showInput={showStatsInput}
          onToggle={() => setShowStatsInput(!showStatsInput)}
          onChange={setItemStats}
        />

        {/* 數量和價格 */}
        <PriceQuantityInput
          tradeType={tradeType}
          quantity={quantity}
          price={price}
          onQuantityChange={setQuantity}
          onPriceChange={setPrice}
        />

        {/* Discord 聯絡方式 & 遊戲內角色名 */}
        <ContactInfoInput
          discordContact={discordContact}
          ingameName={ingameName}
          onIngameNameChange={setIngameName}
        />

        {/* 刊登備註（選填） */}
        <ListingNoteInput
          notes={notes}
          onChange={setNotes}
          maxLength={500}
        />

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
