'use client'

import { useFavorites } from '@/hooks/useFavorites'
import { useLanguage } from '@/contexts/LanguageContext'

interface SeoFavoriteButtonProps {
  type: 'monster' | 'item'
  id: number
  name: string
}

/**
 * SEO 頁面用的收藏按鈕
 * Client Component，使用 useFavorites hook
 */
export function SeoFavoriteButton({ type, id, name }: SeoFavoriteButtonProps) {
  const favorites = useFavorites()
  const { t } = useLanguage()
  const entity = type === 'monster' ? favorites.monsters : favorites.items
  const isFav = entity.isFavorite(id)

  return (
    <button
      onClick={() => entity.toggle(id, name)}
      className={`flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 ${
        isFav
          ? 'text-red-500 hover:text-red-600'
          : 'text-gray-500 hover:text-red-400'
      }`}
      aria-label={isFav ? t('modal.favoriteRemove') : t('modal.favoriteAdd')}
      title={isFav ? t('modal.favoriteRemove') : t('modal.favoriteAdd')}
    >
      <svg
        className="w-5 h-5"
        fill={isFav ? 'currentColor' : 'none'}
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
}
