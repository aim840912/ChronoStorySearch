import type { EnhanceScroll } from '@/types/enhance'
import type { ItemAttributes } from '@/types'
import machine7Data from '@/../data/gacha/machine-7-enhanced.json'
import itemAttributesData from '@/../data/item-attributes.json'

// 擴展 ItemAttributes 以包含可能的 chinese_name 欄位
type ItemAttributesWithChineseName = ItemAttributes & {
  chinese_name?: string
}

/**
 * 獲取所有可用的強化卷軸
 * 合併普通卷軸（來自 machine-7）和詛咒卷（來自 item-attributes）
 */
export function getAllScrolls(): EnhanceScroll[] {
  // 從 machine-7 提取所有普通卷軸
  const normalScrolls: EnhanceScroll[] = machine7Data.items
    .filter(item => item.scroll)
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
  const cursedScrolls: EnhanceScroll[] = (itemAttributesData as ItemAttributesWithChineseName[])
    .filter(item => item.scroll && item.scroll.destroy_rate > 0)
    .map(item => {
      // 使用非空斷言，因為上方 filter 已確認 item.scroll 存在
      const scroll = item.scroll!

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

  return [...normalScrolls, ...cursedScrolls]
}

/**
 * 根據裝備分類獲取可用的卷軸
 */
export function getScrollsByCategory(category: string): EnhanceScroll[] {
  return getAllScrolls().filter(scroll => scroll.category === category)
}
