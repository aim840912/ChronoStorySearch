/**
 * 配額計數器修復 API
 *
 * 路由：/api/admin/fix-quotas
 *
 * 權限：僅限管理員（Discord 角色為 Admin 或 Moderator）
 *
 * 功能：
 * - POST - 修復所有用戶的配額計數器，使其與實際刊登數同步
 *
 * 使用場景：
 * - 當發現用戶配額計數器與實際刊登數不一致時
 * - 資料庫遷移後的數據清理
 * - 緊急修復工具
 *
 * @module admin-fix-quotas
 */

import { NextRequest } from 'next/server'
import { withAdminAndError, User } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'

// =====================================================
// POST - 修復所有用戶的配額計數器
// =====================================================

interface FixResult {
  user_id: string
  email: string
  discord_username: string | null
  old_count: number
  actual_count: number
  difference: number
  fixed: boolean
}

// Supabase 查詢結果類型
interface QuotaWithUser {
  user_id: string
  active_listings_count: number
  users: {
    email: string
    discord_username: string | null
  } | null
}

async function handlePOST(_request: NextRequest, user: User) {
  apiLogger.info('管理員執行配額修復', { admin_id: user.id })

  const results: FixResult[] = []
  let totalFixed = 0

  try {
    // 1. 查詢所有有配額記錄的用戶
    const { data: quotas, error: quotaError } = await supabaseAdmin
      .from('user_quotas')
      .select(`
        user_id,
        active_listings_count,
        users!inner(email, discord_username)
      `)
      .returns<QuotaWithUser[]>()

    if (quotaError) {
      throw new Error(`查詢配額失敗: ${quotaError.message}`)
    }

    apiLogger.info('開始修復配額', {
      total_users: quotas.length,
      admin_id: user.id
    })

    // 2. 逐一檢查並修復每個用戶的配額
    for (const quota of quotas) {
      // 2.1 查詢該用戶的實際活躍刊登數
      const { count: actualCount, error: countError } = await supabaseAdmin
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', quota.user_id)
        .eq('status', 'active')
        .is('deleted_at', null)

      if (countError) {
        apiLogger.error('查詢用戶刊登數失敗', {
          user_id: quota.user_id,
          error: countError
        })
        continue
      }

      const oldCount = quota.active_listings_count
      const actual = actualCount || 0
      const difference = oldCount - actual

      // 2.2 如果計數不一致，進行修復
      if (difference !== 0) {
        const { error: updateError } = await supabaseAdmin
          .from('user_quotas')
          .update({
            active_listings_count: actual,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', quota.user_id)

        const fixed = !updateError

        if (updateError) {
          apiLogger.error('更新配額失敗', {
            user_id: quota.user_id,
            error: updateError
          })
        } else {
          totalFixed++
          apiLogger.info('配額已修復', {
            user_id: quota.user_id,
            old_count: oldCount,
            new_count: actual
          })
        }

        results.push({
          user_id: quota.user_id,
          email: quota.users?.email || 'unknown',
          discord_username: quota.users?.discord_username || null,
          old_count: oldCount,
          actual_count: actual,
          difference,
          fixed
        })
      }
    }

    apiLogger.info('配額修復完成', {
      total_checked: quotas.length,
      total_fixed: totalFixed,
      admin_id: user.id
    })

    return success(
      {
        summary: {
          total_users_checked: quotas.length,
          total_fixed: totalFixed,
          total_issues_found: results.length
        },
        details: results
      },
      `配額修復完成：檢查 ${quotas.length} 個用戶，修復 ${totalFixed} 個不同步的配額`
    )
  } catch (error) {
    apiLogger.error('配額修復失敗', {
      error,
      admin_id: user.id
    })
    throw error
  }
}

// =====================================================
// 匯出路由處理器（僅支援 POST）
// =====================================================

export const POST = withAdminAndError(handlePOST, {
  module: 'AdminFixQuotas',
  enableAuditLog: true
})
