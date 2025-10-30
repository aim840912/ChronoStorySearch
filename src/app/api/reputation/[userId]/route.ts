import { NextRequest } from 'next/server'
import { withOptionalAuthAndError, User } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'
import { supabaseAdmin } from '@/lib/supabase/server'
import { NotFoundError } from '@/lib/errors'
import { apiLogger } from '@/lib/logger'

/**
 * GET /api/reputation/[userId] - 查詢用戶信譽
 *
 * 功能：
 * - 查詢指定用戶的信譽分數
 * - 返回信譽分數和最後更新時間
 *
 * 認證要求：🔓 公開 API（optionalAuth）
 */
async function handleGET(
  _request: NextRequest,
  _user: User | null,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params

  apiLogger.debug('查詢用戶信譽', { user_id: userId })

  // 查詢用戶信譽資料
  const { data: profile, error } = await supabaseAdmin
    .from('discord_profiles')
    .select('reputation_score, reputation_updated_at')
    .eq('discord_id', userId)
    .single()

  if (error || !profile) {
    throw new NotFoundError('用戶不存在或尚未計算信譽')
  }

  return success({
    user_id: userId,
    reputation_score: profile.reputation_score || 0,
    last_updated: profile.reputation_updated_at,
  }, '查詢成功')
}

export const GET = withOptionalAuthAndError(handleGET, {
  module: 'ReputationAPI',
})
