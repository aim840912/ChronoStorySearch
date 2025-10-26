/**
 * 測試 API：認證中間件測試端點
 *
 * 用途：驗證認證基礎架構是否正常運作
 *
 * 測試項目：
 * - withAuthAndError 組合中間件
 * - Session 驗證流程
 * - 錯誤處理中間件
 * - 統一回應格式
 *
 * 測試方式：
 * 1. 未登入：應返回 401 Unauthorized
 * 2. 已登入：應返回 200 OK 和用戶資訊
 * 3. 測試錯誤處理：應返回統一錯誤格式（含 trace_id）
 *
 * @example
 * ```bash
 * # 測試 1：未登入（應返回 401）
 * curl http://localhost:3000/api/test/auth
 *
 * # 測試 2：已登入（需要先透過 OAuth 登入獲取 session cookie）
 * curl -b "maplestory_session=YOUR_JWT_TOKEN" http://localhost:3000/api/test/auth
 *
 * # 測試 3：測試錯誤處理（拋出 ValidationError）
 * curl http://localhost:3000/api/test/auth?trigger_error=true
 * ```
 */

import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'

/**
 * GET /api/test/auth
 *
 * 測試認證中間件是否正常運作
 *
 * 成功回應：
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "message": "認證測試成功",
 *     "user": {
 *       "id": "uuid-123",
 *       "discord_id": "123456789012345678",
 *       "discord_username": "TestUser",
 *       "discord_avatar": "https://...",
 *       "email": "test@example.com",
 *       "banned": false
 *     },
 *     "session_verified": true,
 *     "middleware_chain": [
 *       "withErrorHandler",
 *       "requireAuth",
 *       "validateSession"
 *     ]
 *   },
 *   "timestamp": "2025-10-26T..."
 * }
 * ```
 *
 * 錯誤回應（未登入）：
 * ```json
 * {
 *   "success": false,
 *   "error": "需要登入才能使用此功能",
 *   "code": "UNAUTHORIZED",
 *   "trace_id": "uuid-abc",
 *   "timestamp": "2025-10-26T..."
 * }
 * ```
 */
async function handleGET(request: NextRequest, user: User): Promise<Response> {
  // 檢查是否觸發測試錯誤
  const { searchParams } = new URL(request.url)
  const triggerError = searchParams.get('trigger_error')

  if (triggerError === 'true') {
    // 測試錯誤處理中間件
    throw new ValidationError('這是一個測試錯誤：驗證錯誤處理中間件是否正常運作')
  }

  // 返回成功回應，包含用戶資訊
  return success(
    {
      message: '認證測試成功！階段 0 基礎架構實作完成 ✅',
      user: {
        id: user.id,
        discord_id: user.discord_id,
        discord_username: user.discord_username,
        discord_avatar: user.discord_avatar,
        email: user.email,
        banned: user.banned
      },
      session_verified: true,
      middleware_chain: [
        'withErrorHandler ✅',
        'requireAuth ✅',
        'validateSession ✅'
      ],
      next_steps: [
        '階段 1：實作 Discord OAuth 認證（配置 Discord Application）',
        '階段 2：實作核心功能（刊登、市場、意向）'
      ]
    },
    '認證測試成功'
  )
}

/**
 * 導出 GET handler
 *
 * 使用 withAuthAndError 組合中間件
 * - requireAuth: 需要登入
 * - withErrorHandler: 統一錯誤處理
 * - enableAuditLog: 記錄所有請求
 */
export const GET = withAuthAndError(handleGET, {
  module: 'TestAuthAPI',
  enableAuditLog: true
})
