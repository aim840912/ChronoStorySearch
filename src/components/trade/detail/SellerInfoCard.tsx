'use client'

import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 遮蔽用戶名中間部分
 * 用於在查看聯絡方式前提供部分資訊
 */
function maskUsername(username: string): string {
  if (username.length <= 2) {
    return username.charAt(0) + '*'
  }
  if (username.length <= 4) {
    return username.charAt(0) + '**' + username.charAt(username.length - 1)
  }
  return username.charAt(0) + '***' + username.charAt(username.length - 1)
}

/**
 * 聯絡方式資訊介面
 */
interface ContactInfo {
  discord: string
  ingame: string | null
  discordId?: string | null
  quota_remaining: number
  is_own_listing: boolean
}

/**
 * 賣家資訊與聯絡方式卡片元件
 *
 * 功能：
 * - 顯示賣家頭像與用戶名（未查看時遮蔽）
 * - 查看聯絡方式按鈕（消耗配額）
 * - 摺疊式聯絡方式顯示
 * - Discord 與遊戲內角色名
 * - Discord Deep Link 支援
 *
 * 使用範例：
 * ```tsx
 * <SellerInfoCard
 *   sellerUsername="username"
 *   isOwnListing={false}
 *   contactInfo={contactInfo}
 *   showContact={showContact}
 *   isLoadingContact={false}
 *   onToggleContact={handleToggleContact}
 * />
 * ```
 */
interface SellerInfoCardProps {
  /** 賣家用戶名 */
  sellerUsername: string
  /** 是否為自己的刊登 */
  isOwnListing: boolean
  /** 聯絡方式資訊（查看後才有） */
  contactInfo: ContactInfo | null
  /** 是否顯示聯絡方式 */
  showContact: boolean
  /** 是否正在載入聯絡方式 */
  isLoadingContact: boolean
  /** 切換聯絡方式顯示的回調 */
  onToggleContact: () => void
}

export function SellerInfoCard({
  sellerUsername,
  isOwnListing,
  contactInfo,
  showContact,
  isLoadingContact,
  onToggleContact
}: SellerInfoCardProps) {
  const { t } = useLanguage()

  // 顯示的用戶名（自己的刊登或已查看：完整名稱，未查看：遮蔽名稱）
  const displayUsername = isOwnListing
    ? sellerUsername
    : contactInfo
      ? contactInfo.discord
      : maskUsername(sellerUsername)

  return (
    <div className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('listing.sellerInfo')}</h3>

      {/* 賣家資訊與聯絡方式按鈕 - 左右排列 */}
      <div className="flex items-start gap-3 mb-4">
        {/* 左側：頭像 + 用戶名/信譽 */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold flex-shrink-0 ${
            isOwnListing || contactInfo ? 'bg-blue-500' : 'bg-gray-400'
          }`}>
            {displayUsername.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">
              {displayUsername}
            </p>
            {!isOwnListing && !contactInfo && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                點擊查看完整資訊
              </p>
            )}
          </div>
        </div>

        {/* 右側：查看聯絡方式按鈕 + 展開內容 */}
        {(!isOwnListing || process.env.NODE_ENV === 'development') && (
          <div className="flex flex-col flex-shrink-0">
            <button
              onClick={onToggleContact}
              disabled={isLoadingContact}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg
                         hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">
                {isLoadingContact
                  ? t('listing.loadingContact')
                  : isOwnListing
                    ? t('listing.viewContact') + ' (' + t('listing.ownListing') + ')'
                    : contactInfo
                      ? t('listing.viewContact') + ` (${contactInfo.quota_remaining}/30)`
                      : '查看完整聯絡方式 (消耗配額)'
                }
              </span>
              {contactInfo && (
                <svg
                  className={`w-5 h-5 transition-transform ${showContact ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {/* 摺疊式聯絡方式內容 - 移到按鈕下方 */}
            {contactInfo && showContact && (
              <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-top-2">
                {/* Discord 聯絡方式 */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <svg className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Discord</div>
                    <div className="font-medium text-gray-900 dark:text-white">{contactInfo.discord}</div>
                    {contactInfo.discordId && (
                      <div className="mt-2 flex gap-2">
                        <a
                          href={`discord://users/${contactInfo.discordId}`}
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        >
                          {t('listing.openInDiscord')}
                        </a>
                        <span className="text-sm text-gray-400">|</span>
                        <a
                          href={`https://discord.com/users/${contactInfo.discordId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        >
                          {t('listing.openInWeb')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* 遊戲內角色名（如果有） */}
                {contactInfo.ingame && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <svg className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                    </svg>
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('listing.ingameName')}
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">{contactInfo.ingame}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
