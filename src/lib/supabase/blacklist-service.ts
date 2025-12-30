import { supabase } from './client'

export interface BlacklistEntry {
  id: string
  userId: string
  blockedDiscordUsername: string
  createdAt: string
}

interface BlacklistRow {
  id: string
  user_id: string
  blocked_discord_username: string
  created_at: string
}

/**
 * 將資料庫 row 轉換為 BlacklistEntry
 */
function rowToEntry(row: BlacklistRow): BlacklistEntry {
  return {
    id: row.id,
    userId: row.user_id,
    blockedDiscordUsername: row.blocked_discord_username,
    createdAt: row.created_at,
  }
}

/**
 * 黑名單服務
 * 管理用戶的交易黑名單（封鎖特定 Discord 用戶）
 */
class BlacklistService {
  /**
   * 取得當前用戶的黑名單
   */
  async getBlacklist(): Promise<BlacklistEntry[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('trade_blacklist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('取得黑名單失敗:', error)
      return []
    }

    return (data as BlacklistRow[]).map(rowToEntry)
  }

  /**
   * 取得黑名單的 Discord 用戶名列表（用於過濾）
   */
  async getBlockedUsernames(): Promise<Set<string>> {
    const entries = await this.getBlacklist()
    return new Set(entries.map(e => e.blockedDiscordUsername.toLowerCase()))
  }

  /**
   * 加入黑名單
   */
  async addToBlacklist(discordUsername: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('trade_blacklist')
      .insert({
        user_id: user.id,
        blocked_discord_username: discordUsername,
      })

    if (error) {
      // 如果是重複鍵錯誤，視為成功（已在黑名單中）
      if (error.code === '23505') return true
      console.error('加入黑名單失敗:', error)
      return false
    }

    return true
  }

  /**
   * 從黑名單移除
   */
  async removeFromBlacklist(discordUsername: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('trade_blacklist')
      .delete()
      .eq('user_id', user.id)
      .eq('blocked_discord_username', discordUsername)

    if (error) {
      console.error('移除黑名單失敗:', error)
      return false
    }

    return true
  }

  /**
   * 檢查是否在黑名單中
   */
  async isBlocked(discordUsername: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('trade_blacklist')
      .select('id')
      .eq('user_id', user.id)
      .eq('blocked_discord_username', discordUsername)
      .single()

    if (error) return false
    return !!data
  }
}

export const blacklistService = new BlacklistService()
