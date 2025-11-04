/**
 * 登出端點（使用 Supabase Auth）
 *
 * POST /api/auth/logout
 *
 * 功能：
 * 1. 使用 Supabase Auth 的 signOut 方法
 * 2. 自動清除 session cookie
 * 3. 返回成功訊息
 *
 * 特性：
 * - 冪等性：即使 session 已失效，仍返回成功
 * - 由 Supabase 統一處理 cookie 清除邏輯
 *
 * 參考文件：
 * - https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { success } from '@/lib/api-response'
import { apiLogger } from '@/lib/logger'

/**
 * POST /api/auth/logout
 *
 * 登出當前用戶（使用 Supabase Auth）
 *
 * 流程：
 * 1. 創建 Supabase 客戶端
 * 2. 呼叫 signOut 方法
 * 3. Supabase 自動清除 session cookie
 * 4. 返回成功訊息
 *
 * @example
 * 請求：
 * POST /api/auth/logout
 * Cookie: sb-<project-ref>-auth-token=xxx
 *
 * 回應：
 * {
 *   "success": true,
 *   "message": "登出成功",
 *   "data": null
 * }
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // 獲取當前用戶資訊（用於日誌記錄）
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      apiLogger.info('Logout request received', {
        user_id: user.id,
        email: user.email,
      })
    }

    // 登出（Supabase 會自動清除 cookie）
    const { error } = await supabase.auth.signOut()

    if (error) {
      apiLogger.error('Logout failed', { error })
      return NextResponse.json(
        {
          success: false,
          error: '登出失敗',
          code: 'LOGOUT_ERROR',
          details: error.message,
        },
        { status: 500 }
      )
    }

    apiLogger.info('User logged out successfully', {
      user_id: user?.id,
    })

    return success(null, '登出成功')
  } catch (error) {
    apiLogger.error('Logout processing failed', { error })
    return NextResponse.json(
      {
        success: false,
        error: '登出處理失敗',
        code: 'LOGOUT_PROCESSING_ERROR',
      },
      { status: 500 }
    )
  }
}
