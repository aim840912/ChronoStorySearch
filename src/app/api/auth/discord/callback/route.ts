/**
 * Discord OAuth 2.0 回調端點
 *
 * GET /api/auth/discord/callback
 *
 * 功能：
 * 1. 驗證 state 參數（CSRF 防護）
 * 2. 用 code 交換 access_token 和 refresh_token
 * 3. 獲取 Discord 用戶資料
 * 4. 創建/更新資料庫用戶記錄
 * 5. 建立 session 並設置 cookie
 * 6. 重導向至首頁
 *
 * 防護措施：
 * - Bot Detection - User-Agent 過濾
 * - Rate Limiting - 5 次/分鐘（防止掃描工具濫用）
 * - State 驗證（CSRF 防護）
 *
 * 參考文件：
 * - docs/architecture/交易系統/02-認證與資料庫.md
 * - docs/DISCORD_OAUTH_SETUP.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { redis, RedisKeys } from '@/lib/redis/client'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createSession } from '@/lib/auth/session-validator'
import { apiLogger } from '@/lib/logger'
import { ValidationError } from '@/lib/errors'
import { parseSnowflakeTimestamp } from '@/lib/utils/discord-utils'
import { withBotDetection } from '@/lib/bot-detection/api-middleware'

// Discord OAuth2 配置
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI

// Discord API URLs
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token'
const DISCORD_USER_URL = 'https://discord.com/api/users/@me'

// Session Cookie 配置
const SESSION_COOKIE_NAME = 'maplestory_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 天（秒）

/**
 * Discord 用戶資料介面
 */
interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  email?: string
}

/**
 * Discord Token 回應介面
 */
interface DiscordTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

/**
 * GET /api/auth/discord/callback
 *
 * 處理 Discord OAuth 回調
 */
