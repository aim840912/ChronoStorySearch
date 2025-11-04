/**
 * 登出端點
 *
 * POST /api/auth/logout
 *
 * 功能：
 * 1. 驗證當前 session（透過 withAuthAndError 中間件）
 * 2. 撤銷 session（標記為已撤銷，無法再使用）
 * 3. 清除客戶端 session cookie
 * 4. 返回成功訊息
 *
 * 特性：
 * - 冪等性：即使 session 已失效，仍返回成功
 * - 只撤銷當前 session，不影響其他裝置的登入
 *
 * 參考文件：
 * - docs/architecture/交易系統/02-認證與資料庫.md
 */

import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { revokeSession } from '@/lib/auth/session-validator'
import { success } from '@/lib/api-response'
import { apiLogger } from '@/lib/logger'
import { SESSION_COOKIE_NAME, getClearCookieConfig } from '@/lib/auth/cookie-config'

// 顯式指定使用 Node.js Runtime（確保 httpOnly cookies 正確處理）
export const runtime = 'nodejs'

/**
 * POST /api/auth/logout
 *
 * 登出當前用戶
 *
 * 流程：
 * 1. 從 request cookie 讀取 session token
 * 2. 解析 JWT 取得 session_id（已在 withAuthAndError 中完成驗證）
 * 3. 撤銷該 session（標記 revoked_at）
 * 4. 清除客戶端 cookie（設置 maxAge: 0）
 * 5. 返回成功訊息
 *
 * @example
 * 請求：
 * POST /api/auth/logout
 * Cookie: maplestory_session=xxx
 *
 * 回應：
 * {
 *   "success": true,
 *   "message": "登出成功",
 *   "data": {
 *     "user_id": "uuid-123",
 *     "discord_username": "user#1234"
 *   }
 * }
 */
async function handlePOST(request: NextRequest, user: User): Promise<Response> {
  // 1. 記錄登出請求詳情（改進：2025-11-04）
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const host = request.headers.get('host')
  const origin = request.headers.get('origin')

  apiLogger.info('Logout request received', {
    user_id: user.id,
    session_id: user.session_id,
    discord_username: user.discord_username,
    has_cookie: !!sessionToken,
    request_details: {
      host,
      origin,
      cookie_name: SESSION_COOKIE_NAME,
    }
  })

  if (!sessionToken) {
    // 理論上不會發生（withAuthAndError 已驗證），但仍需處理
    apiLogger.warn('Logout called without session token', { user_id: user.id })
  }

  // 2. 撤銷 session
  // 注意：user 物件中包含 session_id（從 validateSession 回傳）
  try {
    await revokeSession(user.session_id)

    apiLogger.info('Session revoked successfully', {
      user_id: user.id,
      session_id: user.session_id
    })
  } catch (error) {
    // 即使撤銷失敗（例如 session 已被撤銷），仍繼續清除 cookie
    // 這確保了冪等性：多次登出不會報錯
    apiLogger.warn('Session revocation failed during logout', {
      user_id: user.id,
      session_id: user.session_id,
      error
    })
  }

  // 3. 建立回應並清除 cookie（改進：使用統一配置 + 多重清除策略）
  const response = success(
    {
      user_id: user.id,
      discord_username: user.discord_username
    },
    '登出成功'
  )

  // 策略 1: 使用統一的 cookie 配置（與登入時完全一致）
  const clearConfig = getClearCookieConfig()
  response.cookies.set(SESSION_COOKIE_NAME, '', clearConfig)

  // 策略 2: 直接設置 Set-Cookie header（備用方案，確保在所有環境都能清除）
  const cookieString = [
    `${SESSION_COOKIE_NAME}=`,
    `Path=/`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    clearConfig.httpOnly && 'HttpOnly',
    clearConfig.secure && 'Secure',
    `SameSite=${clearConfig.sameSite}`,
  ].filter(Boolean).join('; ')

  response.headers.append('Set-Cookie', cookieString)

  // 策略 3: 強制清除所有 sameSite 變體（修復：刪除可能存在的舊 Cookie）
  // 目的：確保無論舊 Cookie 使用什麼 sameSite 設置（lax/none/strict）都能被刪除
  // 原因：Cookie 刪除需要屬性完全匹配，如果舊 Cookie 是 sameSite=lax，
  //       而我們只發送 sameSite=none 的刪除指令，瀏覽器會認為是不同的 Cookie 而拒絕刪除
  const sameSiteVariants: Array<'none' | 'lax' | 'strict'> = ['none', 'lax', 'strict']
  sameSiteVariants.forEach(variant => {
    const variantCookie = [
      `${SESSION_COOKIE_NAME}=`,
      `Path=/`,
      `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      'HttpOnly',
      clearConfig.secure && 'Secure',
      `SameSite=${variant}`,
    ].filter(Boolean).join('; ')

    response.headers.append('Set-Cookie', variantCookie)
  })

  // 記錄清除操作詳情
  apiLogger.info('Cookie clearing executed', {
    user_id: user.id,
    cookie_config: clearConfig,
    set_cookie_header: cookieString,
  })

  apiLogger.info('User logged out successfully', {
    user_id: user.id,
    discord_username: user.discord_username,
    session_id: user.session_id
  })

  return response
}

/**
 * 匯出 POST 端點（使用認證中間件）
 */
export const POST = withAuthAndError(handlePOST, {
  module: 'LogoutAPI',
  enableAuditLog: true // 記錄登出操作到審計日誌
})
