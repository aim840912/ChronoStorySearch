/**
 * Server Component 專用的 Session 驗證函數（使用 Supabase Auth）
 *
 * 功能：
 * - 在 Server Components 中驗證 Supabase Auth session
 * - 從 Supabase Auth 取得當前用戶
 * - 從資料庫查詢完整用戶資訊
 *
 * 使用場景：
 * - Server Components 中的權限檢查
 * - 需要完整用戶資訊的伺服器端邏輯
 *
 * 參考文件：
 * - https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createClient, supabaseAdmin } from '@/lib/supabase/server'
import type { SessionValidationResult } from './session-validator'
import { dbLogger } from '@/lib/logger'

/**
 * 從 Supabase Auth 驗證 session（Server Component 專用）
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
    // 1. 從 Supabase Auth 取得當前用戶
    const supabase = await createClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return { valid: false, user: null }
    }

    // 2. 從資料庫查詢完整用戶資料
    // 先用 Supabase Auth UUID 查詢
    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    // 如果查不到，嘗試用 discord_id 查詢（向後兼容）
    if (userError && userError.code === 'PGRST116') {
      const discordId = authUser.user_metadata?.provider_id || authUser.user_metadata?.sub

      if (discordId) {
        dbLogger.debug('User not found by Supabase Auth UUID, trying discord_id', {
          supabase_auth_id: authUser.id,
          discord_id: discordId
        })

        const result = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('discord_id', discordId)
          .single()

        user = result.data
        userError = result.error
      }
    }

    if (userError || !user) {
      dbLogger.error('Failed to fetch user data from validateSessionFromCookies', {
        user_id: authUser.id,
        error: userError
      })
      return { valid: false, user: null }
    }

    // 3. 檢查封禁狀態
    if (user.banned) {
      dbLogger.warn('Banned user attempted to access protected resource', {
        user_id: user.id
      })
      return { valid: false, user: null }
    }

    // 4. 返回用戶資訊
    // 注意：Supabase Auth 不使用自訂 session_id，這裡保留空字串以兼容舊介面
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
        session_id: '', // Supabase Auth 不使用自訂 session_id
        access_token: '', // 不在這裡暴露 access_token
      },
    }
  } catch (error) {
    dbLogger.error('Unexpected error during Supabase Auth validation', { error })
    return { valid: false, user: null }
  }
}