async function handleGET(request: NextRequest) {
  try {
    // 1. 確定正確的 base URL（Vercel 生產環境或本地開發）
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : request.url

    // 2. 檢查環境變數
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
      apiLogger.error('Discord OAuth config missing in callback')
      throw new ValidationError('Discord OAuth 配置錯誤')
    }

    // 3. 取得 URL 參數
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // 3.1 檢查是否有錯誤（用戶拒絕授權）
    if (error) {
      apiLogger.warn('User denied OAuth authorization', { error })
      return NextResponse.redirect(new URL('/?error=auth_denied', baseUrl))
    }

    // 2.2 檢查必要參數
    if (!code || !state) {
      apiLogger.warn('Missing code or state in callback', { hasCode: !!code, hasState: !!state })
      throw new ValidationError('OAuth 回調參數不完整')
    }

    // 3. 驗證 state（CSRF 防護）
    const stateKey = RedisKeys.OAUTH_STATE(state)
    const storedState = await redis.get(stateKey)

    if (!storedState) {
      apiLogger.warn('Invalid or expired state', { state })
      throw new ValidationError('無效或過期的 OAuth 請求')
    }

    // 刪除已使用的 state（一次性使用）
    await redis.del(stateKey)

    // 4. 用 code 交換 access_token
    const tokenResponse = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      apiLogger.error('Discord token exchange failed', {
        status: tokenResponse.status,
        error: errorText
      })
      throw new Error('Discord token 交換失敗')
    }

    const tokens: DiscordTokenResponse = await tokenResponse.json()

    // 5. 獲取 Discord 用戶資料
    const userResponse = await fetch(DISCORD_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    })

    if (!userResponse.ok) {
      apiLogger.error('Discord user fetch failed', { status: userResponse.status })
      throw new Error('獲取 Discord 用戶資料失敗')
    }

    const discordUser: DiscordUser = await userResponse.json()

    apiLogger.info('Discord user authenticated', {
      discord_id: discordUser.id,
      username: discordUser.username
    })

    // 6. 創建/更新資料庫用戶記錄
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, banned')
      .eq('discord_id', discordUser.id)
      .single()

    let userId: string

    if (existingUser) {
      // 6.1 檢查封禁狀態
      if (existingUser.banned) {
        apiLogger.warn('Banned user attempted login', { discord_id: discordUser.id })
        return NextResponse.redirect(new URL('/?error=banned', baseUrl))
      }

      // 6.2 更新現有用戶
      userId = existingUser.id

      await supabaseAdmin
        .from('users')
        .update({
          discord_username: discordUser.username,
          discord_discriminator: discordUser.discriminator,
          discord_avatar: discordUser.avatar,
          email: discordUser.email || null,
          last_login_at: new Date().toISOString()
        })
        .eq('id', userId)

      // 檢查並修正 discord_profiles 的 account_created_at（如果不正確）
      const correctAccountCreatedAt = parseSnowflakeTimestamp(discordUser.id)

      const { data: profile } = await supabaseAdmin
        .from('discord_profiles')
        .select('account_created_at')
        .eq('user_id', userId)
        .single()

      if (profile) {
        const storedTime = new Date(profile.account_created_at).getTime()
        const correctTime = correctAccountCreatedAt.getTime()
        const diffDays = Math.abs((storedTime - correctTime) / (1000 * 60 * 60 * 24))

        // 如果時間差距超過 1 天，更新為正確時間
        if (diffDays > 1) {
          await supabaseAdmin
            .from('discord_profiles')
            .update({
              account_created_at: correctAccountCreatedAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)

          apiLogger.info('Corrected account_created_at for existing user', {
            user_id: userId,
            old_time: profile.account_created_at,
            new_time: correctAccountCreatedAt.toISOString(),
            diff_days: Math.floor(diffDays)
          })
        }
      }

      apiLogger.info('Existing user updated', { user_id: userId })
    } else {
      // 6.3 創建新用戶
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          discord_id: discordUser.id,
          discord_username: discordUser.username,
          discord_discriminator: discordUser.discriminator,
          discord_avatar: discordUser.avatar,
          email: discordUser.email || null,
          last_login_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (createError || !newUser) {
        apiLogger.error('Failed to create user', { error: createError })
        throw new Error('建立用戶失敗')
      }

      userId = newUser.id

      // 同時創建 discord_profiles 記錄
      // 使用 parseSnowflakeTimestamp 解析 Discord ID 獲取真實帳號建立時間
      const accountCreatedAt = parseSnowflakeTimestamp(discordUser.id)

      await supabaseAdmin.from('discord_profiles').insert({
        user_id: userId,
        account_created_at: accountCreatedAt.toISOString(),
        reputation_score: 0
      })

      apiLogger.info('New user created', {
        user_id: userId,
        discord_id: discordUser.id,
        account_created_at: accountCreatedAt.toISOString()
      })
    }

    // 7. 建立 session
    const { token: sessionToken } = await createSession(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
      request
    )

    // 8. 設置 session cookie 並重導向至首頁
    const response = NextResponse.redirect(new URL('/', baseUrl))

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/'
    })

    apiLogger.info('User logged in successfully', {
      user_id: userId,
      discord_username: discordUser.username
    })

    return response
  } catch (error) {
    apiLogger.error('OAuth callback failed', { error })

    // 重導向至首頁並顯示錯誤
    const errorMessage = error instanceof Error ? error.message : 'OAuth 回調處理失敗'
    // 使用 Vercel URL 或 request.url（本地開發）
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : request.url
    return NextResponse.redirect(
      new URL(`/?error=oauth_failed&message=${encodeURIComponent(errorMessage)}`, baseUrl)
    )
  }
}

// Bot Detection + Rate Limiting（5次/分鐘，防止掃描工具濫用）
export const GET = withBotDetection(handleGET, {
  module: 'DiscordOAuthCallbackAPI',
  botDetection: {
    enableRateLimit: true,
    enableBehaviorDetection: false,
    rateLimit: {
      limit: 5, // 每分鐘 5 次（OAuth 回調端點，嚴格限制）
      window: 60 // 1 分鐘
    }
  }
})
