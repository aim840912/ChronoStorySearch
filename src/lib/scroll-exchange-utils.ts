/**
 * 捲軸兌換共用查詢工具
 *
 * 提供 Map<ItemID, ScrollExchangeItem> 實現 O(1) 查詢
 * 供 ScrollExchangeSection、ItemModal、page.tsx 共用
 */
import scrollExchangeData from '../../data/sheets-scroll-exchange.json'

export interface ScrollExchangeItem {
  ItemID: number
  ItemName: string
  Category: string
  ScrollType: string
  ScrollPercent: number
  RateMulitplier: number
  ExchangeRate: number
  ScrollVoucherReq: number
}

const data = scrollExchangeData as ScrollExchangeItem[]

/** 以 ItemID 為 key 的 Map，O(1) 查詢兌換資訊 */
export const scrollExchangeMap: Map<number, ScrollExchangeItem> = new Map(
  data.map(item => [item.ItemID, item])
)

/** 所有可兌換的 ItemID 集合 */
export const exchangeableItemIds: Set<number> = new Set(data.map(item => item.ItemID))

/** 查詢單一物品的兌換資訊，找不到回 null */
export function getScrollExchangeInfo(itemId: number): ScrollExchangeItem | null {
  return scrollExchangeMap.get(itemId) ?? null
}
