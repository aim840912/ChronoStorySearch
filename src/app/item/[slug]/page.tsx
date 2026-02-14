import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getItemIndex,
  fetchItemDrops,
  fetchItemDetails,
} from '@/lib/server-data'
import { ItemAttributesCard } from '@/components/ItemAttributesCard'
import { ItemSourcesSection } from '@/components/seo/ItemSourcesSection'
import { SeoText } from '@/components/seo/SeoText'
import { LanguageToggle } from '@/components/LanguageToggle'
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

  // 平行抓取物品掉落來源和物品詳細資料
  const [itemDrops, itemDetails] = await Promise.all([
    fetchItemDrops(itemId),
    fetchItemDetails(itemId),
  ])

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
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            &larr; ChronoStory Search
          </Link>
          <LanguageToggle />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Item Header */}
        <header className="flex items-center gap-4">
          <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-gray-800/50 rounded-xl border border-gray-700/50">
            <img
              src={`${R2_URL}/images/items/${itemId}.png`}
              alt={itemName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {itemName}
            </h1>
            {chineseItemName && (
              <p className="text-lg text-gray-400">{chineseItemName}</p>
            )}
            {category && (
              <p className="text-sm text-gray-500 mt-0.5">{category}</p>
            )}
          </div>
        </header>

        {/* Item Attributes */}
        {itemDetails && (
          <section>
            <h2 className="text-lg font-semibold text-gray-200 mb-3">
              <SeoText textKey="seo.attributes" />
            </h2>
            <ItemAttributesCard itemData={itemDetails} />
          </section>
        )}

        <DisplayAd />

        {/* Drop Sources */}
        <section>
          <h2 className="text-lg font-semibold text-gray-200 mb-3">
            <SeoText textKey="seo.dropSources" /> ({monsters.length})
          </h2>
          <div className="bg-gray-900/50 rounded-xl border border-gray-800/50 p-3">
            <ItemSourcesSection monsters={monsters} />
          </div>
        </section>

        <MultiplexAd />
      </div>
    </main>
  )
}
