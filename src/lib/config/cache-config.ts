/**
 * 快取配置
 *
 * 集中管理所有快取 TTL（Time To Live）設定
 *
 * 架構：
 * - Redis 快取：短期、高速讀取（1 小時）
 * - 資料庫快取：長期、減少 Discord API 呼叫（24 小時）
 *
 * 參考：docs/architecture/交易系統/05-Discord驗證系統.md
 */

/**
 * Redis 快取 TTL 設定（單位：秒）
 */
export const RedisTTL = {
  /**
   * Discord 伺服器成員資格快取
   * - 1 小時 = 3600 秒
   * - 用途：快速驗證使用者是否為伺服器成員
   * - 位置：Redis Layer 1 快取
   */
  DISCORD_MEMBERSHIP: 3600,

  /**
   * Discord 帳號資訊快取
   * - 1 小時 = 3600 秒
   * - 用途：快取 Discord 使用者基本資訊
   */
  DISCORD_PROFILE: 3600
} as const

/**
 * 資料庫快取 TTL 設定（單位：小時）
 */
export const DatabaseCacheTTL = {
  /**
   * Discord 伺服器成員資格快取
   * - 24 小時
   * - 用途：減少 Discord API 呼叫次數
   * - 位置：discord_profiles 表的 server_member_checked_at 欄位
   */
  DISCORD_MEMBERSHIP: 24
} as const

/**
 * Redis 快取 Key 前綴
 */
export const RedisKeys = {
  /**
   * Discord 伺服器成員資格快取 Key
   * 格式: discord:membership:{user_id}:{guild_id}
   *
   * @param userId - 使用者 UUID
   * @param guildId - Discord 伺服器 ID (Guild ID)
   * @returns Redis 快取 Key
   */
  discordMembership: (userId: string, guildId: string) =>
    `discord:membership:${userId}:${guildId}`,

  /**
   * Discord 帳號資訊快取 Key
   * 格式: discord:profile:{user_id}
   *
   * @param userId - 使用者 UUID
   * @returns Redis 快取 Key
   */
  discordProfile: (userId: string) =>
    `discord:profile:${userId}`
} as const
