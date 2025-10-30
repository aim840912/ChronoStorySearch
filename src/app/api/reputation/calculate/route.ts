import { NextRequest } from 'next/server'
import { withAdminAndError, User } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'
import { supabaseAdmin } from '@/lib/supabase/server'
import { ValidationError } from '@/lib/errors'
import { apiLogger } from '@/lib/logger'

/**
 * POST /api/reputation/calculate - 重新計算用戶信譽
 *
 * 功能：
 * - 根據 Discord 帳號資訊計算信譽分數
 * - 更新 discord_profiles 表的 reputation_score
 *
 * 評分規則：
 * - Discord 帳號年齡：
 *   - < 30 天：0 分
 *   - 30-90 天：30 分
 *   - 90-365 天：50 分
 *   - 1-3 年：70 分
 *   - 3 年以上：90 分
 * - Discord 官方驗證（email/phone）：+10 分
 * - 最終分數範圍：0-100 分
 *
 * 認證要求：🔒 需要管理員權限
 */
async function handlePOST(request: NextRequest, _user: User) {
  const { user_id } = await request.json()

  if (!user_id) {
    throw new ValidationError('缺少 user_id 參數')
  }

  apiLogger.debug('重新計算用戶信譽', { user_id })

  // 查詢用戶資料
  const { data: profile, error } = await supabaseAdmin
    .from('discord_profiles')
    .select('discord_id, account_created_at, verified')
    .eq('discord_id', user_id)
    .single()

  if (error || !profile) {
    throw new ValidationError('用戶不存在')
  }

  // 計算信譽分數
  let score = 0

  // Discord 帳號年齡
  const accountAgeDays = calculateAccountAgeDays(profile.account_created_at)
  if (accountAgeDays < 30) {
    score += 0
  } else if (accountAgeDays < 90) {
    score += 30
  } else if (accountAgeDays < 365) {
    score += 50
  } else if (accountAgeDays < 1095) { // 3 years = 1095 days
    score += 70
  } else {
    score += 90
  }

  // 官方驗證
  if (profile.verified) {
    score += 10
  }

  // 更新資料庫
  await supabaseAdmin
    .from('discord_profiles')
    .update({
      reputation_score: score,
      reputation_updated_at: new Date().toISOString(),
    })
    .eq('discord_id', user_id)

  apiLogger.info('信譽計算完成', {
    user_id,
    reputation_score: score,
    account_age_days: accountAgeDays
  })

  return success({
    user_id,
    reputation_score: score,
    account_age_days: accountAgeDays,
  }, '計算完成')
}

function calculateAccountAgeDays(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export const POST = withAdminAndError(handlePOST, {
  module: 'ReputationAPI',
  enableAuditLog: true,
})
