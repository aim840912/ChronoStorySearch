'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/LanguageContext'

// 環境變數控制
const PATREON_ENABLED = process.env.NEXT_PUBLIC_PATREON_ENABLED !== 'false'
const PATREON_URL = 'https://www.patreon.com/15318832/join'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * 關於本站 Modal 元件
 * 顯示專案資訊、資料來源和社群連結
 */
export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const { t } = useLanguage()
  const [showPatreonWarning, setShowPatreonWarning] = useState(false)

  // ESC 鍵關閉 modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-indigo-500 dark:bg-indigo-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/images/chrono.png"
                alt="ChronoStory Logo"
                className="w-10 h-10"
              />
              <h2 className="text-2xl font-bold text-white">{t('toolbar.aboutPage')}</h2>
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

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {/* 資料來源 */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t('about.dataSource')}</p>
              <a
                href="https://docs.google.com/spreadsheets/d/e/2PACX-1vRpKuZGJQIFFxSi6kzYx4ALI0MQborpLEkh3J1qIGSd0Bw7U4NYg5CK-3ESzyK580z4D8NO59SUeC3k/pubhtml?gid=1888753114&single=true"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t('about.dataSourceDesc')}
              </a>
            </div>
          </div>

          {/* 社群連結 */}
          <div className="pt-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t('about.community')}</p>
            <div className="flex gap-2">
              {/* Discord - 加好友 */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText('tiencheng')
                  alert('已複製 Discord ID: tiencheng')
                }}
                className="flex-1 flex items-center justify-center gap-2 p-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span className="text-sm font-medium">tiencheng</span>
              </button>
              {/* Email */}
              <a
                href="mailto:aim840912@gmail.com"
                className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <span className="text-sm font-medium">Email</span>
              </a>
              {/* Patreon - 贊助 */}
              {PATREON_ENABLED && (
                <button
                  onClick={() => setShowPatreonWarning(true)}
                  className="flex-1 flex items-center justify-center gap-2 p-3 bg-[#FF424D] hover:bg-[#E03E48] text-white rounded-lg transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z"/>
                  </svg>
                  <span className="text-sm font-medium">Patreon</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            {t('about.disclaimer')}
          </p>
        </div>
      </div>

      {/* Patreon 警告對話框 - 使用 Portal 渲染到 body */}
      {showPatreonWarning && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowPatreonWarning(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - 橘色 Patreon 風格 */}
            <div className="bg-[#FF424D] p-5 rounded-t-xl">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z"/>
                </svg>
                <h3 className="text-xl font-bold text-white">{t('about.patreonWarningTitle')}</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-5">
                {t('about.patreonWarningMessage')}
              </p>

              {/* 按鈕組 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPatreonWarning(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  {t('about.patreonCancel')}
                </button>
                <button
                  onClick={() => {
                    window.open(PATREON_URL, '_blank')
                    setShowPatreonWarning(false)
                  }}
                  className="flex-1 px-4 py-2.5 bg-[#FF424D] hover:bg-[#E03E48] text-white rounded-lg font-medium transition-colors"
                >
                  {t('about.patreonConfirm')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
