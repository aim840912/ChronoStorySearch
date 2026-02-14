import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getMonsterIndex,
  fetchMonsterDrops,
  getMobInfo,
} from '@/lib/server-data'
import { MonsterStatsCard } from '@/components/MonsterStatsCard'
import { MonsterDropsSection } from '@/components/seo/MonsterDropsSection'
import { SeoText } from '@/components/seo/SeoText'
import { LanguageToggle } from '@/components/LanguageToggle'
import { DisplayAd, MultiplexAd } from '@/components/adsense'

// ISR：每 24 小時 revalidate
export const revalidate = 86400

// 允許動態生成未預渲染的頁面
export const dynamicParams = true

/**
 * 預渲染 Top 50 怪物（按掉落物品數排序）
 */
export async function generateStaticParams() {
  const { monsters } = await getMonsterIndex()
  return monsters
    .filter(m => m.inGame !== false)
    .sort((a, b) => b.dropCount - a.dropCount)
    .slice(0, 50)
    .map(m => ({ slug: String(m.mobId) }))
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
  const mobId = parseInt(slug, 10)
  if (isNaN(mobId)) return { title: 'Monster Not Found' }

  const monsterData = await fetchMonsterDrops(mobId)
  if (!monsterData) return { title: 'Monster Not Found' }

  const { mobName, chineseMobName, drops } = monsterData
  const displayName = chineseMobName ? `${mobName} (${chineseMobName})` : mobName
  const dropCount = drops.length

  return {
    title: `${displayName} | ChronoStory Search`,
    description: `${displayName} drops ${dropCount} items. View drop rates, quantities, and find where to hunt this monster in ChronoStory.`,
    openGraph: {
      title: `${displayName} — Drop Table`,
      description: `${dropCount} items dropped by ${mobName}`,
      images: [
        {
          url: `https://cdn.chronostorysearch.com/images/monsters/${mobId}.png`,
          width: 100,
          height: 100,
          alt: mobName,
        },
      ],
    },
  }
}

/**
 * 怪物詳細頁（Server Component + ISR）
 */
export default async function MonsterPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const mobId = parseInt(slug, 10)
  if (isNaN(mobId)) notFound()

  // 平行抓取怪物掉落資料和怪物屬性
  const [monsterData, mobInfo] = await Promise.all([
    fetchMonsterDrops(mobId),
    getMobInfo(mobId),
  ])

  if (!monsterData) notFound()

  const { mobName, chineseMobName, isBoss, drops } = monsterData
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
        {/* Monster Header */}
        <header className="flex items-center gap-4">
          <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center bg-gray-800/50 rounded-xl border border-gray-700/50">
            <img
              src={`${R2_URL}/images/monsters/${mobId}.png`}
              alt={mobName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {mobName}
            </h1>
            {chineseMobName && (
              <p className="text-lg text-gray-400">{chineseMobName}</p>
            )}
            {isBoss && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded">
                BOSS
              </span>
            )}
          </div>
        </header>

        {/* Monster Stats */}
        {mobInfo && (
          <section>
            <h2 className="text-lg font-semibold text-gray-200 mb-3">
              <SeoText textKey="seo.monsterStats" />
            </h2>
            <MonsterStatsCard mobInfo={mobInfo} />
          </section>
        )}

        <DisplayAd />

        {/* Drop List */}
        <section>
          <h2 className="text-lg font-semibold text-gray-200 mb-3">
            <SeoText textKey="seo.droppedItems" /> ({drops.length})
          </h2>
          <div className="bg-gray-900/50 rounded-xl border border-gray-800/50 p-3">
            <MonsterDropsSection drops={drops} />
          </div>
        </section>

        <MultiplexAd />
      </div>
    </main>
  )
}
