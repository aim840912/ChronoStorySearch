'use client'

import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 交易意向登記卡片元件
 *
 * 功能：
 * - 訊息輸入框（選填）
 * - 字數計數器
 * - 登記按鈕
 * - 根據交易類型顯示不同文字
 *
 * 使用範例：
 * ```tsx
 * <InterestRegistrationCard
 *   tradeType="sell"
 *   message={message}
 *   onMessageChange={setMessage}
 *   onSubmit={handleRegisterInterest}
 *   isSubmitting={false}
 * />
 * ```
 */
interface InterestRegistrationCardProps {
  /** 交易類型 */
  tradeType: 'sell' | 'buy' | 'exchange'
  /** 訊息內容 */
  message: string
  /** 訊息變更回調 */
  onMessageChange: (value: string) => void
  /** 提交回調 */
  onSubmit: () => void
  /** 是否正在提交 */
  isSubmitting: boolean
}

export function InterestRegistrationCard({
  tradeType,
  message,
  onMessageChange,
  onSubmit,
  isSubmitting
}: InterestRegistrationCardProps) {
  const { t } = useLanguage()

  return (
    <div className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
        {t(`listing.registerInterest.${tradeType}`)}
      </h3>
      <textarea
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        placeholder={t(`listing.messageToSeller.${tradeType}`)}
        className="w-full p-3 border rounded-lg dark:border-gray-600
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   placeholder-gray-400 dark:placeholder-gray-500
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows={3}
        maxLength={500}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {t('listing.characterLimit', { current: message.length, max: 500 })}
      </p>
      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="mt-3 w-full px-4 py-2 bg-blue-500 text-white rounded-lg
                   hover:bg-blue-600 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? t('listing.registering') : t(`listing.registerInterestBtn.${tradeType}`)}
      </button>
    </div>
  )
}
