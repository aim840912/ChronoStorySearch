import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { withAuthAndBotDetection } from '@/lib/bot-detection/api-middleware'
import { requireTradingEnabled } from '@/lib/middleware/trading-middleware'
import { success, created } from '@/lib/api-response'
import { ValidationError, NotFoundError, DatabaseError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import { sendDiscordNotification } from '@/lib/services/discord-notification'
import { validateMessage } from '@/lib/validation/text-validation'
import { decryptWebhookUrl } from '@/lib/crypto/webhook-encryption'

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
  apiLogger.debug('查詢我的購買意向', { user_id: user.id })

  const query = supabaseAdmin
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
    .select('id, user_id, status, webhook_url, item_id, trade_type')
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

  // 3. 防止對自己的刊登登記意向（管理員除外）
  if (listing.user_id === user.id) {
    // 檢查是否為管理員
    const { data: profile } = await supabaseAdmin
      .from('discord_profiles')
      .select('server_roles')
      .eq('user_id', user.id)
      .single()

    const isAdmin =
      Array.isArray(profile?.server_roles) &&
      (profile.server_roles.includes('Admin') ||
       profile.server_roles.includes('Moderator'))

    if (!isAdmin) {
      throw new ValidationError('無法對自己的刊登登記意向')
    }

    apiLogger.info('管理員對自己的刊登登記意向', {
      user_id: user.id,
      listing_id: listing.id
    })
  }

  // 4. 檢查是否已登記過（使用 limit(1) 更安全）
  const { data: existingInterests, error: checkError } = await supabaseAdmin
    .from('interests')
    .select('id')
    .eq('listing_id', listing_id)
    .eq('buyer_id', user.id)
    .limit(1)

  if (checkError) {
    apiLogger.error('檢查意向記錄失敗', { error: checkError })
    throw new DatabaseError('檢查意向記錄失敗', {
      code: checkError.code,
      message: checkError.message,
      details: checkError.details
    })
  }

  if (existingInterests && existingInterests.length > 0) {
    throw new ValidationError('您已登記過此刊登的購買意向')
  }

  // 5. 創建購買意向
  // 驗證並清理 message (留言)
  const validatedMessage = validateMessage(message)

  const interestData = {
    listing_id,
    buyer_id: user.id,
    message: validatedMessage
  }

  const { data: interest, error: insertError } = await supabaseAdmin
    .from('interests')
    .insert(interestData)
    .select()
    .single()

  if (insertError) {
    apiLogger.error('創建購買意向失敗', {
      error: insertError,
      error_code: insertError.code,
      error_message: insertError.message,
      error_details: insertError.details,
      user_id: user.id,
      listing_id,
      interest_data: interestData
    })
    throw new ValidationError(`創建購買意向失敗: ${insertError.message}`)
  }

  // 6. 更新 listing.interest_count
  await supabaseAdmin.rpc('increment_interest_count', {
    listing_id_param: listing_id
  })

  // 7. 發送 Discord Webhook 通知（非阻塞）
  if (listing.webhook_url) {
    try {
      // 解密 webhook_url
      const decryptedWebhookUrl = decryptWebhookUrl(listing.webhook_url)

      // 查詢買家的信譽分數
      const { data: buyerProfile } = await supabaseAdmin
        .from('discord_profiles')
        .select('reputation_score')
        .eq('user_id', user.id)
        .single()

      // 非同步發送通知，不等待結果
      sendDiscordNotification(
        decryptedWebhookUrl,
        'interest_received',
        {
          listingId: listing.id,
          itemName: `物品 ID: ${listing.item_id}`,
          tradeType: listing.trade_type,
          buyer: {
            username: user.discord_username || user.discord_id,
            reputation: buyerProfile?.reputation_score
          }
        }
      ).catch((error) => {
        // 記錄通知失敗，但不中斷主流程
        apiLogger.warn('Discord 通知發送失敗 (interest_received)', {
          listing_id: listing.id,
          notification_type: 'interest_received',
          error_message: error.message,
          user_id: user.id
        })
      })
    } catch (error) {
      // 解密失敗時記錄錯誤
      apiLogger.error('解密 Webhook URL 失敗', {
        listing_id: listing.id,
        error
      })
    }
  }

  apiLogger.info('購買意向登記成功', {
    user_id: user.id,
    interest_id: interest.id,
    listing_id
  })

  return created(interest, '購買意向登記成功')
}

// 🔒 需要認證 + 交易系統開關檢查
export const GET = requireTradingEnabled(
  withAuthAndError(handleGET, {
    module: 'InterestAPI',
    enableAuditLog: false
  })
)

export const POST = requireTradingEnabled(
  withAuthAndBotDetection(handlePOST, {
    module: 'InterestAPI',
    enableAuditLog: true,
    botDetection: {
      enableRateLimit: true,
      rateLimit: { limit: 30, window: 3600 } // 30次/小時
    }
  })
)
