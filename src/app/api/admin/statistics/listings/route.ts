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
import { retry, RetryableError } from '@/lib/utils/retry'
import { redis } from '@/lib/redis/client'

// =====================================================
// 常數定義
// =====================================================

const CACHE_KEY = 'admin:statistics:listings'
const CACHE_TTL = 60 // 60 秒 - 統計資料不需即時更新

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
    // 1. 嘗試從快取取得
    const cached = await getCachedStatistics()
    if (cached) {
      apiLogger.debug('刊登統計快取命中', { userId: user.id })
      return success(cached, '查詢成功 (快取)')
    }

    // 2. 快取未命中，執行資料庫查詢
    const statistics = await fetchListingsStatistics()

    // 3. 設定快取
    await setCachedStatistics(statistics)

    apiLogger.info('刊登統計查詢成功', {
      userId: user.id,
      statistics
    })

    return success(statistics, '查詢成功')
  } catch (error) {
    // 改善錯誤記錄：正確序列化 Supabase 錯誤
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { raw: JSON.stringify(error, null, 2) }

    apiLogger.error('查詢刊登統計失敗', {
      userId: user.id,
      error: errorDetails
    })
    throw new DatabaseError('查詢刊登統計失敗')
  }
}

// =====================================================
// 輔助函數
// =====================================================

/**
 * 從快取獲取統計資料
 */
async function getCachedStatistics(): Promise<ListingsStatistics | null> {
  try {
    const cached = await redis.get<ListingsStatistics>(CACHE_KEY)
    if (cached) {
      return cached
    }
    return null
  } catch (error) {
    apiLogger.error('Redis cache get error', { error, cacheKey: CACHE_KEY })
    return null
  }
}

/**
 * 設定統計資料快取
 */
async function setCachedStatistics(data: ListingsStatistics): Promise<void> {
  try {
    await redis.set(CACHE_KEY, JSON.stringify(data), { ex: CACHE_TTL })
    apiLogger.debug('統計資料已快取', { cacheKey: CACHE_KEY, ttl: CACHE_TTL })
  } catch (error) {
    apiLogger.error('Redis cache set error', { error, cacheKey: CACHE_KEY })
  }
}

/**
 * 執行所有統計查詢（使用並行 + Retry）
 */
async function fetchListingsStatistics(): Promise<ListingsStatistics> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // 使用 Promise.all 並行執行所有查詢，每個查詢都包裹在 retry 中
  const [
    totalActive,
    completedCount,
    expiredCount,
    cancelledCount,
    buyCount,
    sellCount,
    exchangeCount,
    last24HoursCount
  ] = await Promise.all([
    // 查詢 active 狀態
    retryQuery(async () => {
      const { count, error } = await supabaseAdmin
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('deleted_at', null)
      if (error) throw error
      return count || 0
    }, 'active'),

    // 查詢 completed 狀態
    retryQuery(async () => {
      const { count, error } = await supabaseAdmin
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .is('deleted_at', null)
      if (error) throw error
      return count || 0
    }, 'completed'),

    // 查詢 expired 狀態
    retryQuery(async () => {
      const { count, error } = await supabaseAdmin
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'expired')
        .is('deleted_at', null)
      if (error) throw error
      return count || 0
    }, 'expired'),

    // 查詢 cancelled 狀態
    retryQuery(async () => {
      const { count, error } = await supabaseAdmin
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')
      if (error) throw error
      return count || 0
    }, 'cancelled'),

    // 查詢 buy 交易類型
    retryQuery(async () => {
      const { count, error } = await supabaseAdmin
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('trade_type', 'buy')
        .is('deleted_at', null)
      if (error) throw error
      return count || 0
    }, 'buy'),

    // 查詢 sell 交易類型
    retryQuery(async () => {
      const { count, error } = await supabaseAdmin
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('trade_type', 'sell')
        .is('deleted_at', null)
      if (error) throw error
      return count || 0
    }, 'sell'),

    // 查詢 exchange 交易類型
    retryQuery(async () => {
      const { count, error } = await supabaseAdmin
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('trade_type', 'exchange')
        .is('deleted_at', null)
      if (error) throw error
      return count || 0
    }, 'exchange'),

    // 查詢最近 24 小時
    retryQuery(async () => {
      const { count, error } = await supabaseAdmin
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday)
        .is('deleted_at', null)
      if (error) throw error
      return count || 0
    }, 'last24Hours')
  ])

  return {
    totalActive,
    byStatus: {
      active: totalActive,
      completed: completedCount,
      expired: expiredCount,
      cancelled: cancelledCount
    },
    byTradeType: {
      buy: buyCount,
      sell: sellCount,
      exchange: exchangeCount
    },
    last24Hours: last24HoursCount,
    timestamp: new Date().toISOString()
  }
}

/**
 * 包裹 Supabase 查詢，提供 Retry 機制
 */
async function retryQuery<T>(
  queryFn: () => Promise<T>,
  queryName: string
): Promise<T> {
  return retry(
    async () => {
      try {
        return await queryFn()
      } catch (error) {
        // 記錄具體哪個查詢失敗了
        const errorDetails = error instanceof Error
          ? { message: error.message, name: error.name }
          : { raw: JSON.stringify(error, null, 2) }

        apiLogger.warn(`查詢 ${queryName} 失敗，準備重試`, errorDetails)

        // Supabase 錯誤通常是暫時性的，應該重試
        throw new RetryableError(`Supabase query failed: ${queryName}`, true)
      }
    },
    {
      retries: 3,
      backoff: 'exponential',
      initialDelay: 500,
      maxDelay: 5000
    }
  )
}

// =====================================================
// 匯出 API Handlers
// =====================================================

export const GET = withAdminAndError(handleGET, {
  module: 'AdminListingsStatisticsAPI',
  enableAuditLog: false // 統計查詢不需要審計日誌
})
