import type { MetadataRoute } from 'next'
import { getMonsterIndex, getItemIndex } from '@/lib/server-data'

/**
 * 動態 Sitemap 生成
 *
 * 包含所有怪物和物品的 SEO 頁面 URL。
 * Google Search Console 會自動發現 /sitemap.xml。
 *
 * 優先順序：
 * - 首頁: 1.0
 * - Boss 怪物: 0.9
 * - 普通怪物: 0.7
 * - 高來源物品 (>10 monsters): 0.8
 * - 一般物品: 0.6
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ monsters }, { items }] = await Promise.all([
    getMonsterIndex(),
    getItemIndex(),
  ])

  const baseUrl = 'https://chronostorysearch.com'

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const monsterPages: MetadataRoute.Sitemap = monsters
    .filter(m => m.inGame !== false)
    .map(m => ({
      url: `${baseUrl}/monster/${m.mobId}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: m.isBoss ? 0.9 : 0.7,
    }))

  const itemPages: MetadataRoute.Sitemap = items.map(i => ({
    url: `${baseUrl}/item/${i.itemId}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: i.monsterCount > 10 ? 0.8 : 0.6,
  }))

  return [...staticPages, ...monsterPages, ...itemPages]
}
