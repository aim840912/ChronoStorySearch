'use client'

import { memo, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import type { BlacklistEntry } from '@/lib/supabase/blacklist-service'

interface BlacklistModalProps {
  isOpen: boolean
  onClose: () => void
  entries: BlacklistEntry[]
  onRemove: (discordUsername: string) => Promise<boolean>
}

/**
 * 黑名單 Modal
 * 顯示黑名單列表，可解除封鎖
 */
export const BlacklistModal = memo(function BlacklistModal({
  isOpen,
  onClose,
  entries,
  onRemove,
}: BlacklistModalProps) {
  const { language } = useLanguage()
  const { showToast } = useToast()
  const isZh = language === 'zh-TW'

  const handleRemove = useCallback(async (discordUsername: string) => {
    const success = await onRemove(discordUsername)
    if (success) {
      showToast(isZh ? '已解除封鎖' : 'Unblocked', 'success')
    } else {
      showToast(isZh ? '操作失敗' : 'Failed', 'error')
    }
  }, [onRemove, showToast, isZh])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題列 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {isZh ? '黑名單' : 'Blacklist'} ({entries.length})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 列表 */}
        <div className="max-h-80 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {isZh ? '黑名單是空的' : 'Blacklist is empty'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-indigo-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span className="text-sm text-gray-900 dark:text-white truncate">
                      {entry.blockedDiscordUsername}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(entry.blockedDiscordUsername)}
                    className="shrink-0 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    {isZh ? '解除' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 底部說明 */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isZh
              ? '黑名單中的用戶刊登將不會顯示在交易列表中'
              : 'Listings from blocked users will be hidden'}
          </p>
        </div>
      </div>
    </div>
  )
})
