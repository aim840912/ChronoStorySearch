/**
 * Session 驗證邏輯
 *
 * 實作 JWT token 驗證、Session 管理和用戶認證
 * 符合 CLAUDE.md 和架構文件的安全要求
 *
 * 功能：
 * - validateSession: 驗證 session cookie
 * - createSession: 建立新 session（OAuth callback 使用）
 * - refreshSession: 更新 session 活躍時間
 * - revokeSession: 撤銷 session
 *
 * 參考文件:
 * - docs/architecture/交易系統/05-安全與可靠性.md
 * - docs/architecture/交易系統/02-認證與資料庫.md
 */

import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '@/lib/supabase/server'
import { dbLogger } from '@/lib/logger'
import { encryptToken, decryptToken } from './token-encryption'

/**
 * 用戶資訊介面
 */
export interface User {
  id: string
  discord_id: string
  discord_username: string
  discord_discriminator: string
  discord_avatar: string | null
  email: string | null
  banned: boolean
  last_login_at: string
  created_at: string
  session_id: string // 當前 session ID（由 validateSession 提供）
  access_token: string // Discord OAuth access token（用於 Discord API 呼叫）
}

/**
 * Session 驗證結果介面
 */
export interface SessionValidationResult {
  valid: boolean
  user: User | null
  session_id?: string
}

/**
 * JWT Payload 介面
 */
interface JWTPayload {
  session_id: string
  user_id: string
  iat: number
  exp: number
}

/**
 * Session Cookie 名稱
 */
const SESSION_COOKIE_NAME = 'maplestory_session'

/**
 * Session 有效期（30 天）
 */
const SESSION_EXPIRY_DAYS = 30

/**
 * JWT Secret（從環境變數讀取）
 */
const JWT_SECRET = process.env.SESSION_SECRET

if (!JWT_SECRET) {
  throw new Error('Missing SESSION_SECRET environment variable')
}

/**
 * 驗證 Session Cookie
 *
 * 完整流程：
 * 1. 從 cookie 讀取 session token
 * 2. 驗證 JWT 並解密
 * 3. 查詢 Supabase sessions 表
 * 4. 檢查過期時間
 * 5. 查詢用戶資訊
 * 6. 檢查封禁狀態
 * 7. 更新 last_active_at（每次請求更新）
 *
 * @param request - Next.js Request 物件
 * @returns 驗證結果（包含用戶資訊）
 *
 * @example
 * ```ts
 * const { valid, user } = await validateSession(request)
 * if (!valid) {
 *   return error('需要登入', 'UNAUTHORIZED', 401)
 * }
 * // 使用 user 資訊
 * ```
 */
export async function validateSession(
  request: NextRequest
): Promise<SessionValidationResult> {
  try {
    // 1. 讀取 session cookie
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
      dbLogger.debug('Session validation failed: no token found')
      return { valid: false, user: null }
    }

    // 2. 驗證並解密 JWT
    let payload: JWTPayload
    try {
      // JWT_SECRET 已在檔案頂部檢查過，不可能是 undefined
      const decoded = jwt.verify(token, JWT_SECRET!) as jwt.JwtPayload
      payload = decoded as JWTPayload
    } catch (jwtError) {
      dbLogger.debug('Session validation failed: invalid JWT', { error: jwtError })
      return { valid: false, user: null }
    }

    const { session_id, user_id } = payload

    // 3. 查詢 Supabase sessions 表
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, user_id, expires_at, access_token')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      dbLogger.debug('Session validation failed: session not found in database', {
        session_id,
        error: sessionError
      })
      return { valid: false, user: null }
    }

    // 4. 檢查過期時間
    const expiresAt = new Date(session.expires_at)
    if (expiresAt < new Date()) {
      dbLogger.debug('Session validation failed: session expired', {
        session_id,
        expires_at: session.expires_at
      })
      // 刪除過期 session
      await supabaseAdmin.from('sessions').delete().eq('id', session_id)
      return { valid: false, user: null }
    }

    // 5. 查詢用戶資訊
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, discord_id, discord_username, discord_discriminator, discord_avatar, email, banned, last_login_at, created_at')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      dbLogger.warn('Session validation failed: user not found', {
        user_id,
        error: userError
      })
      return { valid: false, user: null }
    }

    // 6. 檢查封禁狀態
    if (user.banned) {
      dbLogger.info('Session validation failed: user is banned', { user_id })
      return { valid: false, user: null }
    }

    // 7. 更新 last_active_at（非同步執行，不阻塞回應）
    // 注意：使用 Promise 不等待完成，避免影響回應時間
    supabaseAdmin
      .from('sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', session_id)
      .then(({ error }) => {
        if (error) {
          dbLogger.warn('Failed to update last_active_at', { session_id, error })
        }
      })

    // 解密 access_token（資料庫中是加密儲存的）
    let decryptedAccessToken: string
    try {
      decryptedAccessToken = await decryptToken(session.access_token)
    } catch (error) {
      dbLogger.error('Failed to decrypt access_token', { session_id, error })
      // 如果解密失敗，返回無效 session（可能是密鑰錯誤或資料損壞）
      return { valid: false, user: null }
    }

    // 返回驗證成功結果
    return {
      valid: true,
      user: {
        id: user.id,
        discord_id: user.discord_id,
        discord_username: user.discord_username,
        discord_discriminator: user.discord_discriminator,
        discord_avatar: user.discord_avatar,
        email: user.email,
        banned: user.banned,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        session_id, // 將 session_id 加入 User 物件
        access_token: decryptedAccessToken // Discord OAuth access token（已解密）
      },
      session_id
    }
  } catch (error) {
    dbLogger.error('Unexpected error during session validation', { error })
    return { valid: false, user: null }
  }
}

