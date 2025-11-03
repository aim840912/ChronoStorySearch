/**
 * 管理員權限檢查函數
 *
 * 功能：
 * - 檢查用戶是否為管理員
 * - 從 discord_profiles.server_roles 驗證角色
 * - 純函數，可用於 Server Components 和 API Routes
 *
 * 管理員角色：
 * - 'Admin': 完整管理權限
 * - 'Moderator': 版主權限（等同管理員）
 *
 * 參考文件：
 * - docs/architecture/交易系統/05-安全與可靠性.md
 */

import { supabaseAdmin } from '@/lib/supabase/server'
import type { User } from './session-validator'

/**
 * 檢查用戶是否為管理員
 *
 * 檢查邏輯：
 * 1. 查詢 discord_profiles 表的 server_roles
 * 2. 檢查是否包含 'Admin' 或 'Moderator'
 * 3. 如果查詢失敗或沒有角色，返回 false
 *
 * 使用範例：
 * ```typescript
 * // Server Component 中
 * const { valid, user } = await validateSessionFromCookies()
 * if (valid && user) {
 *   const isAdmin = await checkIsAdmin(user)
 *   if (!isAdmin) {
 *     redirect('/')
 *   }
 * }
 * ```
 *
 * @param user - 已驗證的用戶物件
 * @returns true 如果用戶為管理員，否則 false
 */
export async function checkIsAdmin(user: User): Promise<boolean> {
  try {
    // 查詢 discord_profiles 表的 server_roles
    const { data: profile, error } = await supabaseAdmin
      .from('discord_profiles')
      .select('server_roles')
      .eq('user_id', user.id)
      .single()

    // 如果查詢失敗或沒有 profile，視為非管理員
    if (error || !profile) {
      return false
    }

    // 檢查 server_roles 是否包含 'Admin' 或 'Moderator'
    const isAdmin =
      Array.isArray(profile.server_roles) &&
      (profile.server_roles.includes('Admin') || profile.server_roles.includes('Moderator'))

    return isAdmin
  } catch {
    // 任何錯誤都視為非管理員（安全預設）
    return false
  }
}
