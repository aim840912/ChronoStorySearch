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
import { SESSION_COOKIE_NAME } from '@/lib/auth/cookie-config'

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

  // 3. 建立回應並清除 cookie（改進：使用 Next.js 15 官方 cookies.delete() API）
  const response = success(
    {
      user_id: user.id,
      discord_username: user.discord_username
    },
    '登出成功'
  )

  // 使用 Next.js 15 官方的 cookies.delete() API（修復：2025-11-04）
  // 原因：之前混用 response.cookies.set() 和 response.headers.append() 導致在 Vercel 生產環境產生 Header 衝突
  // 解決方案：使用單一 API，確保屬性與登入時完全一致，避免 API 混用造成的問題
  const isProduction = process.env.NODE_ENV === 'production'

  // 🔍 診斷日誌：Cookie 刪除前狀態（2025-11-04）
  apiLogger.info('[DIAGNOSTIC] Cookie deletion starting', {
    user_id: user.id,
    environment: isProduction ? 'production' : 'development',
    incoming_cookie_header: request.headers.get('cookie'),
    session_cookie_present: !!request.cookies.get(SESSION_COOKIE_NAME)?.value,
  })

  // 策略 1: 刪除當前 cookie (使用當前配置)
  const strategy1Config = {
    name: SESSION_COOKIE_NAME,
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
  }
  response.cookies.delete(strategy1Config)

  // 🔍 診斷日誌：策略 1 執行後
  apiLogger.info('[DIAGNOSTIC] Strategy 1 cookie deletion executed', {
    config: strategy1Config,
    user_id: user.id,
  })

  // 策略 2: 向後兼容 - 刪除舊的 sameSite='lax' cookie（修復：2025-11-04）
  // 原因：之前部署時設置的 cookie 使用 sameSite='lax'
  //       Cookie 刪除需要屬性完全匹配，所以需要同時嘗試刪除舊配置
  // 適用時機：僅在生產環境執行（開發環境始終使用 'lax'，不需要此策略）
  if (isProduction) {
    const strategy2Config = {
      name: SESSION_COOKIE_NAME,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
    }
    response.cookies.delete(strategy2Config)

    // 🔍 診斷日誌：策略 2 執行後
    apiLogger.info('[DIAGNOSTIC] Strategy 2 cookie deletion executed', {
      config: strategy2Config,
      user_id: user.id,
    })
  }

  // 記錄清除操作詳情
  apiLogger.info('Cookie clearing executed', {
    user_id: user.id,
    strategies: isProduction ? 2 : 1,
    cookie_configs: isProduction ? [
      {
        name: SESSION_COOKIE_NAME,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        note: '刪除新 cookie'
      },
      {
        name: SESSION_COOKIE_NAME,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        note: '刪除舊 cookie（向後兼容）'
      }
    ] : [{
      name: SESSION_COOKIE_NAME,
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    }],
  })

  // 🔍 診斷日誌：驗證 Set-Cookie headers（2025-11-04）
  const setCookieHeaders = response.headers.getSetCookie()
  apiLogger.info('[DIAGNOSTIC] Final cookie deletion verification', {
    user_id: user.id,
    set_cookie_headers_count: setCookieHeaders.length,
    set_cookie_headers: setCookieHeaders,
    note: '應該看到 2 個 Set-Cookie headers（生產環境）或 1 個（開發環境）',
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
