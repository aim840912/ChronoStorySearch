'use client'

import Link from 'next/link'
import type { DropsByItemMonster } from '@/types'
import { getMonsterImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { InFeedAd } from '@/components/adsense'

const AD_INTERVAL = 10
const MAX_ADS = 2
const MIN_ITEMS_FOR_ADS = 10

interface ItemSourcesSectionProps {
  monsters: DropsByItemMonster[]
}

/**
 * 物品掉落來源怪物列表（SEO 頁面用）
 * 使用 <Link> 連結到怪物詳細頁，支援 SEO 內部連結
 */
export function ItemSourcesSection({ monsters }: ItemSourcesSectionProps) {
  const { t, language } = useLanguage()

  if (monsters.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">
        {t('itemModal.noDropSources')}
      </p>
    )
  }

  let adCount = 0

  return (
    <div className="space-y-1">
      {monsters.map((monster, index) => {
        const mobName = language === 'zh-TW' && monster.chineseMobName
          ? monster.chineseMobName
          : monster.mobName
        const imgSrc = getMonsterImageUrl(monster.mobId)

        const row = (
          <Link
            key={`source-${monster.mobId}-${index}`}
            href={`/monster/${monster.mobId}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
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
                <span className="text-sm text-gray-200 group-hover:text-white truncate">
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
              <span className="text-sm font-mono text-amber-400">
                {monster.displayChance}
              </span>
              {monster.maxQty > 1 && (
                <span className="text-xs text-gray-500 ml-2">
                  x{monster.minQty === monster.maxQty ? monster.maxQty : `${monster.minQty}-${monster.maxQty}`}
                </span>
              )}
            </div>
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
      })}
    </div>
  )
}
