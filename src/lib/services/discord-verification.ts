/**
 * Discord 驗證服務
 *
 * 功能：
 * - 驗證 Discord 帳號年齡
 * - 驗證 Discord 伺服器成員資格
 * - 整合資料庫查詢與 Discord API
 */

import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import { calculateAccountAgeDays } from '@/lib/utils/discord-utils'

/**
 * 驗證 Discord 帳號年齡
 *
 * @param userId 使用者 UUID（資料庫 users.id）
 * @param minAgeDays 最小年齡要求（天數），預設 365 天
 * @returns { valid: boolean, accountAge: number, createdAt: Date }
 */
export async function checkAccountAge(
  userId: string,
  minAgeDays: number = 365
): Promise<{
  valid: boolean
  accountAge: number
  createdAt: Date | null
}> {
  try {
    // 1. 查詢使用者的 Discord ID 和 account_created_at
    const { data: profile, error } = await supabaseAdmin
      .from('discord_profiles')
      .select('account_created_at')
      .eq('user_id', userId)
      .single()

    if (error || !profile) {
      apiLogger.error('查詢 Discord profile 失敗', { error, userId })
      return {
        valid: false,
        accountAge: 0,
        createdAt: null
      }
    }

    // 2. 計算帳號年齡
    const createdAt = new Date(profile.account_created_at)
    const now = new Date()
    const diffMs = now.getTime() - createdAt.getTime()
    const accountAge = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    apiLogger.debug('Discord 帳號年齡驗證', {
      userId,
      accountAge,
      minAgeDays,
      valid: accountAge >= minAgeDays
    })

    return {
      valid: accountAge >= minAgeDays,
      accountAge,
      createdAt
    }
  } catch (error) {
    apiLogger.error('Discord 帳號年齡驗證失敗', { error, userId })
    return {
      valid: false,
      accountAge: 0,
      createdAt: null
    }
  }
}

/**
 * 驗證 Discord 伺服器成員資格
 *
 * 使用 Discord API 檢查使用者是否為特定伺服器成員
 *
 * @param accessToken Discord OAuth access token
 * @param requiredServerId Discord 伺服器 ID（Guild ID）
 * @returns { isMember: boolean, memberSince?: Date }
 */
export async function checkServerMembership(
  accessToken: string,
  requiredServerId: string
): Promise<{
  isMember: boolean
  memberSince?: Date
}> {
  try {
    // 呼叫 Discord API: GET /users/@me/guilds
    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      apiLogger.error('Discord API 呼叫失敗', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        hint:
          response.status === 401
            ? 'Access token 可能已過期或無效'
            : response.status === 403
              ? '可能缺少 guilds OAuth scope 權限'
              : '未知錯誤'
      })
      return { isMember: false }
    }

    const guilds: Array<{
      id: string
      name: string
      joined_at?: string
    }> = await response.json()

    apiLogger.debug('Discord guilds 查詢成功', {
      guild_count: guilds.length,
      guild_ids: guilds.map((g) => g.id).slice(0, 5) // 只記錄前 5 個
    })

    // 檢查是否包含目標伺服器
    const targetGuild = guilds.find((guild) => guild.id === requiredServerId)

    if (targetGuild) {
      apiLogger.debug('Discord 伺服器成員驗證通過', {
        serverId: requiredServerId,
        guildName: targetGuild.name
      })

      return {
        isMember: true,
        memberSince: targetGuild.joined_at ? new Date(targetGuild.joined_at) : undefined
      }
    }

    apiLogger.debug('Discord 伺服器成員驗證失敗：不在伺服器中', {
      serverId: requiredServerId
    })

    return { isMember: false }
  } catch (error) {
    apiLogger.error('Discord 伺服器成員驗證失敗', { error })
    return { isMember: false }
  }
}

/**
 * 更新 discord_profiles 表的伺服器成員資格快取
 *
 * 用於減少 Discord API 呼叫頻率（建議每 24 小時更新一次）
 *
 * @param userId 使用者 UUID
 * @param isMember 是否為成員
 * @param memberSince 加入時間（可選）
 */
export async function updateServerMembershipCache(
  userId: string,
  isMember: boolean,
  memberSince?: Date
): Promise<void> {
  try {
    await supabaseAdmin
      .from('discord_profiles')
      .update({
        is_server_member: isMember,
        server_member_since: memberSince?.toISOString() || null,
        server_member_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    apiLogger.debug('更新伺服器成員資格快取', {
      userId,
      isMember,
      memberSince: memberSince?.toISOString()
    })
  } catch (error) {
    apiLogger.error('更新伺服器成員資格快取失敗', { error, userId })
  }
}

/**
 * 檢查伺服器成員資格（使用快取）
 *
 * 如果快取超過 24 小時，則重新呼叫 Discord API 更新
 *
 * @param userId 使用者 UUID
 * @param accessToken Discord OAuth access token
 * @param requiredServerId Discord 伺服器 ID
 * @returns { isMember: boolean }
 */
export async function checkServerMembershipWithCache(
  userId: string,
  accessToken: string,
  requiredServerId: string
): Promise<{ isMember: boolean }> {
  try {
    // 1. 查詢快取
    const { data: profile } = await supabaseAdmin
      .from('discord_profiles')
      .select('is_server_member, server_member_checked_at')
      .eq('user_id', userId)
      .single()

    if (profile) {
      const checkedAt = profile.server_member_checked_at
        ? new Date(profile.server_member_checked_at)
        : null

      // 2. 檢查快取是否有效（24 小時內）
      if (checkedAt) {
        const now = new Date()
        const diffHours = (now.getTime() - checkedAt.getTime()) / (1000 * 60 * 60)

        if (diffHours < 24) {
          apiLogger.debug('使用快取的伺服器成員資格', {
            userId,
            isMember: profile.is_server_member,
            cachedHoursAgo: diffHours.toFixed(2)
          })

          return { isMember: profile.is_server_member || false }
        }
      }
    }

    // 3. 快取過期或不存在，呼叫 Discord API
    apiLogger.debug('伺服器成員資格快取過期，重新驗證', { userId })

    const result = await checkServerMembership(accessToken, requiredServerId)

    // 4. 更新快取
    await updateServerMembershipCache(userId, result.isMember, result.memberSince)

    return { isMember: result.isMember }
  } catch (error) {
    apiLogger.error('檢查伺服器成員資格（含快取）失敗', { error, userId })
    return { isMember: false }
  }
}