/**
 * 建立新 Session
 *
 * 用於 Discord OAuth callback 後建立用戶 session
 *
 * @param userId - 用戶 UUID
 * @param accessToken - Discord access token（加密存儲）
 * @param refreshToken - Discord refresh token（加密存儲）
 * @param expiresIn - access_token 有效期（秒）
 * @param request - Next.js Request 物件（用於取得 IP 和 User-Agent）
 * @returns Session ID 和 JWT token
 *
 * @example
 * ```ts
 * const { session_id, token } = await createSession(
 *   userId,
 *   accessToken,
 *   refreshToken,
 *   604800, // 7 天
 *   request
 * )
 *
 * // 設定 cookie
 * response.cookies.set(SESSION_COOKIE_NAME, token, {
 *   httpOnly: true,
 *   secure: process.env.NODE_ENV === 'production',
 *   sameSite: 'lax',
 *   maxAge: 30 * 24 * 60 * 60 // 30 天
 * })
 * ```
 */
export async function createSession(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  request: NextRequest
): Promise<{ session_id: string; token: string }> {
  try {
    // 計算過期時間（30 天後）
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS)

    // 計算 Discord token 過期時間（使用 expiresIn 參數）
    const tokenExpiresAt = new Date()
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresIn)

    // 取得客戶端 IP
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      '0.0.0.0'

    // 取得 User-Agent
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // 加密 Discord tokens（使用 XChaCha20-Poly1305）
    const encryptedAccessToken = await encryptToken(accessToken)
    const encryptedRefreshToken = await encryptToken(refreshToken)

    // 插入 session 到資料庫（加密後存儲）
    const { data: session, error: insertError } = await supabaseAdmin
      .from('sessions')
      .insert({
        user_id: userId,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt.toISOString(),
        token_expires_at: tokenExpiresAt.toISOString(), // Discord token 過期時間
        created_ip: clientIp,
        user_agent: userAgent
      })
      .select('id')
      .single()

    if (insertError || !session) {
      dbLogger.error('Failed to create session in database', {
        user_id: userId,
        error: insertError
      })
      throw new Error('Failed to create session')
    }

    const session_id = session.id

    // 產生 JWT token
    // JWT_SECRET 已在檔案頂部檢查過，不可能是 undefined
    const token = jwt.sign(
      {
        session_id,
        user_id: userId
      },
      JWT_SECRET!,
      {
        expiresIn: `${SESSION_EXPIRY_DAYS}d`
      }
    )

    dbLogger.info('Session created successfully', {
      user_id: userId,
      session_id
    })

    return { session_id, token }
  } catch (error) {
    dbLogger.error('Unexpected error during session creation', { error })
    throw error
  }
}

/**
 * 刷新 Session（更新 last_active_at）
 *
 * 注意：此函數已由 validateSession 自動呼叫，通常不需要手動呼叫
 *
 * @param session_id - Session UUID
 *
 * @example
 * ```ts
 * await refreshSession(session_id)
 * ```
 */
export async function refreshSession(session_id: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', session_id)

    if (error) {
      dbLogger.warn('Failed to refresh session', { session_id, error })
      throw error
    }

    dbLogger.debug('Session refreshed successfully', { session_id })
  } catch (error) {
    dbLogger.error('Unexpected error during session refresh', { error })
    throw error
  }
}

/**
 * 撤銷 Session
 *
 * 用於登出功能，刪除資料庫中的 session 記錄
 *
 * @param session_id - Session UUID
 *
 * @example
 * ```ts
 * await revokeSession(session_id)
 *
 * // 清除 cookie
 * response.cookies.delete(SESSION_COOKIE_NAME)
 * ```
 */
export async function revokeSession(session_id: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('id', session_id)

    if (error) {
      dbLogger.warn('Failed to revoke session', { session_id, error })
      throw error
    }

    dbLogger.info('Session revoked successfully', { session_id })
  } catch (error) {
    dbLogger.error('Unexpected error during session revocation', { error })
    throw error
  }
}

/**
 * 撤銷用戶的所有 Sessions
 *
 * 用於「登出所有裝置」功能
 *
 * @param user_id - 用戶 UUID
 *
 * @example
 * ```ts
 * await revokeAllUserSessions(user_id)
 * ```
 */
export async function revokeAllUserSessions(user_id: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('user_id', user_id)

    if (error) {
      dbLogger.warn('Failed to revoke all user sessions', { user_id, error })
      throw error
    }

    dbLogger.info('All user sessions revoked successfully', { user_id })
  } catch (error) {
    dbLogger.error('Unexpected error during revoking all user sessions', { error })
    throw error
  }
}

/**
 * 清理過期 Sessions（定期任務）
 *
 * 建議使用 Vercel Cron Jobs 每日執行
 *
 * @example
 * ```ts
 * // src/app/api/cron/cleanup-sessions/route.ts
 * export async function GET() {
 *   await cleanupExpiredSessions()
 *   return success(null, 'Expired sessions cleaned up')
 * }
 * ```
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const now = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('sessions')
      .delete()
      .lt('expires_at', now)
      .select('id')

    if (error) {
      dbLogger.error('Failed to cleanup expired sessions', { error })
      throw error
    }

    const count = data?.length || 0
    dbLogger.info('Expired sessions cleaned up', { count })

    return count
  } catch (error) {
    dbLogger.error('Unexpected error during cleanup expired sessions', { error })
    throw error
  }
}
