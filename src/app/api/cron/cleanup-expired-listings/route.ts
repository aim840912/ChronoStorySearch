/**
 * POST /api/cron/cleanup-expired-listings - 清理過期刊登的 Cron Job
 *
 * 功能：
 * - 軟刪除過期刊登（設定 deleted_at，保留資料供分析）
 * - 過期條件：created_at 超過 30 天且 status = 'active'
 * - 使用 Vercel Cron Job 每日自動執行
 * - 僅接受來自 Vercel Cron 的請求（透過 Authorization header 驗證）
 *
 * 認證要求：🔒 Vercel Cron Secret（CRON_SECRET）
 * 排程：每日 UTC 00:00 執行
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import { DatabaseError } from '@/lib/errors'
import { redis } from '@/lib/redis/client'

/**
 * Cron Job 處理函數
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 驗證 Cron Secret（防止未授權請求）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      apiLogger.error('CRON_SECRET 環境變數未設定')
      return NextResponse.json(
        { error: { message: '伺服器配置錯誤' } },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      apiLogger.warn('Cron Job 認證失敗', {
        authHeader: authHeader ? '***' : 'null'
      })
      return NextResponse.json(
        { error: { message: '認證失敗' } },
        { status: 401 }
      )
    }

    // 2. 獲取分散式鎖（防止多個實例同時執行）
    const lockKey = 'cron:cleanup-expired-listings:lock'
    const lockValue = `${Date.now()}-${Math.random()}`

    const lockAcquired = await redis.set(lockKey, lockValue, {
      nx: true, // 只在不存在時設定
      ex: 300 // 5 分鐘過期（防止死鎖）
    })

    if (!lockAcquired) {
      apiLogger.info('另一個 Cron Job 實例正在執行，跳過此次清理')
      return NextResponse.json({
        success: true,
        data: {
          deletedCount: 0,
          message: '跳過：另一個實例正在執行'
        }
      })
    }

    apiLogger.info('開始清理過期刊登（已獲取分散式鎖）')

    try {
      // 3. 計算過期時間（30 天前）
    const expirationDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const expirationISO = expirationDate.toISOString()

    apiLogger.debug('過期刊登清理參數', {
      expirationDate: expirationISO,
      daysAgo: 30
    })

    // 3. 查詢過期刊登（created_at < 30 天前 且 status = 'active'）
    const { data: expiredListings, error: queryError } = await supabaseAdmin
      .from('listings')
      .select('id, item_id, created_at')
      .eq('status', 'active')
      .is('deleted_at', null)
      .lt('created_at', expirationISO)

    if (queryError) {
      throw new DatabaseError('查詢過期刊登失敗', {
        code: queryError.code,
        message: queryError.message,
        details: queryError.details
      })
    }

    // 4. 如果沒有過期刊登，直接返回
    if (!expiredListings || expiredListings.length === 0) {
      apiLogger.info('沒有過期刊登需要清理')
      return NextResponse.json({
        success: true,
        data: {
          deletedCount: 0,
          message: '沒有過期刊登需要清理'
        }
      })
    }

    apiLogger.info('找到過期刊登', { count: expiredListings.length })

    // 5. 批次軟刪除過期刊登（設定 deleted_at）
    const now = new Date().toISOString()
    const listingIds = expiredListings.map((listing) => listing.id)

    const { error: updateError } = await supabaseAdmin
      .from('listings')
      .update({
        status: 'cancelled',
        deleted_at: now
      })
      .in('id', listingIds)

    if (updateError) {
      throw new DatabaseError('軟刪除過期刊登失敗', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details
      })
    }

    apiLogger.info('過期刊登已清理', {
      deletedCount: expiredListings.length,
      listingIds: listingIds.slice(0, 10) // 只記錄前 10 個 ID
    })

      // 6. 返回成功結果
      return NextResponse.json({
        success: true,
        data: {
          deletedCount: expiredListings.length,
          message: `已清理 ${expiredListings.length} 個過期刊登`,
          expirationDate: expirationISO
        }
      })
    } finally {
      // 安全釋放鎖（使用 Lua script 確保只釋放自己持有的鎖）
      try {
        const releaseLua = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `
        await redis.eval(releaseLua, [lockKey], [lockValue])
        apiLogger.debug('分散式鎖已釋放', { lockKey })
      } catch (lockError) {
        apiLogger.error('釋放分散式鎖失敗', { error: lockError, lockKey })
      }
    }
  } catch (error) {
    apiLogger.error('清理過期刊登失敗', { error })

    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : '清理過期刊登時發生錯誤'
        }
      },
      { status: 500 }
    )
  }
}
