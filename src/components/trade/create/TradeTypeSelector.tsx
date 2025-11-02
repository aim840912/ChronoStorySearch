'use client'

import { TradeType } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 交易類型選擇器元件
 *
 * 功能：
 * - 選擇交易類型（sell, buy, exchange）
 * - 顯示當前選中狀態
 * - 支援國際化
 *
 * 使用範例：
 * ```tsx
 * <TradeTypeSelector
 *   value={tradeType}
 *   onChange={setTradeType}
 * />
 * ```
 */
interface TradeTypeSelectorProps {
  /** 當前選中的交易類型 */
  value: TradeType
  /** 交易類型變更回調 */
  onChange: (type: TradeType) => void
}

export function TradeTypeSelector({ value, onChange }: TradeTypeSelectorProps) {
  const { t } = useLanguage()

  const tradeTypes: TradeType[] = ['sell', 'buy', 'exchange']

  return (
    <div className="mb-6">
      <label className="block mb-2 font-semibold">{t('listing.tradeType')}</label>
      <div className="flex gap-2">
        {tradeTypes.map((type) => (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              value === type
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {t(`trade.type.${type}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
