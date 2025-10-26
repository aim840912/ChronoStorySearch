/**
 * Token 刷新端點
 *
 * POST /api/auth/refresh
 *
 * 功能：
 * 1. 驗證當前 session（透過 withAuthAndError 中間件）
 * 2. 檢查 Discord access_token 是否即將過期（< 1 天）
 * 3. 若即將過期，使用 refresh_token 從 Discord 獲取新 token
 * 4. 更新資料庫 session 記錄（access_token, refresh_token, expires_at）
 * 5. 返回刷新狀態
 *
 * 刷新策略：
 * - 提前刷新：過期前 1 天自動刷新（避免 token 過期導致 API 失敗）
 * - 冪等性：多次呼叫不會重複刷新（檢查過期時間）
 * - 錯誤處理：刷新失敗時保留舊 token，記錄錯誤日誌
 *
 * 參考文件：
 * - docs/architecture/交易系統/05-安全與可靠性.md
 * - Discord OAuth2 Refresh: https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-refresh-token-exchange
 */

import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import { success } from '@/lib/api-response'
import { apiLogger, dbLogger } from '@/lib/logger'
import { DatabaseError } from '@/lib/errors'
import { encryptToken, decryptToken } from '@/lib/auth/token-encryption'

// Discord OAuth2 配置
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token'

// 刷新閾值：提前 1 天刷新（秒）
const REFRESH_THRESHOLD = 24 * 60 * 60 // 1 天

/**
 * Discord Token 刷新回應介面
 */
interface DiscordRefreshResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

/**
 * POST /api/auth/refresh
 *
 * 刷新 Discord access_token
 *
 * 流程：
 * 1. 查詢當前 session 的 token 過期時間
 * 2. 檢查是否需要刷新（過期時間 < now + 1天）
 * 3. 若需要：使用 refresh_token 向 Discord 請求新 token
 * 4. 更新 session 記錄（access_token, refresh_token, token_expires_at）
 * 5. 返回刷新結果
 *
 * @example
 * 請求：
 * POST /api/auth/refresh
 * Cookie: maplestory_session=xxx
 *
 * 回應（需要刷新）：
 * {
 *   "success": true,
 *   "message": "Token 已刷新",
 *   "data": {
 *     "refreshed": true,
 *     "expires_at": "2025-11-25T10:00:00Z"
 *   }
 * }
 *
 * 回應（不需要刷新）：
 * {
 *   "success": true,
 *   "message": "Token 仍然有效",
 *   "data": {
 *     "refreshed": false,
 *     "expires_at": "2025-11-25T10:00:00Z"
 *   }
 * }
 */
async function handlePOST(_request: NextRequest, user: User): Promise<Response> {
  // 1. 查詢當前 session 的 token 資訊
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('id, access_token, refresh_token, token_expires_at')
    .eq('id', user.session_id)
    .single()

  if (sessionError || !session) {
    dbLogger.error('Failed to fetch session for token refresh', {
      session_id: user.session_id,
      error: sessionError
    })
    throw new DatabaseError('無法取得 session 資訊')
  }

  // 2. 檢查是否需要刷新（過期時間 < now + 1天）
  const expiresAt = new Date(session.token_expires_at)
  const now = new Date()
  const refreshThresholdTime = new Date(now.getTime() + REFRESH_THRESHOLD * 1000)

  const needsRefresh = expiresAt < refreshThresholdTime

  if (!needsRefresh) {
    // Token 仍然有效，不需要刷新
    apiLogger.info('Token still valid, no refresh needed', {
      session_id: user.session_id,
      expires_at: session.token_expires_at
    })

    return success(
      {
        refreshed: false,
        expires_at: session.token_expires_at
      },
      'Token 仍然有效'
    )
  }

  // 3. 需要刷新：檢查環境變數
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    apiLogger.error('Discord OAuth config missing for token refresh')
    throw new DatabaseError('Discord OAuth 配置錯誤')
  }

  // 4. 解密 refresh_token
  let decryptedRefreshToken: string
  try {
    decryptedRefreshToken = await decryptToken(session.refresh_token)
  } catch (error) {
    apiLogger.error('Failed to decrypt refresh_token', {
      session_id: user.session_id,
      error
    })
    throw new DatabaseError('Token 解密失敗')
  }

  // 5. 使用解密後的 refresh_token 從 Discord 獲取新 token
  try {
    const tokenResponse = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: decryptedRefreshToken
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      apiLogger.error('Discord token refresh failed', {
        session_id: user.session_id,
        status: tokenResponse.status,
        error: errorText
      })
      throw new DatabaseError('Discord token 刷新失敗')
    }

    const tokens: DiscordRefreshResponse = await tokenResponse.json()

    // 6. 加密新的 tokens
    const encryptedAccessToken = await encryptToken(tokens.access_token)
    const encryptedRefreshToken = await encryptToken(tokens.refresh_token)

    // 7. 更新資料庫 session 記錄（加密後存儲）
    const newExpiresAt = new Date(now.getTime() + tokens.expires_in * 1000)

    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: newExpiresAt.toISOString(),
        last_active_at: now.toISOString()
      })
      .eq('id', user.session_id)

    if (updateError) {
      dbLogger.error('Failed to update session with new tokens', {
        session_id: user.session_id,
        error: updateError
      })
      throw new DatabaseError('更新 token 失敗')
    }

    apiLogger.info('Token refreshed successfully', {
      session_id: user.session_id,
      user_id: user.id,
      old_expires_at: session.token_expires_at,
      new_expires_at: newExpiresAt.toISOString()
    })

    return success(
      {
        refreshed: true,
        expires_at: newExpiresAt.toISOString()
      },
      'Token 已刷新'
    )
  } catch (error) {
    // 捕捉網路錯誤或解析錯誤
    apiLogger.error('Token refresh exception', {
      session_id: user.session_id,
      error
    })
    throw new DatabaseError('Token 刷新過程發生錯誤')
  }
}

/**
 * 匯出 POST 端點（使用認證中間件）
 */
export const POST = withAuthAndError(handlePOST, {
  module: 'TokenRefreshAPI',
  enableAuditLog: false // Token 刷新不需要審計日誌（頻繁操作）
})
