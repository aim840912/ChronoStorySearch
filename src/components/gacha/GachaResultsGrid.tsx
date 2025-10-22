'use client'

import type { GachaItem } from '@/types'
import { GachaResultCard } from './GachaResultCard'

interface GachaResultsGridProps {
  results: Array<GachaItem & { drawId: number }>
  t: (key: string) => string
}

export function GachaResultsGrid({ results, t }: GachaResultsGridProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-24 h-24 mx-auto mb-4 text-purple-400 dark:text-purple-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
          {t('gacha.startDrawing')}
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
          {t('gacha.clickDrawButton')}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        {t('gacha.results')}
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-14 gap-2 max-h-[500px] overflow-y-auto scrollbar-hide p-2">
        {results.map((item) => (
          <GachaResultCard key={`draw-${item.drawId}`} item={item} />
        ))}
      </div>
    </div>
  )
}
