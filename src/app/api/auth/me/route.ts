/**
 * 獲取當前用戶資訊端點（使用 Supabase Auth）
 *
 * GET /api/auth/me
 *
 * 功能：
 * 1. 從 Supabase Auth 取得當前用戶
 * 2. 從資料庫查詢完整用戶資料（users 表）
 * 3. 查詢 Discord 個人資料（discord_profiles）
 * 4. 查詢活躍刊登數量（可選）
 * 5. 查詢今日表達興趣次數（可選）
 * 6. 返回完整的用戶資訊
 *
 * 使用場景：
 * - 前端 AuthContext 初始化（檢查登入狀態）
 * - 個人資料頁面顯示
 * - 刊登/表達興趣前檢查配額
 *
 * 參考文件：
 * - https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { success } from '@/lib/api-response'
import { apiLogger, dbLogger } from '@/lib/logger'
import { getSystemSettings } from '@/lib/config/system-config'

/**
 * 用戶資訊回應介面
 */
interface UserInfoResponse {
  // 基本資訊
  id: string // 與 User 介面一致（使用 id 而非 user_id）
  discord_id: string
  discord_username: string
  discord_discriminator: string
  discord_avatar: string | null
  email: string | null

  // Discord 個人資料
  profile: {
    account_created_at: string
    reputation_score: number
    server_roles: string[]
    profile_privacy: string
  }

  // 配額資訊（可選）
  quotas?: {
    active_listings_count: number
    max_listings: number
    interests_today: number
    max_interests_per_day: number
  }

  // 帳號狀態
  account_status: {
    banned: boolean
    last_login_at: string
    created_at: string
  }
}

/**
 * GET /api/auth/me
 *
 * 獲取當前用戶的完整資訊（使用 Supabase Auth）
 *
 * 流程：
 * 1. 從 Supabase Auth 取得當前用戶
 * 2. 從 users 表查詢完整用戶資料
 * 3. 查詢 discord_profiles 表（reputation, roles, privacy）
 * 4. （可選）查詢活躍刊登數量
 * 5. （可選）查詢今日表達興趣次數
 * 6. 組合並返回完整資訊
 *
 * @example
 * 請求：
 * GET /api/auth/me
 * Cookie: sb-<project-ref>-auth-token=xxx
 *
 * 回應：
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid-123",
 *     "discord_id": "123456789",
 *     "discord_username": "Player#1234",
 *     "discord_avatar": "a1b2c3d4",
 *     "profile": {
 *       "reputation_score": 95,
 *       "server_roles": ["Member"],
 *       "profile_privacy": "public"
 *     },
 *     "account_status": {
 *       "banned": false,
 *       "last_login_at": "2025-10-26T09:00:00Z"
 *     }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 從 Supabase Auth 取得當前用戶
    const supabase = await createClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        {
          success: false,
          error: '未登入',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      )
    }

    // 2. 從資料庫查詢完整用戶資料
    // 先用 Supabase Auth UUID 查詢
    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    // 如果查不到，嘗試用 discord_id 查詢（遷移場景）
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
      dbLogger.error('Failed to fetch user data', {
        user_id: authUser.id,
        error: userError
      })
      return NextResponse.json(
        {
          success: false,
          error: '用戶不存在',
          code: 'USER_NOT_FOUND'
        },
        { status: 401 }
      )
    }

    // 檢查封禁狀態
    if (user.banned) {
      apiLogger.warn('Banned user attempted to access /api/auth/me', {
        user_id: user.id
      })
      return NextResponse.json(
        {
          success: false,
          error: '帳號已被封禁',
          code: 'ACCOUNT_BANNED'
        },
        { status: 403 }
      )
    }

    // 3. 檢查 URL 參數是否請求配額資訊
    const { searchParams } = new URL(request.url)
    const includeQuotas = searchParams.get('include_quotas') === 'true'

    let quotas: UserInfoResponse['quotas'] | undefined = undefined

    // 4. 查詢 Discord 個人資料
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('discord_profiles')
      .select('account_created_at, reputation_score, server_roles, profile_privacy')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profileData) {
      dbLogger.error('Failed to fetch discord profile', {
        user_id: user.id,
        error: profileError
      })
      // 返回 401 而不是 500，讓 AuthContext 觸發 sync
      return NextResponse.json(
        {
          success: false,
          error: 'Discord 個人資料不存在',
          code: 'PROFILE_NOT_FOUND'
        },
        { status: 401 }
      )
    }

    const profile = profileData

    // 5. 查詢配額資訊（如果需要）
    if (includeQuotas) {
      // 查詢活躍刊登數量
      const { count: activeListingsCount, error: listingsError } = await supabaseAdmin
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (listingsError) {
        dbLogger.error('Failed to count active listings', {
          user_id: user.id,
          error: listingsError
        })
      }

      // 查詢今日表達興趣次數
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { count: interestsTodayCount, error: interestsError } = await supabaseAdmin
        .from('buyer_interests')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', user.id)
        .gte('created_at', today.toISOString())

      if (interestsError) {
        dbLogger.error('Failed to count interests today', {
          user_id: user.id,
          error: interestsError
        })
      }

      // 從系統設定讀取配額上限
      const systemSettings = await getSystemSettings()

      quotas = {
        active_listings_count: activeListingsCount ?? 0,
        max_listings: systemSettings.max_active_listings_per_user,
        interests_today: interestsTodayCount ?? 0,
        max_interests_per_day: 100 // 根據路線圖，每日最多 100 次表達興趣
      }

      apiLogger.debug('Quotas retrieved successfully', {
        user_id: user.id,
        active_listings: activeListingsCount ?? 0,
        interests_today: interestsTodayCount ?? 0
      })
    }

    // 6. 組合用戶資訊
    const userInfo: UserInfoResponse = {
      // 基本資訊（來自 user 物件）
      id: user.id,
      discord_id: user.discord_id,
      discord_username: user.discord_username,
      discord_discriminator: user.discord_discriminator,
      discord_avatar: user.discord_avatar,
      email: user.email,

      // Discord 個人資料
      profile: {
        account_created_at: profile.account_created_at,
        reputation_score: profile.reputation_score,
        server_roles: profile.server_roles || [],
        profile_privacy: profile.profile_privacy
      },

      // 配額資訊（可選）
      ...(quotas && { quotas }),

      // 帳號狀態
      account_status: {
        banned: user.banned,
        last_login_at: user.last_login_at,
        created_at: user.created_at
      }
    }

    apiLogger.info('User info retrieved', {
      user_id: user.id,
      include_quotas: includeQuotas
    })

    return success(userInfo, '獲取用戶資訊成功')
  } catch (error) {
    apiLogger.error('Failed to get user info', { error })
    return NextResponse.json(
      {
        success: false,
        error: '取得用戶資訊失敗',
        code: 'GET_USER_INFO_ERROR'
      },
      { status: 500 }
    )
  }
}
