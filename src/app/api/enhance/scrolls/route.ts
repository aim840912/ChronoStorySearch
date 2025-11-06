import { NextRequest } from 'next/server'
import { withOptionalAuthAndError } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'
import type { EnhanceScroll } from '@/types/enhance'
import { CURSED_SCROLL_RULES } from '@/types/enhance'
import machine7Data from '@/../data/gacha/machine-7-enhanced.json'

/**
 * GET /api/enhance/scrolls
 * 獲取所有可用的卷軸列表（來自 machine-7）
 *
 * Query Parameters:
 * - category?: string - 篩選特定裝備分類的卷軸
 */
async function handleGET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  // 從 machine-7 提取所有卷軸物品
  const scrolls: EnhanceScroll[] = machine7Data.items
    .filter(item => item.scroll) // 只選擇有 scroll 屬性的物品
    .map(item => {
      const scroll = item.scroll!
      const successRate = scroll.successRate
      const destroyRate = CURSED_SCROLL_RULES[successRate] || 0

      return {
        itemId: item.itemId,
        itemName: item.itemName || 'Unknown Scroll',
        chineseName: item.chineseName || item.itemName || 'Unknown Scroll',
        category: scroll.category,
        successRate: successRate,
        destroyRate: destroyRate,
        stats: scroll.stats
      }
    })

  // 如果指定了 category，進行篩選
  const filteredScrolls = category
    ? scrolls.filter(scroll => scroll.category === category)
    : scrolls

  return success(filteredScrolls, '成功獲取卷軸列表')
}

export const GET = withOptionalAuthAndError(handleGET, {
  module: 'EnhanceScrollsAPI'
})
