'use client'

import { memo, useState, useCallback } from 'react'
import { tradeService } from '@/lib/supabase/trade-service'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import type { ReportReason } from '@/types/trade'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  listingId: string
  itemName: string
}

const REPORT_REASONS: ReportReason[] = [
  'spam',
  'scam',
  'inappropriate',
  'wrong_price',
  'other',
]

/**
 * 檢舉 Modal
 * 選擇檢舉原因並送出
 */
export const ReportModal = memo(function ReportModal({
  isOpen,
  onClose,
  listingId,
  itemName,
}: ReportModalProps) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) return

    setIsSubmitting(true)
    try {
      const report = await tradeService.reportListing({
        listingId,
        reason: selectedReason,
        description: description.trim() || undefined,
      })

      if (report) {
        showToast(t('trade.reportSuccess'), 'success')
        onClose()
      } else {
        showToast(t('trade.alreadyReported'), 'error')
      }
    } catch (error) {
      console.error('檢舉失敗:', error)
      showToast(t('common.error'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedReason, description, listingId, onClose, showToast, t])

  const handleClose = useCallback(() => {
    setSelectedReason(null)
    setDescription('')
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('trade.reportTitle')}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 內容 */}
        <div className="p-4 space-y-4">
          {/* 物品名稱 */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('trade.reportingItem')}: <span className="font-medium text-gray-900 dark:text-white">{itemName}</span>
          </p>

          {/* 檢舉原因 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('trade.reportReason')}
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedReason === reason
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    {t(`trade.reportReason.${reason}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 補充說明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('trade.reportDescription')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('trade.reportDescriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* 按鈕 */}
        <div className="flex gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('common.submitting') : t('trade.report')}
          </button>
        </div>
      </div>
    </div>
  )
})
