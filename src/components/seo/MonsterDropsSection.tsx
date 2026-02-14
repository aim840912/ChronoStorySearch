'use client'

import Link from 'next/link'
import type { DropItem } from '@/types'
import { getItemImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { InFeedAd } from '@/components/adsense'

const AD_INTERVAL = 10
const MAX_ADS = 3
const MIN_ITEMS_FOR_ADS = 10

interface MonsterDropsSectionProps {
  drops: DropItem[]
}

/**
 * 怪物掉落物品列表（SEO 頁面用）
 * 使用 <Link> 連結到物品詳細頁，支援 SEO 內部連結
 */
export function MonsterDropsSection({ drops }: MonsterDropsSectionProps) {
  const { t, language } = useLanguage()

  if (drops.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">
        {t('monsterModal.noDrops')}
      </p>
    )
  }

  let adCount = 0

  return (
    <div className="space-y-1">
      {drops.map((drop, index) => {
        const itemName = language === 'zh-TW' && drop.chineseItemName
          ? drop.chineseItemName
          : drop.itemName
        const imgSrc = getItemImageUrl(drop.itemId)

        const row = (
          <Link
            key={`drop-${drop.itemId}-${index}`}
            href={`/item/${drop.itemId}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
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
              <span className="text-sm text-gray-200 group-hover:text-white truncate block">
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
              <span className="text-sm font-mono text-amber-400">
                {drop.chance != null ? `${drop.chance}%` : '—'}
              </span>
              {drop.maxQty > 1 && (
                <span className="text-xs text-gray-500 ml-2">
                  x{drop.minQty === drop.maxQty ? drop.maxQty : `${drop.minQty}-${drop.maxQty}`}
                </span>
              )}
            </div>
          </Link>
        )

        // 穿插廣告
        const shouldInsertAd =
          drops.length >= MIN_ITEMS_FOR_ADS &&
          (index + 1) % AD_INTERVAL === 0 &&
          index < drops.length - 1 &&
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
      })}
    </div>
  )
}
