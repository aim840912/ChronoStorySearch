'use client'

import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { tradeService } from '@/lib/supabase/trade-service'
import { useToast } from '@/hooks/useToast'
import { getItemImageUrl } from '@/lib/image-utils'
import type { TradeType, TradeListing, CreateTradeListingInput, EquipmentStats, CustomStat } from '@/types/trade'
import type { ExtendedUniqueItem, ItemAttributesEssential } from '@/types'

interface TradeListingFormProps {
  editingListing?: TradeListing | null
  onSave: () => void
  onCancel: () => void
  searchItems: (query: string, limit?: number) => ExtendedUniqueItem[]
  itemAttributesMap: Map<number, ItemAttributesEssential>
  onRecordView?: (type: 'monster' | 'item', id: number, name: string) => void
}

const MAX_RESULTS = 10

// 自訂屬性的下拉選項
const STAT_OPTIONS = [
  { value: 'str', label: 'STR' },
  { value: 'dex', label: 'DEX' },
  { value: 'int', label: 'INT' },
  { value: 'luk', label: 'LUK' },
  { value: 'attack', label: 'ATK' },
  { value: 'magic', label: 'MAG' },
  { value: 'pDef', label: 'DEF' },
  { value: 'mDef', label: 'MDEF' },
  { value: 'hp', label: 'HP' },
  { value: 'mp', label: 'MP' },
  { value: 'accuracy', label: 'ACC' },
  { value: 'avoid', label: 'EVA' },
  { value: 'speed', label: 'Speed' },
  { value: 'jump', label: 'Jump' },
  { value: 'slots', label: 'Slots' },
] as const

/**
 * 交易刊登表單
 * 發布或編輯刊登
 */
