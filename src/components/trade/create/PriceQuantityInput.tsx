'use client'

import { TradeType } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 價格與數量輸入元件
 *
 * 功能：
 * - 輸入刊登數量（所有交易類型）
 * - 輸入價格（非交換類型）
 * - 根據交易類型顯示/隱藏價格欄位
 *
 * 使用範例：
 * ```tsx
 * <PriceQuantityInput
 *   tradeType="sell"
 *   quantity={1}
 *   price={1000}
 *   onQuantityChange={setQuantity}
 *   onPriceChange={setPrice}
 * />
 * ```
 */
interface PriceQuantityInputProps {
  /** 交易類型 */
  tradeType: TradeType
  /** 數量 */
  quantity: number
  /** 價格（可選，交換模式不需要） */
  price: number | null
  /** 數量變更回調 */
  onQuantityChange: (value: number) => void
  /** 價格變更回調 */
  onPriceChange: (value: number | null) => void
}

export function PriceQuantityInput({
  tradeType,
  quantity,
  price,
  onQuantityChange,
  onPriceChange
}: PriceQuantityInputProps) {
  const { t } = useLanguage()

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* 數量 */}
      <div>
        <label className="block mb-2 font-semibold">{t('listing.quantityLabel')}</label>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
          className="w-full px-4 py-2 border rounded-lg
                     dark:bg-gray-800 dark:border-gray-600
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 價格（僅在非交換模式顯示） */}
      {tradeType !== 'exchange' && (
        <div>
          <label className="block mb-2 font-semibold">{t('listing.priceLabel')}</label>
          <input
            type="number"
            min="0"
            value={price || ''}
            onChange={(e) => onPriceChange(parseInt(e.target.value) || null)}
            className="w-full px-4 py-2 border rounded-lg
                       dark:bg-gray-800 dark:border-gray-600
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}
    </div>
  )
}
