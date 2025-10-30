/**
 * 交易系統核心型別定義
 */

export type TradeType = 'sell' | 'buy' | 'exchange'
export type ListingStatus = 'active' | 'sold' | 'cancelled'

export interface Listing {
  id: string
  user_id: string
  trade_type: TradeType
  item_id: number
  item_name?: string
  price: number | null
  quantity: number
  ingame_name: string | null
  item_stats: Record<string, number> | null
  webhook_url: string | null
  status: ListingStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface WantedItem {
  item_id: number
  quantity: number
}

export interface MyListing extends Omit<Listing, 'id'> {
  id: number
  listing_wanted_items: WantedItem[]
}

// Supabase JOIN 返回的原始格式（陣列）
export interface CandidateListingRaw {
  id: number
  user_id: string
  trade_type: TradeType
  item_id: number
  quantity: number
  status: ListingStatus
  view_count: number
  interest_count: number
  created_at: string
  listing_wanted_items?: WantedItem[]
  users?: Array<{
    discord_username: string
  }>
  discord_profiles?: Array<{
    reputation_score: number | null
  }>
}

// 應用層使用的格式（展平後）
export interface CandidateListing {
  id: number
  user_id: string
  trade_type: TradeType
  item_id: number
  quantity: number
  status: ListingStatus
  view_count: number
  interest_count: number
  created_at: string
  listing_wanted_items?: WantedItem[]
  seller: {
    discord_username: string
    reputation_score: number
  }
}

export interface Interest {
  id: string
  listing_id: string
  buyer_id: string
  message: string | null
  created_at: string
  status: 'pending' | 'accepted' | 'rejected'
}

export interface ReceivedInterest extends Interest {
  buyer: {
    discord_id: string
    discord_username: string
    discord_avatar: string | null
  }
  listing: {
    id: string
    item_name: string
    trade_type: TradeType
  }
}
