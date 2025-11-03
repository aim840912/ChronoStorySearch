/**
 * Discord OAuth 2.0 啟動端點
 *
 * GET /api/auth/discord
 *
 * 功能：
 * 1. 產生隨機 state 參數（CSRF 防護）
 * 2. 將 state 存入 Redis（10 分鐘過期）
 * 3. 重導向至 Discord 授權頁面
 *
 * 防護措施：
 * - Bot Detection - User-Agent 過濾
 * - Rate Limiting - 5 次/分鐘（防止掃描工具濫用 state token）
 *
 * 參考文件：
 * - docs/architecture/交易系統/02-認證與資料庫.md
 * - docs/DISCORD_OAUTH_SETUP.md
 *
 * Discord OAuth2 文件：
 * https://discord.com/developers/docs/topics/oauth2
 */

import { NextRequest, NextResponse } from 'next/server'
import { redis, RedisKeys } from '@/lib/redis/client'
import { apiLogger } from '@/lib/logger'
import { v4 as uuidv4 } from 'uuid'
import { withBotDetection } from '@/lib/bot-detection/api-middleware'

// Discord OAuth2 配置
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI
const DISCORD_OAUTH_URL = 'https://discord.com/api/oauth2/authorize'

// OAuth 參數
// identify: 用戶基本資訊（ID、username、avatar）
// guilds: 用戶加入的伺服器列表（用於驗證伺服器成員資格）
const SCOPES = ['identify', 'guilds']
const STATE_EXPIRY = 600 // 10 分鐘（秒）

/**
 * GET /api/auth/discord
 *
 * 啟動 Discord OAuth 2.0 授權流程
 *
 * 流程：
 * 1. 檢查環境變數配置
 * 2. 產生隨機 state（UUID）
 * 3. 將 state 存入 Redis（10 分鐘過期，防止重放攻擊）
 * 4. 建構 Discord 授權 URL
 * 5. 重導向至 Discord
 *
 * @example
 * 用戶訪問：http://localhost:3000/api/auth/discord
 * 重導向至：https://discord.com/api/oauth2/authorize?client_id=...&redirect_uri=...&response_type=code&scope=identify&state=uuid-123
 */
async function handleGET(request: NextRequest) {
  try {
    // 1. 檢查環境變數
    if (!DISCORD_CLIENT_ID || !DISCORD_REDIRECT_URI) {
      apiLogger.error('Discord OAuth config missing', {
        hasClientId: !!DISCORD_CLIENT_ID,
        hasRedirectUri: !!DISCORD_REDIRECT_URI
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Discord OAuth 配置錯誤，請檢查環境變數',
          code: 'OAUTH_CONFIG_ERROR',
          details: {
            message: '請設定 DISCORD_CLIENT_ID 和 DISCORD_REDIRECT_URI 環境變數',
            docs: '/docs/DISCORD_OAUTH_SETUP.md'
          }
        },
        { status: 500 }
      )
    }

    // 2. 產生隨機 state（CSRF Token）
    const state = uuidv4()

    // 3. 將 state 存入 Redis（10 分鐘過期）
    // 用途：callback 時驗證 state，防止 CSRF 攻擊
    const stateKey = RedisKeys.OAUTH_STATE(state)
    await redis.set(stateKey, {
      created_at: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    }, { ex: STATE_EXPIRY })

    apiLogger.info('OAuth flow started', {
      state,
      ip: request.headers.get('x-forwarded-for')
    })

    // 4. 建構 Discord 授權 URL
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES.join(' '),
      state
    })

    const authUrl = `${DISCORD_OAUTH_URL}?${params.toString()}`

    // 5. 重導向至 Discord
    return NextResponse.redirect(authUrl)
  } catch (error) {
    apiLogger.error('OAuth flow start failed', { error })

    return NextResponse.json(
      {
        success: false,
        error: '啟動 Discord 登入失敗',
        code: 'OAUTH_START_ERROR'
      },
      { status: 500 }
    )
  }
}

// Bot Detection + Rate Limiting（5次/分鐘，防止掃描工具濫用）
export const GET = withBotDetection(handleGET, {
  module: 'DiscordOAuthAPI',
  botDetection: {
    enableRateLimit: true,
    enableBehaviorDetection: false,
    rateLimit: {
      limit: 5, // 每分鐘 5 次（OAuth 啟動端點，嚴格限制）
      window: 60 // 1 分鐘
    }
  }
})