export const TradeListingForm = memo(function TradeListingForm({
  editingListing,
  onSave,
  onCancel,
  searchItems,
  itemAttributesMap,
  onRecordView,
}: TradeListingFormProps) {
  const { t, language } = useLanguage()
  const { user } = useAuth()
  const { showToast } = useToast()

  // 表單狀態
  const [type, setType] = useState<TradeType>('sell')
  const [itemName, setItemName] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [price, setPrice] = useState('')
  const [discordUsername, setDiscordUsername] = useState('')
  const [characterName, setCharacterName] = useState('')
  const [note, setNote] = useState('')
  const [equipmentStats, setEquipmentStats] = useState<EquipmentStats>({})
  const [customStats, setCustomStats] = useState<CustomStat[]>([])

  // UI 狀態
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isEditing = !!editingListing

  // 載入 Discord 用戶名
  useEffect(() => {
    const loadDiscordUsername = async () => {
      const username = await tradeService.getDiscordUsername()
      if (username && !discordUsername) {
        setDiscordUsername(username)
      }
    }
    loadDiscordUsername()
  }, [])

  // 編輯模式：載入現有資料
  useEffect(() => {
    if (editingListing) {
      setType(editingListing.type)
      setItemName(editingListing.itemName)
      setSelectedItemId(editingListing.itemId)
      setQuantity(editingListing.quantity.toString())
      setPrice(formatNumberInput(editingListing.price))
      setDiscordUsername(editingListing.discordUsername)
      setCharacterName(editingListing.characterName)
      setNote(editingListing.note || '')
    }
  }, [editingListing])

  // 物品搜尋結果
  const filteredItems = useMemo(() => {
    if (!itemName.trim()) return []
    return searchItems(itemName, MAX_RESULTS)
  }, [itemName, searchItems])

  // 判斷選擇的物品是否為裝備
  const selectedItemAttributes = useMemo(() => {
    if (!selectedItemId) return null
    return itemAttributesMap.get(selectedItemId) ?? null
  }, [selectedItemId, itemAttributesMap])

  const isEquipment = !!selectedItemAttributes?.equipment_category

  // 當選擇裝備時，預填基本素質
  useEffect(() => {
    if (isEquipment && selectedItemAttributes) {
      const baseStats: EquipmentStats = {}
      // 四維
      if (selectedItemAttributes.inc_str > 0) baseStats.str = selectedItemAttributes.inc_str
      if (selectedItemAttributes.inc_dex > 0) baseStats.dex = selectedItemAttributes.inc_dex
      if (selectedItemAttributes.inc_int > 0) baseStats.int = selectedItemAttributes.inc_int
      if (selectedItemAttributes.inc_luk > 0) baseStats.luk = selectedItemAttributes.inc_luk
      // 攻擊/魔攻
      if (selectedItemAttributes.inc_pad > 0) baseStats.attack = selectedItemAttributes.inc_pad
      if (selectedItemAttributes.inc_mad > 0) baseStats.magic = selectedItemAttributes.inc_mad
      // 防禦
      if (selectedItemAttributes.inc_pdd > 0) baseStats.pDef = selectedItemAttributes.inc_pdd
      if (selectedItemAttributes.inc_mdd > 0) baseStats.mDef = selectedItemAttributes.inc_mdd
      // HP/MP
      if (selectedItemAttributes.inc_mhp > 0) baseStats.hp = selectedItemAttributes.inc_mhp
      if (selectedItemAttributes.inc_mmp > 0) baseStats.mp = selectedItemAttributes.inc_mmp
      // 命中/迴避
      if (selectedItemAttributes.inc_acc > 0) baseStats.accuracy = selectedItemAttributes.inc_acc
      if (selectedItemAttributes.inc_eva > 0) baseStats.avoid = selectedItemAttributes.inc_eva
      // 速度/跳躍
      if (selectedItemAttributes.inc_speed > 0) baseStats.speed = selectedItemAttributes.inc_speed
      if (selectedItemAttributes.inc_jump > 0) baseStats.jump = selectedItemAttributes.inc_jump
      // 升級次數
      if (selectedItemAttributes.tuc > 0) baseStats.slots = selectedItemAttributes.tuc
      setEquipmentStats(baseStats)
    } else {
      setEquipmentStats({})
    }
  }, [selectedItemId, isEquipment, selectedItemAttributes])

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // 格式化數字輸入（加入千分位）
  const formatNumberInput = (value: number): string => {
    return value.toLocaleString()
  }

  // 解析數字輸入（移除千分位）
  const parseNumberInput = (value: string): number => {
    const parsed = parseInt(value.replace(/,/g, ''), 10)
    return isNaN(parsed) ? 0 : parsed
  }

  const handlePriceChange = (value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '')
    setPrice(cleaned)
  }

  const handleSelectItem = useCallback((item: ExtendedUniqueItem) => {
    const displayName = language === 'zh-TW'
      ? item.chineseItemName || item.itemName
      : item.itemName || item.chineseItemName
    setItemName(displayName || '')
    setSelectedItemId(item.itemId)
    setIsDropdownOpen(false)

    // 記錄瀏覽歷史
    if (displayName) {
      onRecordView?.('item', item.itemId, displayName)
    }
  }, [language, onRecordView])

  const handleSubmit = useCallback(async () => {
    if (!user) {
      showToast(t('trade.loginRequired'), 'error')
      return
    }

    if (!selectedItemId || !itemName.trim()) {
      showToast(t('trade.selectItem'), 'error')
      return
    }

    const quantityNum = parseInt(quantity, 10)
    const priceNum = parseNumberInput(price)

    if (quantityNum <= 0 || priceNum <= 0) {
      showToast(t('trade.invalidInput'), 'error')
      return
    }

    if (!discordUsername.trim() || !characterName.trim()) {
      showToast(t('trade.contactRequired'), 'error')
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing && editingListing) {
        // 更新刊登
        const updated = await tradeService.updateListing(editingListing.id, {
          quantity: quantityNum,
          price: priceNum,
          characterName: characterName.trim(),
          note: note.trim() || undefined,
        })

        if (updated) {
          showToast(t('trade.updateSuccess'), 'success')
          onSave()
        } else {
          showToast(t('common.error'), 'error')
        }
      } else {
        // 新增刊登
        const input: CreateTradeListingInput = {
          type,
          itemId: selectedItemId,
          itemName: itemName.trim(),
          quantity: quantityNum,
          price: priceNum,
          discordUsername: discordUsername.trim(),
          characterName: characterName.trim(),
          note: note.trim() || undefined,
          equipmentStats: isEquipment && (Object.keys(equipmentStats).length > 0 || customStats.length > 0)
            ? {
                ...equipmentStats,
                custom: customStats.filter(s => s.name.trim() && s.value.trim()).length > 0
                  ? customStats.filter(s => s.name.trim() && s.value.trim())
                  : undefined,
              }
            : undefined,
        }

        const created = await tradeService.createListing(input)

        if (created) {
          showToast(t('trade.createSuccess'), 'success')
          onSave()
        } else {
          showToast(t('common.error'), 'error')
        }
      }
    } catch (error) {
      console.error('提交失敗:', error)
      showToast(t('common.error'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    user, selectedItemId, itemName, quantity, price, discordUsername,
    characterName, note, type, isEditing, editingListing, onSave, showToast, t,
    isEquipment, equipmentStats, customStats
  ])

  const isDisabled = !selectedItemId || !itemName.trim() ||
    parseInt(quantity, 10) <= 0 || parseNumberInput(price) <= 0 ||
    !discordUsername.trim() || !characterName.trim() || isSubmitting

  return (
    <div className="space-y-4">
      {/* 交易類型選擇 */}
      {!isEditing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('trade.tradeType')}
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setType('sell')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                type === 'sell'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 ring-2 ring-green-500'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('trade.sell')}
            </button>
            <button
              type="button"
              onClick={() => setType('buy')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                type === 'buy'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-2 ring-blue-500'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('trade.buy')}
            </button>
          </div>
        </div>
      )}

      {/* 物品選擇 */}
      {!isEditing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('trade.item')}
          </label>
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value)
                setSelectedItemId(null)
                setIsDropdownOpen(true)
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder={t('trade.searchItem')}
              className="w-full px-4 py-2.5 pl-10 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-3 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            {/* 自動完成下拉選單 */}
            {isDropdownOpen && filteredItems.length > 0 && (
              <div className="absolute w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-20">
                {filteredItems.map((item) => {
                  const displayName = language === 'zh-TW'
                    ? item.chineseItemName || item.itemName
                    : item.itemName || item.chineseItemName

                  return (
                    <button
                      key={item.itemId}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2"
                    >
                      <img
                        src={getItemImageUrl(item.itemId, { itemName: item.itemName })}
                        alt=""
                        className="w-6 h-6 object-contain flex-shrink-0"
                      />
                      <span className="text-gray-900 dark:text-white">{displayName}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 已選擇物品的預覽 */}
          {selectedItemId && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <img
                src={getItemImageUrl(selectedItemId, { itemName })}
                alt={itemName}
                className="w-12 h-12 object-contain"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {itemName}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 數量和價格 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('trade.quantity')}
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('trade.price')} (Mesos)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={price}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="1,000,000"
            className="w-full px-4 py-2.5 text-sm text-right font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 聯絡資訊 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('trade.discordUsername')}
          </label>
          <input
            type="text"
            value={discordUsername}
            onChange={(e) => setDiscordUsername(e.target.value)}
            placeholder="username#1234"
            className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('trade.characterName')}
          </label>
          <input
            type="text"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder={t('trade.characterNamePlaceholder')}
            className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 裝備素質輸入（僅裝備顯示） */}
      {isEquipment && !isEditing && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('trade.equipmentStats')}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t('trade.equipmentStatsDesc')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* STR */}
            {(selectedItemAttributes?.inc_str ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  STR
                </label>
                <input
                  type="number"
                  value={equipmentStats.str ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    str: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_str ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* DEX */}
            {(selectedItemAttributes?.inc_dex ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  DEX
                </label>
                <input
                  type="number"
                  value={equipmentStats.dex ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    dex: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_dex ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* INT */}
            {(selectedItemAttributes?.inc_int ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  INT
                </label>
                <input
                  type="number"
                  value={equipmentStats.int ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    int: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_int ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* LUK */}
            {(selectedItemAttributes?.inc_luk ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  LUK
                </label>
                <input
                  type="number"
                  value={equipmentStats.luk ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    luk: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_luk ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* ATK */}
            {(selectedItemAttributes?.inc_pad ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  ATK
                </label>
                <input
                  type="number"
                  value={equipmentStats.attack ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    attack: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_pad ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* MAG */}
            {(selectedItemAttributes?.inc_mad ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  MAG
                </label>
                <input
                  type="number"
                  value={equipmentStats.magic ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    magic: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_mad ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* DEF */}
            {(selectedItemAttributes?.inc_pdd ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  DEF
                </label>
                <input
                  type="number"
                  value={equipmentStats.pDef ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    pDef: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_pdd ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* MDEF */}
            {(selectedItemAttributes?.inc_mdd ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  MDEF
                </label>
                <input
                  type="number"
                  value={equipmentStats.mDef ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    mDef: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_mdd ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* HP */}
            {(selectedItemAttributes?.inc_mhp ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  HP
                </label>
                <input
                  type="number"
                  value={equipmentStats.hp ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    hp: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_mhp ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* MP */}
            {(selectedItemAttributes?.inc_mmp ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  MP
                </label>
                <input
                  type="number"
                  value={equipmentStats.mp ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    mp: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_mmp ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* ACC */}
            {(selectedItemAttributes?.inc_acc ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  ACC
                </label>
                <input
                  type="number"
                  value={equipmentStats.accuracy ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    accuracy: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_acc ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* EVA */}
            {(selectedItemAttributes?.inc_eva ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  EVA
                </label>
                <input
                  type="number"
                  value={equipmentStats.avoid ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    avoid: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_eva ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* Speed */}
            {(selectedItemAttributes?.inc_speed ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Speed
                </label>
                <input
                  type="number"
                  value={equipmentStats.speed ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    speed: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_speed ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* Jump */}
            {(selectedItemAttributes?.inc_jump ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Jump
                </label>
                <input
                  type="number"
                  value={equipmentStats.jump ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    jump: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.inc_jump ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {/* Slots */}
            {(selectedItemAttributes?.tuc ?? 0) > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Slots
                </label>
                <input
                  type="number"
                  value={equipmentStats.slots ?? ''}
                  onChange={(e) => setEquipmentStats(prev => ({
                    ...prev,
                    slots: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))}
                  placeholder={String(selectedItemAttributes?.tuc ?? 0)}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* 自訂屬性 */}
          <div className="col-span-full mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('trade.customStats')}
              </span>
              <button
                type="button"
                onClick={() => setCustomStats(prev => [...prev, { name: '', value: '' }])}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('trade.addCustomStat')}
              </button>
            </div>
            {customStats.map((stat, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  value={stat.name}
                  onChange={(e) => setCustomStats(prev => prev.map((s, i) =>
                    i === index ? { ...s, name: e.target.value } : s
                  ))}
                  className="flex-1 px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('trade.selectStat')}</option>
                  {STAT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={stat.value}
                  onChange={(e) => setCustomStats(prev => prev.map((s, i) =>
                    i === index ? { ...s, value: e.target.value } : s
                  ))}
                  placeholder={t('trade.customStatValue')}
                  className="flex-1 px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setCustomStats(prev => prev.filter((_, i) => i !== index))}
                  className="px-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                  aria-label="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 備註 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('trade.note')} ({t('common.optional')})
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('trade.notePlaceholder')}
          rows={2}
          className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* 按鈕 */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled}
          className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            type === 'sell'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? t('common.submitting') : isEditing ? t('common.update') : t('trade.publish')}
        </button>
      </div>
    </div>
  )
})
