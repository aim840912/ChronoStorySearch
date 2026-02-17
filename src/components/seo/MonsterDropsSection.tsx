'use client'

import { useMemo, Fragment } from 'react'
import Link from 'next/link'
import type { DropItem } from '@/types'
import { getItemImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useFavorites } from '@/hooks/useFavorites'
import { InFeedAd } from '@/components/adsense'

const AD_INTERVAL = 10
const MAX_ADS = 3
const MIN_ITEMS_FOR_ADS = 10

type DropCategory = 'equipment' | 'scroll' | 'other'

/** 根據 itemId 範圍判斷掉落物品分類 */
function getDropCategory(itemId: number): DropCategory {
  if (itemId >= 1000000 && itemId < 2000000) return 'equipment'
  if (itemId >= 2040000 && itemId < 2050000) return 'scroll'
  return 'other'
}

interface MonsterDropsSectionProps {
  drops: DropItem[]
}

/**
 * 怪物掉落物品列表（SEO 頁面用）
 * 支援列表視圖和方格視圖切換
 */
export function MonsterDropsSection({ drops }: MonsterDropsSectionProps) {
  const { t, language } = useLanguage()
  const favorites = useFavorites()
  const [viewMode, setViewMode] = useLocalStorage<'list' | 'grid'>('seo-monster-drops-view', 'list')
  const [categoryFilters, setCategoryFilters] = useLocalStorage<Record<DropCategory, boolean>>('seo-monster-drops-filters', {
    equipment: true,
    scroll: true,
    other: true,
  })

  // 各分類數量
  const categoryCounts = useMemo(() => {
    const counts: Record<DropCategory, number> = { equipment: 0, scroll: 0, other: 0 }
    for (const drop of drops) {
      counts[getDropCategory(drop.itemId)]++
    }
    return counts
  }, [drops])

  // 篩選後的掉落物品
  const filteredDrops = useMemo(() => {
    return drops.filter(drop => categoryFilters[getDropCategory(drop.itemId)])
  }, [drops, categoryFilters])

  const toggleCategory = (cat: DropCategory) => {
    setCategoryFilters(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  if (drops.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">
        {t('monsterModal.noDrops')}
      </p>
    )
  }

  return (
    <div>
      {/* 工具列：分類篩選 + 視圖切換 */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {/* 分類篩選 */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['other', 'equipment', 'scroll'] as const).map(cat => {
            if (categoryCounts[cat] === 0) return null
            return (
              <label
                key={cat}
                className={`flex items-center gap-1.5 cursor-pointer text-xs px-2 py-1 rounded-md transition-colors ${
                  categoryFilters[cat]
                    ? 'bg-gray-200/60 text-gray-700 dark:bg-gray-700/60 dark:text-gray-200'
                    : 'bg-gray-100/30 text-gray-400 dark:bg-gray-800/30 dark:text-gray-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={categoryFilters[cat]}
                  onChange={() => toggleCategory(cat)}
                  className="w-3 h-3 rounded border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0 cursor-pointer"
                />
                {t(`monster.dropFilter.${cat}`)}
                <span className="text-gray-500">({categoryCounts[cat]})</span>
              </label>
            )
          })}
        </div>

        {/* 視圖切換 */}
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

      {/* 篩選無結果提示 */}
      {filteredDrops.length === 0 && (
        <p className="text-center text-gray-500 py-6 text-sm">
          {t('monsterModal.noDrops')}
        </p>
      )}

      {/* Grid 視圖 */}
      {filteredDrops.length > 0 && viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {(() => {
            let adCount = 0
            return filteredDrops.map((drop, index) => {
              const itemName = language === 'zh-TW' && drop.chineseItemName
                ? drop.chineseItemName
                : drop.itemName
              const imgSrc = getItemImageUrl(drop.itemId)
              const isFav = favorites.items.isFavorite(drop.itemId)

              const card = (
                <Link
                  key={`drop-grid-${drop.itemId}-${index}`}
                  href={`/item/${drop.itemId}`}
                  className="relative flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-100/50 hover:bg-gray-200/60 border border-gray-300/30 hover:border-gray-400/50 dark:bg-gray-800/30 dark:hover:bg-gray-800/60 dark:border-gray-700/30 dark:hover:border-gray-600/50 transition-colors group"
                >
                  {/* 收藏按鈕 */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const name = language === 'zh-TW' && drop.chineseItemName
                        ? drop.chineseItemName
                        : drop.itemName
                      favorites.items.toggle(drop.itemId, name)
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

                  {/* 圖片 */}
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img
                      src={imgSrc}
                      alt={drop.itemName}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* 名稱 */}
                  <span className="text-xs text-gray-600 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white text-center line-clamp-2 leading-tight w-full">
                    {itemName}
                  </span>

                  {/* 機率 */}
                  <span className="text-xs font-mono text-amber-600 dark:text-amber-400">
                    {drop.chance != null ? `${drop.chance}%` : '—'}
                  </span>
                </Link>
              )

              // 穿插廣告（col-span-full 橫跨整排）
              const shouldInsertAd =
                filteredDrops.length >= MIN_ITEMS_FOR_ADS &&
                (index + 1) % AD_INTERVAL === 0 &&
                index < filteredDrops.length - 1 &&
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
      ) : filteredDrops.length > 0 ? (
        /* List 視圖（原有） */
        <div className="space-y-1">
          {(() => {
            let adCount = 0
            return filteredDrops.map((drop, index) => {
              const itemName = language === 'zh-TW' && drop.chineseItemName
                ? drop.chineseItemName
                : drop.itemName
              const imgSrc = getItemImageUrl(drop.itemId)

              const row = (
                <Link
                  key={`drop-${drop.itemId}-${index}`}
                  href={`/item/${drop.itemId}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
                >
                  {/* 物品圖片 */}
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                    <img
                      src={imgSrc}
                      alt={drop.itemName}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* 名稱 */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 dark:text-gray-200 dark:group-hover:text-white truncate block">
                      {itemName}
                    </span>
                    {language === 'zh-TW' && drop.chineseItemName && (
                      <span className="text-xs text-gray-500 truncate block">
                        {drop.itemName}
                      </span>
                    )}
                  </div>

                  {/* 機率 + 數量 */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-sm font-mono text-amber-600 dark:text-amber-400">
                      {drop.chance != null ? `${drop.chance}%` : '—'}
                    </span>
                    {drop.maxQty > 1 && (
                      <span className="text-xs text-gray-500 ml-2">
                        x{drop.minQty === drop.maxQty ? drop.maxQty : `${drop.minQty}-${drop.maxQty}`}
                      </span>
                    )}
                  </div>

                  {/* 收藏按鈕 */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const name = language === 'zh-TW' && drop.chineseItemName
                        ? drop.chineseItemName
                        : drop.itemName
                      favorites.items.toggle(drop.itemId, name)
                    }}
                    className={`flex-shrink-0 p-1 rounded transition-all duration-200 hover:scale-110 active:scale-95 ${
                      favorites.items.isFavorite(drop.itemId)
                        ? 'text-red-500 hover:text-red-600'
                        : 'text-gray-600 hover:text-red-400'
                    }`}
                    aria-label={favorites.items.isFavorite(drop.itemId) ? t('modal.favoriteRemove') : t('modal.favoriteAdd')}
                  >
                    <svg className="w-4 h-4" fill={favorites.items.isFavorite(drop.itemId) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </Link>
              )

              // 穿插廣告
              const shouldInsertAd =
                filteredDrops.length >= MIN_ITEMS_FOR_ADS &&
                (index + 1) % AD_INTERVAL === 0 &&
                index < filteredDrops.length - 1 &&
                adCount < MAX_ADS

              if (shouldInsertAd) {
                adCount++
                return (
                  <div key={`drop-group-${index}`}>
                    {row}
                    <InFeedAd key={`ad-monster-drops-${index}`} className="my-2" />
                  </div>
                )
              }

              return row
            })
          })()}
        </div>
      ) : null}
    </div>
  )
}
