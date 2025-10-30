/**
 * Supabase Edge Function: expire-listings
 *
 * 功能：
 * - 自動標記過期的刊登為 expired 狀態
 * - 查詢即將過期的刊登（24 小時內）並發送提醒通知
 * - 由 Cron Job 定期觸發（建議每 6 小時執行一次）
 *
 * 部署：npx supabase functions deploy expire-listings
 * 測試：npx supabase functions invoke expire-listings
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 結構化日誌工具
const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      ...data,
      timestamp: new Date().toISOString()
    }))
  },
  error: (message: string, error: Error | string | unknown, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: typeof error === 'string' ? error : (error instanceof Error ? error.message : String(error)),
      stack: error instanceof Error ? error.stack : undefined,
      ...data,
      timestamp: new Date().toISOString()
    }))
  },
  debug: (message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      level: 'debug',
      message,
      ...data,
      timestamp: new Date().toISOString()
    }))
  }
}

// Discord 通知發送函數
async function sendDiscordNotification(webhookUrl: string, embed: {
  title: string
  description: string
  color: number
  timestamp: string
  footer?: { text: string }
}) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    })

    if (!response.ok) {
      logger.error('Discord notification failed', response.status, { status: response.status })
    }
  } catch (error) {
    logger.error('Discord notification error', error)
    throw error
  }
}

Deno.serve(async () => {
  try {
    const now = new Date().toISOString()
    const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    logger.info('Starting expire-listings job', { timestamp: now })

    // 1. 查詢即將過期的刊登（24 小時內）
    const { data: expiringListings, error: expiringError } = await supabase
      .from('listings')
      .select('id, item_id, item_name, webhook_url, expires_at')
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .gt('expires_at', now)
      .lt('expires_at', in24Hours)

    if (expiringError) {
      logger.error('Error querying expiring listings', expiringError)
    } else {
      logger.info('Found expiring listings', { count: expiringListings?.length || 0 })

      // 發送即將過期通知
      for (const listing of expiringListings || []) {
        if (listing.webhook_url) {
          try {
            const hoursLeft = Math.floor(
              (new Date(listing.expires_at).getTime() - Date.now()) / (1000 * 60 * 60)
            )

            await sendDiscordNotification(listing.webhook_url, {
              title: '⏰ 刊登即將過期',
              description: `物品：**${listing.item_name || `物品 ID: ${listing.item_id}`}**\n\n過期時間：${listing.expires_at}\n剩餘時間：約 ${hoursLeft} 小時\n\n請儘快更新或刪除刊登。`,
              color: 0xFEE75C, // Yellow
              timestamp: new Date().toISOString(),
              footer: { text: `刊登 ID: ${listing.id}` }
            })

            logger.info('Expiring notification sent', { listing_id: listing.id })
          } catch (error) {
            logger.error('Failed to send expiring notification', error, { listing_id: listing.id })
          }
        }
      }
    }

    // 2. 更新已過期的刊登
    const { data: expiredListings, error: expiredError } = await supabase
      .from('listings')
      .update({
        status: 'expired',
        updated_at: now
      })
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .lt('expires_at', now)
      .select()

    if (expiredError) {
      logger.error('Error expiring listings', expiredError)
      throw expiredError
    }

    const expiredCount = expiredListings?.length || 0
    logger.info('Expired listings', { count: expiredCount })

    // 記錄已過期的刊登 ID
    if (expiredCount > 0) {
      const expiredIds = expiredListings?.map(l => l.id).join(', ')
      logger.debug('Expired listing IDs', { listing_ids: expiredIds })
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: expiredCount,
        expiring_count: expiringListings?.length || 0,
        timestamp: now
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    logger.error('Function error', error, { functionName: 'expire-listings' })
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
