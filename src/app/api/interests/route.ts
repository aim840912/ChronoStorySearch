import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { success, created } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'

/**
 * GET /api/interests - 查詢我的購買意向
 *
 * 功能：
 * - 查詢當前用戶的所有購買意向
 * - 支援狀態篩選
 * - JOIN listings 表獲取刊登資訊
 *
 * 認證要求：🔒 需要認證
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handleGET(_request: NextRequest, user: User) {
  const { searchParams } = new URL(_request.url)
  const status = searchParams.get('status') || 'all'

  apiLogger.debug('查詢我的購買意向', { user_id: user.id, status })

  let query = supabaseAdmin
    .from('interests')
    .select(`
      *,
      listings (
        id,
        trade_type,
        item_id,
        quantity,
        price,
        status
      )
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: interests, error } = await query

  if (error) {
    apiLogger.error('查詢購買意向失敗', { error, user_id: user.id })
    throw new ValidationError('查詢購買意向失敗')
  }

  apiLogger.info('查詢購買意向成功', {
    user_id: user.id,
    count: interests?.length || 0
  })

  return success(interests || [], '查詢成功')
}

/**
 * POST /api/interests - 登記購買意向
 *
 * 功能：
 * - 驗證刊登存在且為 active 狀態
 * - 防止重複登記（UNIQUE constraint）
 * - 更新 listing.interest_count
 * - 創建意向記錄
 *
 * 認證要求：🔒 需要認證
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */
async function handlePOST(request: NextRequest, user: User) {
  const data = await request.json()
  const { listing_id, message } = data

  apiLogger.debug('登記購買意向', {
    user_id: user.id,
    listing_id
  })

  // 1. 驗證必填欄位
  if (!listing_id || typeof listing_id !== 'number') {
    throw new ValidationError('listing_id 必須是數字')
  }

  // 2. 驗證刊登存在且為 active 狀態
  const { data: listing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('id, user_id, status')
    .eq('id', listing_id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !listing) {
    apiLogger.warn('刊登不存在', { listing_id, error: fetchError })
    throw new NotFoundError('刊登不存在')
  }

  if (listing.status !== 'active') {
    throw new ValidationError('刊登已結束，無法登記意向')
  }

  // 3. 防止對自己的刊登登記意向
  if (listing.user_id === user.id) {
    throw new ValidationError('無法對自己的刊登登記意向')
  }

  // 4. 檢查是否已登記過
  const { data: existingInterest } = await supabaseAdmin
    .from('interests')
    .select('id')
    .eq('listing_id', listing_id)
    .eq('buyer_id', user.id)
    .single()

  if (existingInterest) {
    throw new ValidationError('您已登記過此刊登的購買意向')
  }

  // 5. 創建購買意向
  const interestData = {
    listing_id,
    buyer_id: user.id,
    message: message?.trim() || null,
    status: 'pending'
  }

  const { data: interest, error: insertError } = await supabaseAdmin
    .from('interests')
    .insert(interestData)
    .select()
    .single()

  if (insertError) {
    apiLogger.error('創建購買意向失敗', {
      error: insertError,
      user_id: user.id,
      listing_id
    })
    throw new ValidationError('創建購買意向失敗')
  }

  // 6. 更新 listing.interest_count
  await supabaseAdmin.rpc('increment_interest_count', {
    listing_id_param: listing_id
  })

  apiLogger.info('購買意向登記成功', {
    user_id: user.id,
    interest_id: interest.id,
    listing_id
  })

  return created(interest, '購買意向登記成功')
}

// 🔒 需要認證
export const GET = withAuthAndError(handleGET, {
  module: 'InterestAPI',
  enableAuditLog: false
})

export const POST = withAuthAndError(handlePOST, {
  module: 'InterestAPI',
  enableAuditLog: true
})
