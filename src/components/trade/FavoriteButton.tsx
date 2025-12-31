'use client'

import { memo, useState, useCallback } from 'react'
import { tradeService } from '@/lib/supabase/trade-service'
import { useAuth } from '@/contexts/AuthContext'

interface FavoriteButtonProps {
  listingId: string
  isFavorited: boolean
  onToggle?: (isFavorited: boolean) => void
  size?: 'sm' | 'md'
  disabled?: boolean  // 外部傳入的禁用狀態（如：非伺服器成員）
}

/**
 * 收藏按鈕組件
 * 愛心圖示，點擊切換收藏狀態
 */
export const FavoriteButton = memo(function FavoriteButton({
  listingId,
  isFavorited: initialFavorited,
  onToggle,
  size = 'md',
  disabled: externalDisabled = false,
}: FavoriteButtonProps) {
  const { user } = useAuth()
  const [isFavorited, setIsFavorited] = useState(initialFavorited)
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!user || externalDisabled) {
      // 未登入或外部禁用時不執行任何動作
      return
    }

    if (isLoading) return

    setIsLoading(true)
    try {
      const success = await tradeService.toggleFavorite(listingId, isFavorited)
      if (success) {
        const newState = !isFavorited
        setIsFavorited(newState)
        onToggle?.(newState)
      }
    } catch (error) {
      console.error('切換收藏失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, externalDisabled, listingId, isFavorited, isLoading, onToggle])

  const sizeClasses = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
  const buttonPadding = size === 'sm' ? 'p-1' : 'p-1.5'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!user || isLoading || externalDisabled}
      className={`${buttonPadding} rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isFavorited
          ? 'text-red-500 hover:text-red-600'
          : 'text-gray-400 hover:text-red-400'
      }`}
      aria-label={isFavorited ? '取消收藏' : '加入收藏'}
    >
      <svg
        className={`${sizeClasses} ${isLoading ? 'animate-pulse' : ''}`}
        fill={isFavorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  )
})
