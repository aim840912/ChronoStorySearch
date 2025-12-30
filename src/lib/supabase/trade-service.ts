import { supabase } from './client'
import type {
  TradeListing,
  TradeListingWithFavorite,
  TradeListingRow,
  CreateTradeListingInput,
  UpdateTradeListingInput,
  TradeListingFilters,
} from '@/types/trade'

/**
 * 將資料庫 row 轉換為 TradeListing
 */
function rowToListing(row: TradeListingRow): TradeListing {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    itemId: row.item_id,
    itemName: row.item_name,
    quantity: row.quantity,
    price: row.price,
    discordUsername: row.discord_username,
    characterName: row.character_name,
    note: row.note ?? undefined,
    equipmentStats: row.equipment_stats ?? undefined,
    isVerified: row.is_verified ?? false,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  }
}

/**
 * 計算 30 天後的過期時間
 */
function getExpiresAt(): string {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString()
}

/**
 * TradeService
 * 處理交易刊登相關的 CRUD 操作
 */
export const tradeService = {
  // ============================================
  // 刊登 CRUD
  // ============================================

  /**
   * 取得刊登列表
   * @param filters 篩選條件
   * @param limit 每頁數量
   * @param offset 偏移量
   */
  async getListings(
    filters?: TradeListingFilters,
    limit = 20,
    offset = 0
  ): Promise<{ data: TradeListing[]; count: number }> {
    let query = supabase
      .from('trade_listings')
      .select('*', { count: 'exact' })

    // 預設只顯示 active 且未過期的刊登
    if (!filters?.userId) {
      query = query
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
    }

    // 篩選條件
    if (filters?.type) {
      query = query.eq('type', filters.type)
    }
    if (filters?.itemId) {
      query = query.eq('item_id', filters.itemId)
    }
    if (filters?.search) {
      query = query.ilike('item_name', `%${filters.search}%`)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }

    // 排序與分頁
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('取得刊登列表失敗:', error)
      return { data: [], count: 0 }
    }

    return {
      data: (data as TradeListingRow[]).map(rowToListing),
      count: count ?? 0,
    }
  },

  /**
   * 取得刊登列表（含收藏狀態）
   */
  async getListingsWithFavorites(
    filters?: TradeListingFilters,
    limit = 20,
    offset = 0
  ): Promise<{ data: TradeListingWithFavorite[]; count: number }> {
    const { data: listings, count } = await this.getListings(filters, limit, offset)

    // 取得當前用戶
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        data: listings.map(l => ({ ...l, isFavorited: false })),
        count,
      }
    }

    // 取得用戶的收藏
    const listingIds = listings.map(l => l.id)
    const { data: favorites } = await supabase
      .from('trade_favorites')
      .select('listing_id')
      .eq('user_id', user.id)
      .in('listing_id', listingIds)

    const favoritedIds = new Set(favorites?.map(f => f.listing_id) ?? [])

    return {
      data: listings.map(l => ({
        ...l,
        isFavorited: favoritedIds.has(l.id),
      })),
      count,
    }
  },

  /**
   * 取得單一刊登
   */
  async getListing(id: string): Promise<TradeListing | null> {
    const { data, error } = await supabase
      .from('trade_listings')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('取得刊登失敗:', error)
      return null
    }

    return rowToListing(data as TradeListingRow)
  },

  /**
   * 建立刊登
   * @param input 刊登資料
   * @param isVerified 刊登者是否有 Support 身分組（建立時記錄）
   */
  async createListing(input: CreateTradeListingInput, isVerified: boolean = false): Promise<TradeListing | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('建立刊登失敗: 未登入')
      return null
    }

    const { data, error } = await supabase
      .from('trade_listings')
      .insert({
        user_id: user.id,
        type: input.type,
        item_id: input.itemId,
        item_name: input.itemName,
        quantity: input.quantity,
        price: input.price,
        discord_username: input.discordUsername,
        character_name: input.characterName,
        note: input.note,
        equipment_stats: input.equipmentStats ?? null,
        is_verified: isVerified,
        expires_at: getExpiresAt(),
      })
      .select()
      .single()

    if (error) {
      console.error('建立刊登失敗:', error)
      return null
    }

    return rowToListing(data as TradeListingRow)
  },

  /**
   * 更新刊登
   */
  async updateListing(id: string, input: UpdateTradeListingInput): Promise<TradeListing | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('更新刊登失敗: 未登入')
      return null
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (input.quantity !== undefined) updateData.quantity = input.quantity
    if (input.price !== undefined) updateData.price = input.price
    if (input.characterName !== undefined) updateData.character_name = input.characterName
    if (input.note !== undefined) updateData.note = input.note
    if (input.status !== undefined) updateData.status = input.status

    const { data, error } = await supabase
      .from('trade_listings')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // 確保只能更新自己的刊登
      .select()
      .single()

    if (error) {
      console.error('更新刊登失敗:', error)
      return null
    }

    return rowToListing(data as TradeListingRow)
  },

  /**
   * 刪除刊登
   */
  async deleteListing(id: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('刪除刊登失敗: 未登入')
      return false
    }

    const { error } = await supabase
      .from('trade_listings')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // 確保只能刪除自己的刊登

    if (error) {
      console.error('刪除刊登失敗:', error)
      return false
    }

    return true
  },

  // ============================================
  // 收藏功能
  // ============================================

  /**
   * 取得用戶的收藏列表
   */
  async getFavorites(limit = 20, offset = 0): Promise<{ data: TradeListingWithFavorite[]; count: number }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: [], count: 0 }
    }

    // 取得收藏的刊登 ID
    const { data: favorites, count: favCount } = await supabase
      .from('trade_favorites')
      .select('listing_id', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!favorites || favorites.length === 0) {
      return { data: [], count: favCount ?? 0 }
    }

    const listingIds = favorites.map(f => f.listing_id)

    // 取得刊登詳情
    const { data: listings } = await supabase
      .from('trade_listings')
      .select('*')
      .in('id', listingIds)

    if (!listings) {
      return { data: [], count: favCount ?? 0 }
    }

    // 保持收藏順序
    const listingMap = new Map(
      (listings as TradeListingRow[]).map(l => [l.id, rowToListing(l)])
    )

    const orderedListings = listingIds
      .map(id => listingMap.get(id))
      .filter((l): l is TradeListing => l !== undefined)
      .map(l => ({ ...l, isFavorited: true }))

    return { data: orderedListings, count: favCount ?? 0 }
  },

  /**
   * 新增收藏
   */
  async addFavorite(listingId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('新增收藏失敗: 未登入')
      return false
    }

    const { error } = await supabase
      .from('trade_favorites')
      .insert({
        user_id: user.id,
        listing_id: listingId,
      })

    if (error) {
      // 23505: unique_violation - 已經收藏過
      if (error.code === '23505') {
        return true // 視為成功
      }
      console.error('新增收藏失敗:', error)
      return false
    }

    return true
  },

  /**
   * 移除收藏
   */
  async removeFavorite(listingId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('移除收藏失敗: 未登入')
      return false
    }

    const { error } = await supabase
      .from('trade_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)

    if (error) {
      console.error('移除收藏失敗:', error)
      return false
    }

    return true
  },

  /**
   * 切換收藏狀態
   */
  async toggleFavorite(listingId: string, isFavorited: boolean): Promise<boolean> {
    if (isFavorited) {
      return this.removeFavorite(listingId)
    } else {
      return this.addFavorite(listingId)
    }
  },

  // ============================================
  // 用戶相關
  // ============================================

  /**
   * 取得當前用戶的刊登
   */
  async getMyListings(limit = 20, offset = 0): Promise<{ data: TradeListing[]; count: number }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: [], count: 0 }
    }

    return this.getListings({ userId: user.id }, limit, offset)
  },

  /**
   * 取得當前用戶 ID
   */
  async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  },

  /**
   * 取得 Discord 用戶名（從 auth.users metadata）
   */
  async getDiscordUsername(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Discord OAuth 會將用戶名存在 user_metadata
    const metadata = user.user_metadata
    return metadata?.full_name || metadata?.name || metadata?.preferred_username || null
  },

  /**
   * 取得最近使用的角色名稱（從最近一筆刊登）
   */
  async getLastCharacterName(): Promise<string | null> {
    const { data } = await this.getMyListings(1, 0)
    return data[0]?.characterName ?? null
  },

  /**
   * 取得當前用戶進行中的刊登數量
   * 只計算 status = 'active' 的刊登，不含已完成/已取消
   */
  async getActiveListingCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await supabase
      .from('trade_listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (error) {
      console.error('取得進行中刊登數量失敗:', error)
      return 0
    }

    return count ?? 0
  },
}
