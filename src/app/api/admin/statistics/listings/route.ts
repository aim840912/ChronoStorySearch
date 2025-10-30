/**
 * 刊登統計 API
 *
 * 路由：/api/admin/statistics/listings
 *
 * 權限：僅限管理員（Discord 角色為 Admin 或 Moderator）
 *
 * 功能：
 * - GET - 查詢刊登統計資料
 *   - 總活躍刊登數
 *   - 按狀態分類統計
 *   - 按交易類型分類統計
 *   - 最近 24 小時新增數量
 *
 * @module admin-listings-statistics
 */

import { NextRequest } from 'next/server'
import { withAdminAndError, User } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'
import { DatabaseError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'

// =====================================================
// TypeScript 類型定義
// =====================================================

interface ListingsStatistics {
  /** 總活躍刊登數 */
  totalActive: number

  /** 按狀態分類統計 */
  byStatus: {
    active: number
    completed: number
    expired: number
    cancelled: number
  }

  /** 按交易類型分類統計（僅統計活躍刊登） */
  byTradeType: {
    buy: number
    sell: number
    exchange: number
  }

  /** 最近 24 小時新增數量 */
  last24Hours: number

  /** 統計時間 */
  timestamp: string
}

// =====================================================
// GET - 查詢刊登統計
// =====================================================

async function handleGET(_request: NextRequest, user: User) {
  apiLogger.info('管理員查詢刊登統計', { userId: user.id })

  try {
    // 1. 查詢總活躍刊登數
    const { count: totalActive, error: activeError } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .is('deleted_at', null)

    if (activeError) {
      throw activeError
    }

    // 2. 查詢按狀態分類的統計
    const statusCounts = {
      active: 0,
      completed: 0,
      expired: 0,
      cancelled: 0
    }

    // 查詢 active 狀態（已在上面查詢過）
    statusCounts.active = totalActive || 0

    // 查詢 completed 狀態
    const { count: completedCount, error: completedError } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .is('deleted_at', null)

    if (completedError) {
      throw completedError
    }
    statusCounts.completed = completedCount || 0

    // 查詢 expired 狀態
    const { count: expiredCount, error: expiredError } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired')
      .is('deleted_at', null)

    if (expiredError) {
      throw expiredError
    }
    statusCounts.expired = expiredCount || 0

    // 查詢 cancelled 狀態（包含已刪除的）
    const { count: cancelledCount, error: cancelledError } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')

    if (cancelledError) {
      throw cancelledError
    }
    statusCounts.cancelled = cancelledCount || 0

    // 3. 查詢按交易類型分類的統計（僅統計活躍刊登）
    const { count: buyCount, error: buyError } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('trade_type', 'buy')
      .is('deleted_at', null)

    if (buyError) {
      throw buyError
    }

    const { count: sellCount, error: sellError } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('trade_type', 'sell')
      .is('deleted_at', null)

    if (sellError) {
      throw sellError
    }

    const { count: exchangeCount, error: exchangeError } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('trade_type', 'exchange')
      .is('deleted_at', null)

    if (exchangeError) {
      throw exchangeError
    }

    // 4. 查詢最近 24 小時新增數量
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const { count: last24HoursCount, error: last24HoursError } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString())
      .is('deleted_at', null)

    if (last24HoursError) {
      throw last24HoursError
    }

    // 組合統計結果
    const statistics: ListingsStatistics = {
      totalActive: totalActive || 0,
      byStatus: statusCounts,
      byTradeType: {
        buy: buyCount || 0,
        sell: sellCount || 0,
        exchange: exchangeCount || 0
      },
      last24Hours: last24HoursCount || 0,
      timestamp: new Date().toISOString()
    }

    apiLogger.info('刊登統計查詢成功', {
      userId: user.id,
      statistics
    })

    return success(statistics, '查詢成功')
  } catch (error) {
    apiLogger.error('查詢刊登統計失敗', {
      error: error instanceof Error ? error.message : String(error)
    })
    throw new DatabaseError('查詢刊登統計失敗')
  }
}

// =====================================================
// 匯出 API Handlers
// =====================================================

export const GET = withAdminAndError(handleGET, {
  module: 'AdminListingsStatisticsAPI',
  enableAuditLog: false // 統計查詢不需要審計日誌
})
