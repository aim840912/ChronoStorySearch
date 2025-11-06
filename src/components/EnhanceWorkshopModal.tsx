'use client'

import { BaseModal } from '@/components/common/BaseModal'
import { EnhanceWorkshop } from '@/components/enhance/EnhanceWorkshop'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLanguageToggle } from '@/hooks/useLanguageToggle'

interface EnhanceWorkshopModalProps {
  isOpen: boolean
  onClose: () => void
  // Modal 堆疊支援
  hasPreviousModal?: boolean
  onGoBack?: () => void
  // 預選裝備（從轉蛋機帶過來）
  preSelectedEquipmentId?: number
}

export function EnhanceWorkshopModal({
  isOpen,
  onClose,
  hasPreviousModal = false,
  onGoBack,
  preSelectedEquipmentId
}: EnhanceWorkshopModalProps) {
  const { t } = useLanguage()
  const toggleLanguage = useLanguageToggle()

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-7xl"
      zIndex="z-[80]"
      hasPreviousModal={hasPreviousModal}
      onGoBack={onGoBack}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-green-500 dark:bg-green-600 p-4 sm:p-6 rounded-t-xl">
        <div className="flex items-center justify-between">
          {/* 左欄：返回按鈕 */}
          <div className="flex items-center gap-2 sm:gap-3">
            {hasPreviousModal && onGoBack && (
              <button
                onClick={onGoBack}
                className="p-2 sm:p-2.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                aria-label="返回"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* 中欄：標題（居中）*/}
          <div className="flex-1 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {t('enhance.title')}
            </h2>
            <p className="text-white/90 text-sm mt-1">
              {t('enhance.description')}
            </p>
          </div>

          {/* 右欄：翻譯 + 關閉按鈕 */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 翻譯按鈕 */}
            <button
              onClick={toggleLanguage}
              className="p-2 sm:p-2.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              aria-label={t('common.toggleLanguage')}
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
              className="p-2 sm:p-2.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              aria-label="關閉"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 bg-white dark:bg-gray-900">
        <EnhanceWorkshop preSelectedEquipmentId={preSelectedEquipmentId} />
      </div>
    </BaseModal>
  )
}
