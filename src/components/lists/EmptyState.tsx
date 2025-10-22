'use client'

interface EmptyStateProps {
  hasSearchTerm: boolean
  mode: 'favorite-monsters' | 'favorite-items' | 'all'
  t: (key: string) => string
}

/**
 * 空狀態顯示元件 - 當沒有資料時顯示的提示訊息
 */
export function EmptyState({ hasSearchTerm, mode, t }: EmptyStateProps) {
  // 根據模式決定圖示和文字
  const getEmptyConfig = () => {
    if (hasSearchTerm) {
      return {
        icon: (
          <div className="mb-4 flex justify-center">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        ),
        title: mode === 'all' ? t('empty.noResults') : t('empty.searchNoMatch'),
        subtitle: t('empty.tryOtherKeywords'),
      }
    }

    if (mode === 'favorite-monsters') {
      return {
        icon: (
          <div className="mb-4 flex justify-center">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
        ),
        title: t('empty.noFavoriteMonsters'),
        subtitle: t('empty.clickToFavoriteMonster'),
      }
    }

    if (mode === 'favorite-items') {
      return {
        icon: (
          <div className="mb-4 flex justify-center">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
        ),
        title: t('empty.noFavoriteItems'),
        subtitle: t('empty.clickToFavoriteItem'),
      }
    }

    // all mode without search
    return {
      icon: (
        <div className="mb-4 flex justify-center">
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
      ),
      title: t('empty.noData'),
      subtitle: null,
    }
  }

  const config = getEmptyConfig()

  return (
    <div className="text-center py-12 mt-8">
      {config.icon}
      <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
        {config.title}
      </p>
      {config.subtitle && (
        <p className="text-gray-500 dark:text-gray-500 text-sm">
          {config.subtitle}
        </p>
      )}
    </div>
  )
}
