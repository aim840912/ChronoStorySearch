/**
 * 單一服務的額度資訊
 */
export interface ServiceQuota {
  /** 已使用量 */
  used: number
  /** 總限制 */
  limit: number
  /** 使用百分比 (0-100) */
  percentage: number
  /** 單位說明 (例: "commands/day", "GB-Hours/month") */
  unit: string
  /** 重置日期 (ISO 8601 格式) */
  resetDate: string
  /** 狀態指示器 */
  status: 'ok' | 'warning' | 'critical'
}

/**
 * 所有服務的額度資訊
 */
export interface QuotaStatus {
  /** Redis (Upstash) 額度 */
  redis: ServiceQuota
  /** Vercel Functions 額度 */
  vercel: ServiceQuota
  /** Supabase 資料庫額度 */
  supabase: ServiceQuota
  /** 最後更新時間 (ISO 8601 格式) */
  lastUpdated: string
}

/**
 * API 回應格式
 */
export interface QuotaStatusResponse {
  success: boolean
  data: QuotaStatus
  error?: string
}

/**
 * Upstash API 統計回應格式
 */
export interface UpstashStatsResponse {
  daily_net_commands: number
  daily_read_requests: number
  daily_write_requests: number
  total_monthly_requests: number
  total_monthly_bandwidth: number
  total_monthly_billing: number
  current_storage: number
  connection_count: Array<{ x: string; y: number }>
}

/**
 * Supabase Metrics 查詢結果
 *
 * 注意：使用 pg_database_size_bytes 指標（資料庫大小）
 * 免費方案限制為 500 MB，超過需升級到 Pro 方案
 */
export interface SupabaseMetricsData {
  queryCount: number
  avgQueryTime: number
  totalConnections: number
}
