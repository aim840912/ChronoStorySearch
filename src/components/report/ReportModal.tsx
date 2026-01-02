'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { BaseModal } from '@/components/common/BaseModal'
import { ReportSection } from './ReportSection'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * 檢舉系統 Modal
 * 使用全螢幕模式顯示 ReportSection
 */
export function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const { t } = useLanguage()

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} fullscreen>
      {/* Modal Header */}
      <div className="bg-orange-500 dark:bg-orange-600 p-4 sm:rounded-t-xl flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            <h2 className="text-xl font-bold text-white">{t('toolbar.report')}</h2>
          </div>
          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            aria-label={t('common.close')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Modal Body - 滾動區域 */}
      <div className="flex-1 overflow-y-auto p-4">
        <ReportSection />
      </div>
    </BaseModal>
  )
}
