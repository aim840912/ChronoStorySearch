import { NextRequest } from 'next/server'
import { withOptionalAuthAndError } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'
import type { EnhanceScroll } from '@/types/enhance'
import machine7Data from '@/../data/gacha/machine-7-enhanced.json'
import itemAttributesData from '@/../data/item-attributes.json'

/**
 * GET /api/enhance/scrolls
 * 獲取所有可用的卷軸列表（來自 machine-7 和詛咒卷）
 *
 * Query Parameters:
 * - category?: string - 篩選特定裝備分類的卷軸
 */
async function handleGET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  // 從 machine-7 提取所有普通卷軸
  const normalScrolls: EnhanceScroll[] = machine7Data.items
    .filter(item => item.scroll) // 只選擇有 scroll 屬性的物品
    .map(item => {
      const scroll = item.scroll!

      return {
        itemId: item.itemId,
        itemName: item.itemName || 'Unknown Scroll',
        chineseName: item.chineseName || item.itemName || 'Unknown Scroll',
        category: scroll.category,
        successRate: scroll.successRate,
        destroyRate: scroll.destroyRate,
        stats: scroll.stats
      }
    })

  // 從 item-attributes 提取所有詛咒卷 (destroy_rate > 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cursedScrolls: EnhanceScroll[] = (itemAttributesData as any[])
    .filter(item => item.scroll && item.scroll.destroy_rate > 0)
    .map(item => {
      const scroll = item.scroll

      return {
        itemId: parseInt(item.item_id),
        itemName: item.item_name || 'Unknown Cursed Scroll',
        chineseName: item.chinese_name || item.item_name || 'Unknown Cursed Scroll',
        category: scroll.category,
        successRate: scroll.success_rate,
        destroyRate: scroll.destroy_rate,
        stats: {
          str: scroll.stats.str,
          dex: scroll.stats.dex,
          int: scroll.stats.int,
          luk: scroll.stats.luk,
          watk: scroll.stats.watk,
          matk: scroll.stats.matk,
          wdef: scroll.stats.wdef,
          mdef: scroll.stats.mdef,
          hp: scroll.stats.hp,
          mp: scroll.stats.mp,
          accuracy: scroll.stats.accuracy,
          avoidability: scroll.stats.avoidability,
          speed: scroll.stats.speed,
          jump: scroll.stats.jump,
          upgrades: null
        }
      }
    })

  // 合併普通卷軸和詛咒卷
  const allScrolls = [...normalScrolls, ...cursedScrolls]

  // 如果指定了 category，進行篩選
  const filteredScrolls = category
    ? allScrolls.filter(scroll => scroll.category === category)
    : allScrolls

  return success(filteredScrolls, '成功獲取卷軸列表')
}

export const GET = withOptionalAuthAndError(handleGET, {
  module: 'EnhanceScrollsAPI'
})
