/**
 * 使用者角色查詢 API
 *
 * 路由：/api/auth/me/roles
 *
 * 權限：需要認證
 *
 * 功能：
 * - GET - 查詢當前使用者的 Discord 伺服器角色
 * - 返回角色列表和是否為管理員
 *
 * 使用情境：
 * - 前端檢查使用者是否有管理員權限
 * - 控制管理員功能的顯示
 *
 * @module auth-me-roles
 */

import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'

// Edge Runtime（暫時停用以減少 Edge Request 消耗：2025-11-24）
// export const runtime = 'edge'

// =====================================================
// GET - 查詢使用者角色
// =====================================================

async function handleGET(_request: NextRequest, user: User) {
  apiLogger.debug('查詢使用者角色', { userId: user.id })

  // 查詢 discord_profiles 表的 server_roles
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('discord_profiles')
    .select('server_roles')
    .eq('user_id', user.id)
    .single()

  if (profileError) {
    apiLogger.warn('查詢 Discord Profile 失敗', {
      userId: user.id,
      error: profileError.message
    })

    // 如果找不到 profile，返回空角色
    return success(
      {
        roles: [],
        isAdmin: false
      },
      '查詢成功'
    )
  }

  // 檢查是否為管理員
  const roles = Array.isArray(profile.server_roles) ? profile.server_roles : []
  const isAdmin = roles.includes('Admin') || roles.includes('Moderator')

  apiLogger.debug('使用者角色查詢成功', {
    userId: user.id,
    roles,
    isAdmin
  })

  return success(
    {
      roles,
      isAdmin
    },
    '查詢成功'
  )
}

// =====================================================
// 匯出 API Handlers
// =====================================================

export const GET = withAuthAndError(handleGET, {
  module: 'AuthMeRolesAPI',
  enableAuditLog: false
})
