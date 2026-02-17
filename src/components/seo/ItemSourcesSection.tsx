'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import type { DropsByItemMonster } from '@/types'
import { getMonsterImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useFavorites } from '@/hooks/useFavorites'
import { InFeedAd } from '@/components/adsense'

const AD_INTERVAL = 10
const MAX_ADS = 2
const MIN_ITEMS_FOR_ADS = 10

interface ItemSourcesSectionProps {
  monsters: DropsByItemMonster[]
}

/**
 * 物品掉落來源怪物列表（SEO 頁面用）
 * 支援列表視圖和方格視圖切換
 */
export function ItemSourcesSection({ monsters }: ItemSourcesSectionProps) {
  const { t, language } = useLanguage()
  const favorites = useFavorites()
  const [viewMode, setViewMode] = useLocalStorage<'list' | 'grid'>('seo-item-sources-view', 'list')

  if (monsters.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">
        {t('itemModal.noDropSources')}
      </p>
    )
  }

  return (
    <div>
      {/* 視圖切換按鈕 */}
      <div className="flex justify-end mb-2">
        <div className="flex items-center gap-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-gray-300 text-gray-900 dark:bg-gray-700 dark:text-white'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
            aria-label={t('item.switchToList')}
            title={t('item.switchToList')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-gray-300 text-gray-900 dark:bg-gray-700 dark:text-white'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
            aria-label={t('item.switchToGrid')}
            title={t('item.switchToGrid')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Grid 視圖 */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {(() => {
            let adCount = 0
            return monsters.map((monster, index) => {
              const mobName = language === 'zh-TW' && monster.chineseMobName
                ? monster.chineseMobName
                : monster.mobName
              const imgSrc = getMonsterImageUrl(monster.mobId)
              const isFav = favorites.monsters.isFavorite(monster.mobId)

              const card = (
                <Link
                  key={`source-grid-${monster.mobId}-${index}`}
                  href={`/monster/${monster.mobId}`}
                  className="relative flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-100/50 hover:bg-gray-200/60 border border-gray-300/30 hover:border-gray-400/50 dark:bg-gray-800/30 dark:hover:bg-gray-800/60 dark:border-gray-700/30 dark:hover:border-gray-600/50 transition-colors group"
                >
                  {/* BOSS 標籤 */}
                  {monster.isBoss && (
                    <span className="absolute top-1 left-1 px-1 py-0.5 text-[8px] font-medium bg-red-500/20 text-red-400 rounded">
                      BOSS
                    </span>
                  )}

                  {/* 收藏按鈕 */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const name = language === 'zh-TW' && monster.chineseMobName
                        ? monster.chineseMobName
                        : monster.mobName
                      favorites.monsters.toggle(monster.mobId, name)
                    }}
                    className={`absolute top-1 right-1 p-0.5 rounded transition-all duration-200 hover:scale-110 active:scale-95 ${
                      isFav
                        ? 'text-red-500 hover:text-red-600'
                        : 'text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100'
                    }`}
                    aria-label={isFav ? t('modal.favoriteRemove') : t('modal.favoriteAdd')}
                  >
                    <svg className="w-3.5 h-3.5" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>

                  {/* 怪物圖片 */}
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img
                      src={imgSrc}
                      alt={monster.mobName}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* 名稱 */}
                  <span className="text-xs text-gray-600 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white text-center line-clamp-2 leading-tight w-full">
                    {mobName}
                  </span>

                  {/* 機率 */}
                  <span className="text-xs font-mono text-amber-600 dark:text-amber-400">
                    {monster.displayChance}
                  </span>
                </Link>
              )

              // 穿插廣告（col-span-full 橫跨整排）
              const shouldInsertAd =
                monsters.length >= MIN_ITEMS_FOR_ADS &&
                (index + 1) % AD_INTERVAL === 0 &&
                index < monsters.length - 1 &&
                adCount < MAX_ADS

              if (shouldInsertAd) {
                adCount++
                return (
                  <Fragment key={`grid-group-${index}`}>
                    {card}
                    <InFeedAd className="col-span-full my-1" />
                  </Fragment>
                )
              }

              return card
            })
          })()}
        </div>
      ) : (
        /* List 視圖（原有） */
        <div className="space-y-1">
          {(() => {
            let adCount = 0
            return monsters.map((monster, index) => {
              const mobName = language === 'zh-TW' && monster.chineseMobName
                ? monster.chineseMobName
                : monster.mobName
              const imgSrc = getMonsterImageUrl(monster.mobId)

              const row = (
                <Link
                  key={`source-${monster.mobId}-${index}`}
                  href={`/monster/${monster.mobId}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
                >
                  {/* 怪物圖片 */}
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                    <img
                      src={imgSrc}
                      alt={monster.mobName}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* 名稱 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 dark:text-gray-200 dark:group-hover:text-white truncate">
                        {mobName}
                      </span>
                      {monster.isBoss && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 rounded">
                          BOSS
                        </span>
                      )}
                    </div>
                    {language === 'zh-TW' && monster.chineseMobName && (
                      <span className="text-xs text-gray-500 truncate block">
                        {monster.mobName}
                      </span>
                    )}
                  </div>

                  {/* 機率 + 數量 */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-sm font-mono text-amber-600 dark:text-amber-400">
                      {monster.displayChance}
                    </span>
                    {monster.maxQty > 1 && (
                      <span className="text-xs text-gray-500 ml-2">
                        x{monster.minQty === monster.maxQty ? monster.maxQty : `${monster.minQty}-${monster.maxQty}`}
                      </span>
                    )}
                  </div>

                  {/* 收藏按鈕 */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const name = language === 'zh-TW' && monster.chineseMobName
                        ? monster.chineseMobName
                        : monster.mobName
                      favorites.monsters.toggle(monster.mobId, name)
                    }}
                    className={`flex-shrink-0 p-1 rounded transition-all duration-200 hover:scale-110 active:scale-95 ${
                      favorites.monsters.isFavorite(monster.mobId)
                        ? 'text-red-500 hover:text-red-600'
                        : 'text-gray-600 hover:text-red-400'
                    }`}
                    aria-label={favorites.monsters.isFavorite(monster.mobId) ? t('modal.favoriteRemove') : t('modal.favoriteAdd')}
                  >
                    <svg className="w-4 h-4" fill={favorites.monsters.isFavorite(monster.mobId) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </Link>
              )

              // 穿插廣告
              const shouldInsertAd =
                monsters.length >= MIN_ITEMS_FOR_ADS &&
                (index + 1) % AD_INTERVAL === 0 &&
                index < monsters.length - 1 &&
                adCount < MAX_ADS

              if (shouldInsertAd) {
                adCount++
                return (
                  <div key={`source-group-${index}`}>
                    {row}
                    <InFeedAd key={`ad-item-sources-${index}`} className="my-2" />
                  </div>
                )
              }

              return row
            })
          })()}
        </div>
      )}
    </div>
  )
}
