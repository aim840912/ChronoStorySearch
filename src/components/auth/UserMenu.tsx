'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import type { User } from '@/lib/auth/session-validator'
import { clientLogger } from '@/lib/logger'

/**
 * 用戶選單元件
 * 顯示用戶頭像、用戶名和下拉選單（個人資料、系統設定（管理員）、登出）
 */
export function UserMenu() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 檢查管理員權限
  useEffect(() => {
    // 重置狀態（當 user 變更時）
    setIsAdmin(false)

    // 只有當 user 存在且已完全載入時才檢查管理員權限
    if (!user || !user.id) {
      return
    }

    async function checkAdminStatus() {
      try {
        const response = await fetch('/api/auth/me/roles', {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()

          if (data.success && data.data.isAdmin) {
            setIsAdmin(true)
          }
        } else {
          // 記錄 API 請求失敗（非 401/403 的情況）
          if (response.status !== 401 && response.status !== 403) {
            clientLogger.warn('檢查管理員權限失敗', {
              userId: user?.id,
              status: response.status
            })
          }
        }
      } catch (error) {
        // 記錄非預期的錯誤
        clientLogger.error('檢查管理員權限時發生錯誤', {
          userId: user?.id,
          error
        })
      }
    }

    checkAdminStatus()
  }, [user])

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
            <span className="ml-auto text-xs text-gray-400">{t('common.comingSoon')}</span>
          </button>

          {/* 系統設定（僅管理員） */}
          {isAdmin && (
            <button
              onClick={() => {
                setIsOpen(false)
                router.push('/admin/system-settings')
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('admin.systemSettings')}
            </button>
          )}

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
