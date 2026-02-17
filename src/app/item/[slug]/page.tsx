import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getItemIndex,
  fetchItemDrops,
  fetchItemDetails,
  getGachaSourcesForItem,
} from '@/lib/server-data'
import { getScrollExchangeInfo } from '@/lib/scroll-exchange-utils'
import { ItemAttributesCard } from '@/components/ItemAttributesCard'
import { ItemSourcesSection } from '@/components/seo/ItemSourcesSection'
import { SeoText } from '@/components/seo/SeoText'
import { SeoFavoriteButton } from '@/components/seo/SeoFavoriteButton'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SeoSearchBar } from '@/components/seo/SeoSearchBar'
import { SeoViewHistoryStrip } from '@/components/seo/SeoViewHistoryStrip'
import { DisplayAd, MultiplexAd } from '@/components/adsense'

// ISR：每 24 小時 revalidate
export const revalidate = 86400

// 允許動態生成未預渲染的頁面
export const dynamicParams = true

/**
 * 預渲染 Top 50 物品（按掉落來源怪物數排序）
 */
export async function generateStaticParams() {
  const { items } = await getItemIndex()
  return items
    .sort((a, b) => b.monsterCount - a.monsterCount)
    .slice(0, 50)
    .map(i => ({ slug: String(i.itemId) }))
}

/**
 * 動態生成 SEO metadata
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const itemId = parseInt(slug, 10)
  if (isNaN(itemId)) return { title: 'Item Not Found' }

  const itemDrops = await fetchItemDrops(itemId)
  if (!itemDrops) return { title: 'Item Not Found' }

  const { itemName, chineseItemName, totalMonsters } = itemDrops
  const displayName = chineseItemName ? `${itemName} (${chineseItemName})` : itemName

  return {
    title: `${displayName} | ChronoStory Search`,
    description: `${displayName} is dropped by ${totalMonsters} monsters. View drop sources, rates, and item details in ChronoStory.`,
    openGraph: {
      title: `${displayName} — Drop Sources`,
      description: `Dropped by ${totalMonsters} monsters`,
      images: [
        {
          url: `https://cdn.chronostorysearch.com/images/items/${itemId}.png`,
          width: 50,
          height: 50,
          alt: itemName,
        },
      ],
    },
  }
}

/**
 * 物品詳細頁（Server Component + ISR）
 */
export default async function ItemPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const itemId = parseInt(slug, 10)
  if (isNaN(itemId)) notFound()

  // 平行抓取物品掉落來源、物品詳細資料、轉蛋機來源
  const [itemDrops, itemDetails, gachaSources] = await Promise.all([
    fetchItemDrops(itemId),
    fetchItemDetails(itemId),
    getGachaSourcesForItem(itemId),
  ])

  // 捲軸兌換資訊（同步查詢，O(1) Map lookup）
  const scrollExchangeInfo = getScrollExchangeInfo(itemId)

  // 至少需要掉落來源或物品詳情其中之一
  if (!itemDrops && !itemDetails) notFound()

  const itemName = itemDrops?.itemName ?? itemDetails?.description?.name ?? `Item #${itemId}`
  const chineseItemName = itemDrops?.chineseItemName ?? itemDetails?.description?.chineseItemName
  const monsters = itemDrops?.monsters ?? []
  const category = itemDetails?.typeInfo
    ? [itemDetails.typeInfo.overallCategory, itemDetails.typeInfo.category, itemDetails.typeInfo.subCategory]
        .filter(Boolean)
        .join(' > ')
    : null

  const R2_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://cdn.chronostorysearch.com'

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0"
          >
            &larr; ChronoStory Search
          </Link>
          <SeoSearchBar />
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Item Header — sticky below nav */}
        <header className="flex items-center gap-3 sticky top-[53px] z-[9] bg-gray-50 dark:bg-gray-950 -mx-4 px-4 py-3 border-b border-gray-200/50 dark:border-gray-800/50">
          <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gray-200/50 dark:bg-gray-800/50 rounded-lg border border-gray-300/50 dark:border-gray-700/50">
            <img
              src={`${R2_URL}/images/items/${itemId}.png`}
              alt={itemName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {itemName}
            </h1>
            {chineseItemName && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{chineseItemName}</p>
            )}
            {category && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{category}</p>
            )}
          </div>
          <SeoFavoriteButton type="item" id={itemId} name={itemName} />
        </header>

        {/* 瀏覽紀錄圖示列（自動記錄當前物品到瀏覽歷史） */}
        <SeoViewHistoryStrip currentPage={{ type: 'item', id: itemId, name: itemName }} />

        {/* Content — 大螢幕左右分欄 */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左側：物品屬性 */}
          {itemDetails && (
            <div className="lg:w-[340px] lg:flex-shrink-0">
              <section>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  <SeoText textKey="seo.attributes" />
                </h2>
                <ItemAttributesCard itemData={itemDetails} />
              </section>
            </div>
          )}

          {/* 右側：取得方式 + 掉落來源 */}
          <div className="flex-1 min-w-0 space-y-6">
            <DisplayAd />

            {/* 轉蛋機來源（紫色卡片） */}
            {gachaSources.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  <SeoText textKey="item.gachaSources" />
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {gachaSources.map((source) => (
                    <div
                      key={source.machineId}
                      className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow-sm p-4 border border-purple-200 dark:border-purple-700"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {source.chineseMachineName || source.machineName}
                            {source.machineId === 7 && (
                              <span className="text-red-500 dark:text-red-400 ml-1 text-sm">
                                (Closed)
                              </span>
                            )}
                          </p>
                          {source.chineseMachineName && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {source.machineName}
                            </p>
                          )}
                        </div>
                        <div className="bg-purple-100 dark:bg-purple-800 px-3 py-1 rounded-full flex-shrink-0">
                          <span className="text-sm font-bold text-purple-700 dark:text-purple-200">
                            {source.probability}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 捲軸兌換資訊（琥珀色卡片） */}
            {scrollExchangeInfo && (
              <section>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  <SeoText textKey="scrollExchange.title" />
                </h2>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg shadow-sm p-4 border border-amber-200 dark:border-amber-700">
                  <div className="space-y-2">
                    {scrollExchangeInfo.ScrollVoucherReq > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Voucher Required
                        </span>
                        <span className="font-semibold text-amber-700 dark:text-amber-300">
                          {scrollExchangeInfo.ScrollVoucherReq}
                        </span>
                      </div>
                    )}
                    {scrollExchangeInfo.ExchangeRate > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Exchange Rate
                        </span>
                        <span className="font-semibold text-amber-700 dark:text-amber-300">
                          {scrollExchangeInfo.ExchangeRate}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Scroll Type
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {scrollExchangeInfo.ScrollType} ({scrollExchangeInfo.ScrollPercent}%)
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                <SeoText textKey="seo.dropSources" /> ({monsters.length})
              </h2>
              <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-800/50 p-3">
                <ItemSourcesSection monsters={monsters} />
              </div>
            </section>

            <MultiplexAd />
          </div>
        </div>
      </div>
    </main>
  )
}
