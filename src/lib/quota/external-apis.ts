import { apiLogger } from '@/lib/logger'
import type { UpstashStatsResponse } from './types'

/**
 * 計算額度狀態（ok/warning/critical）
 *
 * @param percentage - 使用百分比 (0-100)
 * @returns 狀態指示器
 */
export function calculateQuotaStatus(
  percentage: number
): 'ok' | 'warning' | 'critical' {
  if (percentage >= 90) return 'critical'
  if (percentage >= 70) return 'warning'
  return 'ok'
}

/**
 * 查詢 Upstash Redis 使用統計
 *
 * 使用 Upstash Developer API 取得 Redis 資料庫的使用統計資料
 * API 文檔: https://upstash.com/docs/devops/developer-api/redis/get_database_stats
 *
 * @returns 使用統計資料或 null（失敗時）
 */
export async function fetchUpstashStats(): Promise<{
  used: number
  limit: number
  resetDate: string
} | null> {
  try {
    const databaseId = process.env.UPSTASH_DATABASE_ID
    const apiEmail = process.env.UPSTASH_API_EMAIL
    const apiKey = process.env.UPSTASH_API_KEY

    if (!databaseId || !apiEmail || !apiKey) {
      apiLogger.warn('Upstash API credentials not configured', {
        hasId: !!databaseId,
        hasEmail: !!apiEmail,
        hasKey: !!apiKey,
      })
      return null
    }

    // 使用 Basic Auth
    const credentials = Buffer.from(`${apiEmail}:${apiKey}`).toString('base64')

    const response = await fetch(
      `https://api.upstash.com/v2/redis/stats/${databaseId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      apiLogger.error('Failed to fetch Upstash stats', {
        status: response.status,
        statusText: response.statusText,
      })
      return null
    }

    const data = (await response.json()) as UpstashStatsResponse

    // Upstash 免費方案：500K commands/month (2025 年新定價)
    const monthlyLimit = 500000
    const used = data.total_monthly_requests || 0

    // 計算重置日期（每月 1 號）
    const now = new Date()
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    apiLogger.info('Upstash stats fetched successfully', {
      used,
      limit: monthlyLimit,
      percentage: (used / monthlyLimit) * 100,
    })

    return {
      used,
      limit: monthlyLimit,
      resetDate: resetDate.toISOString(),
    }
  } catch (error) {
    apiLogger.error('Failed to fetch Upstash stats', { error })
    return null
  }
}

/**
 * 查詢 Vercel Functions 使用統計
 *
 * 注意：Vercel API 目前不提供使用量查詢端點
 * 此函數返回靜態限制資訊供參考
 *
 * @returns 靜態使用統計資料
 */
export async function fetchVercelStats(): Promise<{
  used: number
  limit: number
  resetDate: string
} | null> {
  try {
    // Vercel Pro 方案：40 GB-Hours/month
    // 由於 API 不支援查詢使用量，這裡返回靜態資訊
    const monthlyLimit = 40

    const now = new Date()
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    apiLogger.info('Vercel stats (static mode)', {
      note: 'Vercel API does not support usage query',
      limit: monthlyLimit,
    })

    return {
      used: 0, // 無法取得實際使用量
      limit: monthlyLimit,
      resetDate: resetDate.toISOString(),
    }
  } catch (error) {
    apiLogger.error('Failed to fetch Vercel stats', { error })
    return null
  }
}

/**
 * 查詢 Supabase 使用統計
 *
 * 使用 Supabase Metrics endpoint 取得資料庫查詢統計
 * API 文檔: https://supabase.com/docs/guides/telemetry/metrics
 *
 * @returns 使用統計資料或 null（失敗時）
 */
export async function fetchSupabaseStats(): Promise<{
  used: number
  limit: number
  resetDate: string
} | null> {
  try {
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
      /https:\/\/(.+)\.supabase\.co/
    )?.[1]
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!projectRef || !serviceRoleKey) {
      apiLogger.warn('Supabase API credentials not configured', {
        hasRef: !!projectRef,
        hasKey: !!serviceRoleKey,
      })
      return null
    }

    // 使用 HTTP Basic Auth (username: service_role, password: service_role_key)
    const credentials = Buffer.from(
      `service_role:${serviceRoleKey}`
    ).toString('base64')

    const response = await fetch(
      `https://${projectRef}.supabase.co/customer/v1/privileged/metrics`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    )

    if (!response.ok) {
      apiLogger.error('Failed to fetch Supabase metrics', {
        status: response.status,
        statusText: response.statusText,
      })
      return null
    }

    const metricsText = await response.text()

    // 解析 Prometheus 格式的 metrics
    // 使用 pg_database_size_bytes 指標（資料庫大小）
    // 這是免費方案的硬性限制（500 MB），超過需升級到 Pro 方案
    const dbSizeMatch = metricsText.match(
      /pg_database_size_bytes\{[^}]*\}\s+([\d.]+(?:e[+-]?\d+)?)/i
    )
    const dbSizeBytes = dbSizeMatch ? parseFloat(dbSizeMatch[1]) : 0
    const dbSizeMB = dbSizeBytes / 1048576 // 轉換為 MB

    // Supabase 免費方案的資料庫大小限制
    const sizeLimit = 500 // 500 MB

    const now = new Date()
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    apiLogger.info('Supabase stats fetched successfully', {
      dbSizeMB: Math.floor(dbSizeMB),
      limit: sizeLimit,
      percentage: (dbSizeMB / sizeLimit) * 100,
    })

    return {
      used: Math.floor(dbSizeMB), // 四捨五入為整數 MB
      limit: sizeLimit,
      resetDate: resetDate.toISOString(),
    }
  } catch (error) {
    apiLogger.error('Failed to fetch Supabase stats', { error })
    return null
  }
}
