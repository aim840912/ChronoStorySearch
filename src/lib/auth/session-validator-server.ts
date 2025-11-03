/**
 * Server Component 專用的 Session 驗證函數
 *
 * 功能：
 * - 在 Server Components 中驗證 session
 * - 從 cookies() 讀取 session cookie
 * - 包裝 validateSession() 以適配 Server Component 環境
 *
 * 使用場景：
 * - Server Components 中的權限檢查
 * - API Route Handlers 的替代方案（直接查詢）
 *
 * 參考文件：
 * - docs/architecture/交易系統/05-安全與可靠性.md
 */

import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { validateSession, SessionValidationResult } from './session-validator'

/**
 * 從 cookies 驗證 session（Server Component 專用）
 *
 * 使用範例：
 * ```typescript
 * // Server Component 中
 * const { valid, user } = await validateSessionFromCookies()
 *
 * if (!valid || !user) {
 *   redirect('/')
 * }
 * ```
 *
 * @returns SessionValidationResult - 驗證結果和用戶資訊
 */
export async function validateSessionFromCookies(): Promise<SessionValidationResult> {
  try {
    // 1. 從 Next.js cookies API 讀取 session cookie
    // Next.js 15: cookies() 返回 Promise
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('maplestory_session')?.value

    if (!sessionCookie) {
      return { valid: false, user: null }
    }

    // 2. 建立 NextRequest 物件給 validateSession
    // validateSession 需要 NextRequest 來讀取 cookies
    const request = new NextRequest('http://localhost', {
      headers: {
        cookie: `maplestory_session=${sessionCookie}`,
      },
    })

    // 3. 呼叫現有的 validateSession 函數
    const result = await validateSession(request)

    return result
  } catch (error) {
    // 驗證失敗時返回無效結果
    return { valid: false, user: null }
  }
}
