/**
 * Discord 伺服器成員驗證服務
 * 用於檢查用戶是否加入指定的 Discord 伺服器
 */

// ChronoStory Discord 伺服器 ID
const DISCORD_SERVER_ID = '1326772066124566538'

// Support 身分組 ID（擁有此角色可享有更高刊登上限）
const SUPPORT_ROLE_ID = '1436579907919675443'

// Discord 邀請連結
export const DISCORD_INVITE_URL = 'https://discord.com/invite/Erkv7vSNZg'

// 刊登數量限制（從環境變數讀取，有預設值）
export const LISTING_LIMIT_DEFAULT = parseInt(
  process.env.NEXT_PUBLIC_LISTING_LIMIT_DEFAULT ?? '1',
  10
)
export const LISTING_LIMIT_VERIFIED = parseInt(
  process.env.NEXT_PUBLIC_LISTING_LIMIT_VERIFIED ?? '3',
  10
)

// 成員狀態快取 key 和 TTL（24 小時）
const MEMBERSHIP_CACHE_KEY = 'chronostory-discord-membership'
const MEMBERSHIP_CACHE_TTL = 24 * 60 * 60 * 1000

interface MembershipCache {
  isMember: boolean
  isVerified: boolean
  roles: string[]
  checkedAt: number
}

/**
 * 從 localStorage 讀取成員狀態快取
 */
function getMembershipCache(): MembershipCache | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(MEMBERSHIP_CACHE_KEY)
    if (!cached) return null

    const data: MembershipCache = JSON.parse(cached)
    // 檢查是否過期
    if (Date.now() - data.checkedAt > MEMBERSHIP_CACHE_TTL) {
      localStorage.removeItem(MEMBERSHIP_CACHE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

/**
 * 設置成員狀態快取
 */
function setMembershipCache(
  isMember: boolean,
  isVerified: boolean = false,
  roles: string[] = []
): void {
  if (typeof window === 'undefined') return

  const cache: MembershipCache = {
    isMember,
    isVerified,
    roles,
    checkedAt: Date.now(),
  }
  localStorage.setItem(MEMBERSHIP_CACHE_KEY, JSON.stringify(cache))
}

/**
 * 清除成員狀態快取
 */
export function clearMembershipCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(MEMBERSHIP_CACHE_KEY)
}

/**
 * Discord 服務
 */
export const discordService = {
  /**
   * 檢查用戶是否加入指定的 Discord 伺服器，並獲取角色資訊
   * 使用 Discord API:
   * - GET /users/@me/guilds（檢查是否加入伺服器）
   * - GET /users/@me/guilds/{guild.id}/member（獲取角色資訊）
   *
   * @param providerToken - Discord OAuth access token（從 session.provider_token 取得）
   * @returns 成員狀態和角色資訊
   */
  async checkServerMembership(
    providerToken: string
  ): Promise<{ isMember: boolean; isVerified: boolean; roles: string[] }> {
    try {
      // 步驟 1: 檢查是否加入伺服器
      const guildsResponse = await fetch(
        'https://discord.com/api/users/@me/guilds',
        {
          headers: {
            Authorization: `Bearer ${providerToken}`,
          },
        }
      )

      if (!guildsResponse.ok) {
        console.error('[Discord] 無法取得用戶伺服器列表:', guildsResponse.status)
        return { isMember: false, isVerified: false, roles: [] }
      }

      const guilds: Array<{ id: string; name: string }> =
        await guildsResponse.json()
      const isMember = guilds.some((guild) => guild.id === DISCORD_SERVER_ID)

      if (!isMember) {
        // 不是成員，直接快取並返回
        setMembershipCache(false, false, [])
        console.log('[Discord] 伺服器成員檢查: 非成員')
        return { isMember: false, isVerified: false, roles: [] }
      }

      // 步驟 2: 獲取角色資訊
      const roles = await this.getMemberRoles(providerToken)
      const isVerified = roles.includes(SUPPORT_ROLE_ID)

      // 快取結果
      setMembershipCache(true, isVerified, roles)

      console.log(
        '[Discord] 伺服器成員檢查: 是成員',
        isVerified ? '(已認證)' : '(未認證)',
        `角色數: ${roles.length}`
      )
      return { isMember: true, isVerified, roles }
    } catch (error) {
      console.error('[Discord] 檢查伺服器成員資格失敗:', error)
      return { isMember: false, isVerified: false, roles: [] }
    }
  },

  /**
   * 獲取用戶在伺服器中的角色
   * 使用 Discord API: GET /users/@me/guilds/{guild.id}/member
   * 需要 guilds.members.read scope
   *
   * @param providerToken - Discord OAuth access token
   * @returns 角色 ID 陣列
   */
  async getMemberRoles(providerToken: string): Promise<string[]> {
    try {
      const response = await fetch(
        `https://discord.com/api/users/@me/guilds/${DISCORD_SERVER_ID}/member`,
        {
          headers: {
            Authorization: `Bearer ${providerToken}`,
          },
        }
      )

      if (!response.ok) {
        console.error('[Discord] 無法取得用戶角色:', response.status)
        return []
      }

      const member: { roles?: string[] } = await response.json()
      return member.roles ?? []
    } catch (error) {
      console.error('[Discord] 獲取用戶角色失敗:', error)
      return []
    }
  },

  /**
   * 取得快取的成員狀態（不進行 API 調用）
   * @returns 成員狀態，null 表示無快取或已過期
   */
  getCachedMembershipStatus(): boolean | null {
    const cache = getMembershipCache()
    return cache?.isMember ?? null
  },

  /**
   * 取得快取的認證狀態（不進行 API 調用）
   * @returns 認證狀態，null 表示無快取或已過期
   */
  getCachedVerifiedStatus(): boolean | null {
    const cache = getMembershipCache()
    return cache?.isVerified ?? null
  },

  /**
   * 取得快取的完整狀態（不進行 API 調用）
   * @returns 完整快取資料，null 表示無快取或已過期
   */
  getCachedStatus(): { isMember: boolean; isVerified: boolean; roles: string[] } | null {
    const cache = getMembershipCache()
    if (!cache) return null
    return {
      isMember: cache.isMember,
      isVerified: cache.isVerified,
      roles: cache.roles,
    }
  },

  /**
   * 根據認證狀態取得刊登上限
   * @param isVerified - 是否有 Support 角色
   * @returns 刊登上限數量
   */
  getListingLimit(isVerified: boolean): number {
    return isVerified ? LISTING_LIMIT_VERIFIED : LISTING_LIMIT_DEFAULT
  },

  /**
   * 取得伺服器邀請連結
   */
  getInviteUrl(): string {
    return DISCORD_INVITE_URL
  },

  /**
   * 取得目標伺服器 ID
   */
  getServerId(): string {
    return DISCORD_SERVER_ID
  },
}
