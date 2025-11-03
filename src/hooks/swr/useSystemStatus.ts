/**
 * SWR 版本的系統狀態 Hook
 *
 * 功能：
 * - 使用 SWR 管理系統狀態快取
 * - 自動去重請求
 * - 取代手動實作的全域快取和請求去重
 *
 * 優化效果（相比手動實作）：
 * - 更簡潔的程式碼（從 179 行 → 50 行）
 * - 更好的類型安全
 * - 內建錯誤重試機制
 */

import useSWR from 'swr'
import { swrStrategies } from '@/lib/swr/config'

interface SystemStatus {
  trading: {
    enabled: boolean
  }
  maintenance: {
    enabled: boolean
    message: string
  }
  loginBanner: {
    enabled: boolean
    message: string
  }
}

interface SystemStatusResponse {
  success: boolean
  data: SystemStatus
  message?: string
}

/**
 * 使用 SWR 獲取系統狀態
 *
 * @returns SWR 返回值 + 便利屬性
 *
 * @example
 * ```tsx
 * function TradingPage() {
 *   const { tradingEnabled, maintenanceMode, isLoading } = useSystemStatus()
 *
 *   if (isLoading) return <div>載入中...</div>
 *   if (maintenanceMode) return <MaintenancePage />
 *   if (!tradingEnabled) return <TradingDisabled />
 *
 *   return <TradingDashboard />
 * }
 * ```
 */
export function useSystemStatus() {
  const { data, error, isLoading, mutate } = useSWR<SystemStatusResponse>(
    '/api/system/status',
    swrStrategies.realtime // 使用即時策略（2 秒去重）
  )

  return {
    tradingEnabled: data?.data?.trading?.enabled ?? true, // 預設啟用（容錯）
    maintenanceMode: data?.data?.maintenance?.enabled ?? false,
    maintenanceMessage: data?.data?.maintenance?.message ?? '',
    loginBannerEnabled: data?.data?.loginBanner?.enabled ?? false,
    loginBannerMessage: data?.data?.loginBanner?.message ?? '',
    isLoading,
    error,
    refetch: () => mutate(),
  }
}
