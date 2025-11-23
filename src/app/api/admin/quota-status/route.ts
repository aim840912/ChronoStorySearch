import { withAdminAndError } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'
import {
  fetchUpstashStats,
  fetchVercelStats,
  fetchSupabaseStats,
  calculateQuotaStatus,
} from '@/lib/quota/external-apis'
import type { QuotaStatus } from '@/lib/quota/types'

// Edge Runtime（暫時停用以減少 Edge Request 消耗：2025-11-24）
// export const runtime = 'edge'

/**
 * 查詢所有服務的免費額度使用狀況
 *
 * @returns 三個服務的額度資訊
 */
async function handleGET() {
  // 並行查詢三個服務（提升效能）
  const [redisData, vercelData, supabaseData] = await Promise.all([
    fetchUpstashStats(),
    fetchVercelStats(),
    fetchSupabaseStats(),
  ])

  // Redis (Upstash) 額度
  const redisUsed = redisData?.used ?? 0
  const redisLimit = redisData?.limit ?? 500000
  const redisPercentage = (redisUsed / redisLimit) * 100

  // Vercel Functions 額度
  const vercelUsed = vercelData?.used ?? 0
  const vercelLimit = vercelData?.limit ?? 40
  const vercelPercentage = vercelLimit > 0 ? (vercelUsed / vercelLimit) * 100 : 0

  // Supabase 額度
  const supabaseUsed = supabaseData?.used ?? 0
  const supabaseLimit = supabaseData?.limit ?? 1000000
  const supabasePercentage = (supabaseUsed / supabaseLimit) * 100

  // 聚合資料
  const quotaStatus: QuotaStatus = {
    redis: {
      used: redisUsed,
      limit: redisLimit,
      percentage: redisPercentage,
      unit: 'commands/month',
      resetDate: redisData?.resetDate ?? new Date().toISOString(),
      status: calculateQuotaStatus(redisPercentage),
    },
    vercel: {
      used: vercelUsed,
      limit: vercelLimit,
      percentage: vercelPercentage,
      unit: 'GB-Hours/month',
      resetDate: vercelData?.resetDate ?? new Date().toISOString(),
      status: vercelUsed === 0 ? 'ok' : calculateQuotaStatus(vercelPercentage),
    },
    supabase: {
      used: supabaseUsed,
      limit: supabaseLimit,
      percentage: supabasePercentage,
      unit: 'MB',
      resetDate: supabaseData?.resetDate ?? new Date().toISOString(),
      status: calculateQuotaStatus(supabasePercentage),
    },
    lastUpdated: new Date().toISOString(),
  }

  return success(quotaStatus, '額度狀態查詢成功')
}

export const GET = withAdminAndError(handleGET, {
  module: 'QuotaStatusAPI',
})
