/**
 * 獲取當前用戶資訊端點
 *
 * GET /api/auth/me
 *
 * 功能：
 * 1. 驗證當前 session（透過 withAuthAndError 中間件）
 * 2. 查詢 Discord 個人資料（discord_profiles）
 * 3. 查詢當前 session 資訊（過期時間）
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
 * - docs/architecture/交易系統/03-API設計.md
 */

import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import { success } from '@/lib/api-response'
import { apiLogger, dbLogger } from '@/lib/logger'
import { DatabaseError, NotFoundError } from '@/lib/errors'

/**
 * 用戶資訊回應介面
 */
interface UserInfoResponse {
  // 基本資訊
  user_id: string
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

  // Session 資訊
  session: {
    session_id: string
    token_expires_at: string
    last_active_at: string
    created_at: string
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
 * 獲取當前用戶的完整資訊
 *
 * 流程：
 * 1. user 物件已由 withAuthAndError 提供（包含基本資訊）
 * 2. 查詢 discord_profiles 表（reputation, roles, privacy）
 * 3. 查詢 sessions 表（token 過期時間、最後活動時間）
 * 4. （可選）查詢活躍刊登數量
 * 5. （可選）查詢今日表達興趣次數
 * 6. 組合並返回完整資訊
 *
 * @example
 * 請求：
 * GET /api/auth/me
 * Cookie: maplestory_session=xxx
 *
 * 回應：
 * {
 *   "success": true,
 *   "data": {
 *     "user_id": "uuid-123",
 *     "discord_id": "123456789",
 *     "discord_username": "Player#1234",
 *     "discord_avatar": "a1b2c3d4",
 *     "profile": {
 *       "reputation_score": 95,
 *       "server_roles": ["Member"],
 *       "profile_privacy": "public"
 *     },
 *     "session": {
 *       "session_id": "uuid-456",
 *       "token_expires_at": "2025-11-25T10:00:00Z",
 *       "last_active_at": "2025-10-26T10:00:00Z"
 *     },
 *     "account_status": {
 *       "banned": false,
 *       "last_login_at": "2025-10-26T09:00:00Z"
 *     }
 *   }
 * }
 */
async function handleGET(request: NextRequest, user: User): Promise<Response> {
  // 1. 查詢 Discord 個人資料
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('discord_profiles')
    .select('account_created_at, reputation_score, server_roles, profile_privacy')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    dbLogger.error('Failed to fetch discord profile', {
      user_id: user.id,
      error: profileError
    })
    // Discord profile 應該在用戶創建時同時建立
    // 如果找不到，可能是資料不一致
    throw new NotFoundError('Discord 個人資料不存在')
  }

  // 2. 查詢 Session 資訊
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('id, token_expires_at, last_active_at, created_at')
    .eq('id', user.session_id)
    .single()

  if (sessionError || !session) {
    dbLogger.error('Failed to fetch session info', {
      user_id: user.id,
      session_id: user.session_id,
      error: sessionError
    })
    throw new DatabaseError('無法取得 session 資訊')
  }

  // 3. （可選）查詢配額資訊
  // 注意：這些表可能尚未實作（階段 2），暫時跳過或使用預設值
  let quotas: UserInfoResponse['quotas'] | undefined = undefined

  // 檢查 URL 參數是否請求配額資訊
  const { searchParams } = new URL(request.url)
  const includeQuotas = searchParams.get('include_quotas') === 'true'

  if (includeQuotas) {
    // 查詢活躍刊登數量
    const { count: activeListingsCount, error: listingsError } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .is('deleted_at', null)

    if (listingsError) {
      dbLogger.error('Failed to fetch active listings count', {
        user_id: user.id,
        error: listingsError
      })
      // 發生錯誤時使用 0，不阻斷整個請求
    }

    // 查詢今日表達興趣次數（UTC 時區）
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    const { count: interestsTodayCount, error: interestsError } = await supabaseAdmin
      .from('interests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString())

    if (interestsError) {
      dbLogger.error('Failed to fetch interests today count', {
        user_id: user.id,
        error: interestsError
      })
      // 發生錯誤時使用 0，不阻斷整個請求
    }

    quotas = {
      active_listings_count: activeListingsCount ?? 0,
      max_listings: 50, // 根據路線圖，每個用戶最多 50 個活躍刊登
      interests_today: interestsTodayCount ?? 0,
      max_interests_per_day: 100 // 根據路線圖，每日最多 100 次表達興趣
    }

    apiLogger.debug('Quotas retrieved successfully', {
      user_id: user.id,
      active_listings: activeListingsCount ?? 0,
      interests_today: interestsTodayCount ?? 0
    })
  }

  // 4. 組合用戶資訊
  const userInfo: UserInfoResponse = {
    // 基本資訊（來自 user 物件）
    user_id: user.id,
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

    // Session 資訊
    session: {
      session_id: session.id,
      token_expires_at: session.token_expires_at,
      last_active_at: session.last_active_at,
      created_at: session.created_at
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
}

/**
 * 匯出 GET 端點（使用認證中間件）
 */
export const GET = withAuthAndError(handleGET, {
  module: 'UserInfoAPI',
  enableAuditLog: false // 獲取自己的資訊不需要審計日誌
})
