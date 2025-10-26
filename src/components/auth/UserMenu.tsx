'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import type { User } from '@/lib/auth/session-validator'

/**
 * 用戶選單元件 Props
 */
interface UserMenuProps {
  onOpenCreateListing: () => void
  onOpenMyListings: () => void
  onOpenMarketBrowser: () => void
  onOpenInterests: () => void
}

/**
 * 用戶選單元件
 * 顯示用戶頭像、用戶名和下拉選單（個人資料、交易系統、登出）
 */
export function UserMenu({
  onOpenCreateListing,
  onOpenMyListings,
  onOpenMarketBrowser,
  onOpenInterests,
}: UserMenuProps) {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 點擊外部關閉選單
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!user) return null

  /**
   * 取得 Discord 頭像 URL
   */
  const getAvatarUrl = (user: User): string => {
    if (user.discord_avatar) {
      return `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png?size=128`
    }
    // 無頭像時使用預設 Discord 頭像
    const defaultAvatarIndex = parseInt(user.discord_discriminator) % 5
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`
  }

  /**
   * 處理登出
   */
  const handleLogout = async () => {
    setIsOpen(false)
    await logout()
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* 用戶頭像按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 sm:p-2 rounded-full sm:rounded-lg font-medium transition-all duration-200 flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm hover:shadow-md"
        aria-label={t('auth.profile')}
      >
        {/* Discord 頭像 */}
        <img
          src={getAvatarUrl(user)}
          alt={user.discord_username}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
        />
        {/* 用戶名（僅桌面版顯示） */}
        <span className="hidden sm:inline text-sm font-medium">{user.discord_username}</span>
        {/* 下拉箭頭 */}
        <svg
          className={`hidden sm:block w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {/* 個人資料 */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-2"
            disabled
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {t('auth.profile')}
            <span className="ml-auto text-xs text-gray-400">{t('gacha.startDrawing')}</span>
          </button>

          {/* 分隔線 */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

          {/* 交易系統選項 */}
          <div className="px-3 py-1.5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">交易系統</p>
          </div>

          {/* 市場瀏覽 */}
          <button
            onClick={() => {
              setIsOpen(false)
              onOpenMarketBrowser()
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            市場
          </button>

          {/* 建立刊登 */}
          <button
            onClick={() => {
              setIsOpen(false)
              onOpenCreateListing()
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            建立刊登
          </button>

          {/* 我的刊登 */}
          <button
            onClick={() => {
              setIsOpen(false)
              onOpenMyListings()
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            我的刊登
          </button>

          {/* 購買意向 */}
          <button
            onClick={() => {
              setIsOpen(false)
              onOpenInterests()
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            購買意向
          </button>

          {/* 分隔線 */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

          {/* 登出 */}
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {t('auth.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
