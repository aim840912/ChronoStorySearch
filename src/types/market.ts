/**
 * 市場相關類型
 */

// 從 listings.ts 導入共用類型
export type { TradeType, WantedItem } from './listings'

// 可篩選的屬性鍵（用於市場篩選）
export type StatFilterKey =
  | 'watk' | 'matk' | 'wdef' | 'mdef'
  | 'str' | 'dex' | 'int' | 'luk'
  | 'hp' | 'mp' | 'acc' | 'avoid'

// 單個屬性篩選項
export interface ItemStatFilter {
  id: string
  statKey: StatFilterKey
  minValue: number | null
  maxValue: number | null
}

// 屬性篩選選項元資料
export const STAT_FILTER_OPTIONS: Record<StatFilterKey, {
  labelZh: string
  labelEn: string
  placeholder: string
}> = {
  watk: { labelZh: '物理攻擊', labelEn: 'Physical ATK', placeholder: '例：50' },
  matk: { labelZh: '魔法攻擊', labelEn: 'Magic ATK', placeholder: '例：30' },
  wdef: { labelZh: '物理防禦', labelEn: 'Physical DEF', placeholder: '例：100' },
  mdef: { labelZh: '魔法防禦', labelEn: 'Magic DEF', placeholder: '例：80' },
  str: { labelZh: '力量', labelEn: 'STR', placeholder: '例：10' },
  dex: { labelZh: '敏捷', labelEn: 'DEX', placeholder: '例：10' },
  int: { labelZh: '智力', labelEn: 'INT', placeholder: '例：10' },
  luk: { labelZh: '幸運', labelEn: 'LUK', placeholder: '例：10' },
  hp: { labelZh: 'HP', labelEn: 'HP', placeholder: '例：100' },
  mp: { labelZh: 'MP', labelEn: 'MP', placeholder: '例：100' },
  acc: { labelZh: '命中率', labelEn: 'Accuracy', placeholder: '例：20' },
  avoid: { labelZh: '迴避率', labelEn: 'Avoidability', placeholder: '例：20' }
}

// 市場篩選選項（完整定義）
export interface MarketFilterOptionsComplete {
  // 交易類型篩選（多選）
  tradeTypes: Array<'sell' | 'buy' | 'exchange'>

  // 價格範圍篩選
  priceRange: {
    min: number | null
    max: number | null
  }

  // 物品屬性篩選（動態陣列）
  itemStatsFilter: ItemStatFilter[]

  // 排序方式
  sortBy: 'created_at' | 'price'
  sortOrder: 'asc' | 'desc'
}

// 分頁資訊
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// 市場刊登回應（含用戶資訊）
export interface ListingWithUserInfo {
  // 基本刊登資訊
  id: string
  user_id: string
  item_id: number
  quantity: number
  price?: number
  trade_type: 'sell' | 'buy' | 'exchange'
  /** @deprecated Use wanted_items array instead */
  wanted_item_id?: number
  /** @deprecated Use wanted_items array instead */
  wanted_quantity?: number
  wanted_items?: Array<{ item_id: number; quantity: number }>
  discord_contact: string
  ingame_name: string | null
  seller_discord_id: string | null
  webhook_url?: string
  status: 'active' | 'sold' | 'cancelled' | 'expired' | 'suspended'
  view_count: number
  interest_count: number
  created_at: string
  updated_at: string
  expires_at?: string | null
  deleted_at?: string | null

  // 物品屬性資訊（來自 item_stats 表）
  item_stats: import('./item-stats').ItemStats | null

  // 賣家資訊（來自 API join）
  seller: {
    username: string
    discord_username: string | null
    discord_discriminator: string | null
  }

  // 物品資訊（需要從前端資料補充）
  item: {
    itemId: number
    itemName: string
    chineseItemName: string | null
  }
}

// 市場刊登列表回應
export interface MarketListingsResponse {
  listings: ListingWithUserInfo[]
  pagination: Pagination
}
