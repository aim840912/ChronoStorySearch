/**
 * 交易系統類型定義
 */

// 交易類型
export type TradeType = 'sell' | 'buy'

/**
 * 自訂屬性（用於記錄潛能、特殊效果等）
 */
export interface CustomStat {
  name: string   // 屬性名稱
  value: string  // 屬性值（用 string 更靈活，可以是數字或文字）
}

/**
 * 裝備素質（用於交易刊登）
 * 所有欄位皆為選填，只有該裝備擁有的屬性才會有值
 */
export interface EquipmentStats {
  str?: number        // 力量
  dex?: number        // 敏捷
  int?: number        // 智力
  luk?: number        // 幸運
  attack?: number     // 攻擊力 (incPAD)
  magic?: number      // 魔力 (incMAD)
  pDef?: number       // 物防 (incPDD)
  mDef?: number       // 魔防 (incMDD)
  hp?: number         // HP (incMHP)
  mp?: number         // MP (incMMP)
  accuracy?: number   // 命中 (incACC)
  avoid?: number      // 迴避 (incEVA)
  speed?: number      // 速度
  jump?: number       // 跳躍
  slots?: number      // 剩餘升級次數
  custom?: CustomStat[]  // 自訂屬性
}

/**
 * 裝備素質篩選條件（用於交易市場篩選）
 * 每個欄位代表該屬性的最小值要求
 */
export interface EquipmentStatsFilter {
  str?: number        // 最小力量
  dex?: number        // 最小敏捷
  int?: number        // 最小智力
  luk?: number        // 最小幸運
  attack?: number     // 最小攻擊力
  magic?: number      // 最小魔力
  pDef?: number       // 最小物防
  mDef?: number       // 最小魔防
  hp?: number         // 最小 HP
  mp?: number         // 最小 MP
  accuracy?: number   // 最小命中
  avoid?: number      // 最小迴避
  speed?: number      // 最小速度
  jump?: number       // 最小跳躍
  slots?: number      // 最小剩餘升級次數
}

// 交易狀態
export type TradeStatus = 'active' | 'completed' | 'cancelled' | 'expired'

/**
 * 交易刊登
 */
export interface TradeListing {
  id: string
  userId: string
  type: TradeType
  itemId: number
  itemName: string
  quantity: number
  price: number
  discordUsername: string
  characterName: string
  note?: string
  equipmentStats?: EquipmentStats  // 裝備素質（僅裝備物品有）
  status: TradeStatus
  createdAt: string
  updatedAt: string
  expiresAt: string
}

/**
 * 交易刊登（含收藏狀態，用於列表顯示）
 */
export interface TradeListingWithFavorite extends TradeListing {
  isFavorited?: boolean
}

/**
 * 建立交易刊登輸入
 */
export interface CreateTradeListingInput {
  type: TradeType
  itemId: number
  itemName: string
  quantity: number
  price: number
  discordUsername: string
  characterName?: string  // 可選，會自動帶入上次填寫的值
  note?: string
  equipmentStats?: EquipmentStats  // 裝備素質（僅裝備物品需要）
}

/**
 * 更新交易刊登輸入
 */
export interface UpdateTradeListingInput {
  quantity?: number
  price?: number
  characterName?: string
  note?: string
  status?: TradeStatus
}

/**
 * 交易刊登篩選條件
 */
export interface TradeListingFilters {
  type?: TradeType
  itemId?: number
  search?: string
  status?: TradeStatus
  userId?: string
}

/**
 * 交易收藏
 */
export interface TradeFavorite {
  id: string
  userId: string
  listingId: string
  createdAt: string
}

/**
 * 資料庫行轉換為前端類型的輔助類型
 */
export interface TradeListingRow {
  id: string
  user_id: string
  type: TradeType
  item_id: number
  item_name: string
  quantity: number
  price: number
  discord_username: string
  character_name: string
  note: string | null
  equipment_stats: EquipmentStats | null  // 裝備素質 JSONB
  status: TradeStatus
  created_at: string
  updated_at: string
  expires_at: string
}

export interface TradeFavoriteRow {
  id: string
  user_id: string
  listing_id: string
  created_at: string
}
