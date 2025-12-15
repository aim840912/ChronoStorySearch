'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface BugReportModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Bug 回報 Modal 元件
 * 提供 Discord 聯絡資訊和回報指引
 */
export function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const { t } = useLanguage()

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
        <div className="bg-red-500 dark:bg-red-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h2 className="text-2xl font-bold text-white">{t('bug.report')}</h2>
                <p className="text-red-100 text-sm mt-1">{t('bug.subtitle')}</p>
              </div>
            </div>
            {/* 關閉按鈕 */}
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              aria-label={t('common.close')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Modal Content */}
        <div className="p-6">
          {/* Discord 頻道資訊 */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-8 h-8 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515a.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0a12.64 12.64 0 00-.617-1.25a.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057a19.9 19.9 0 005.993 3.03a.078.078 0 00.084-.028a14.09 14.09 0 001.226-1.994a.076.076 0 00-.041-.106a13.107 13.107 0 01-1.872-.892a.077.077 0 01-.008-.128a10.2 10.2 0 00.372-.292a.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127a12.299 12.299 0 01-1.873.892a.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028a19.839 19.839 0 006.002-3.03a.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('bug.discordChannel')}</h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {t('bug.discordDescription')}
            </p>

            <div className="space-y-3">
              {/* Discord 頻道連結 */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('bug.discordLink')}
                </p>
                <div className="flex flex-col gap-2">
                  <code className="bg-white dark:bg-gray-700 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-indigo-600 dark:text-indigo-400 font-mono text-xs break-all">
                    https://discord.com/channels/1326772066124566538/1428411907378774026
                  </code>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('https://discord.com/channels/1326772066124566538/1428411907378774026')
                        alert(t('bug.linkCopied'))
                      }}
                      className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded transition-colors text-sm font-medium"
                    >
                      {t('bug.copyLink')}
                    </button>
                    <button
                      onClick={() => {
                        window.open('https://discord.com/channels/1326772066124566538/1428411907378774026', '_blank')
                      }}
                      className="flex-1 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors text-sm font-medium"
                    >
                      {t('bug.openChannel')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 回報指引 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              {t('bug.reportGuidelines')}
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{t('bug.guideline1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{t('bug.guideline2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{t('bug.guideline3')}</span>
              </li>
            </ul>
          </div>

          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="w-full mt-6 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
