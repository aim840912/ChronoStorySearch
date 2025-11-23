/**
 * 系統狀態查詢 API
 *
 * 路由：/api/system/status
 *
 * 權限：公開（無需認證）
 *
 * 功能：
 * - GET - 查詢系統當前狀態（交易系統是否啟用、維護模式等）
 *
 * 使用情境：
 * - 前端檢查交易系統是否啟用
 * - 前端顯示維護通知
 *
 * 防護措施：
 * - Bot Detection - User-Agent 過濾
 * - Rate Limiting - 10 次/小時（嚴格限制，防止掃描工具濫用）
 *
 * @module system-status
 */

import { NextRequest } from 'next/server'
import { success } from '@/lib/api-response'
import { getSystemSettings } from '@/lib/config/system-config'
import { withBotDetection } from '@/lib/bot-detection/api-middleware'

// Edge Runtime（暫時停用以減少 Edge Request 消耗：2025-11-24）
// - 延遲降低 60-70%（從 200ms → 50-80ms）
// - 執行成本降低 30-40%
// - 輕量級查詢，適合 Edge Runtime
// export const runtime = 'edge'

// =====================================================
// GET - 查詢系統狀態
// =====================================================

async function handleGET(_request: NextRequest) {
  // 從資料庫獲取系統設定（帶快取）
  const settings = await getSystemSettings()

  return success(
    {
      trading: {
        enabled: settings.trading_system_enabled
      },
      maintenance: {
        enabled: settings.maintenance_mode,
        message: settings.maintenance_message
      },
      loginBanner: {
        enabled: settings.login_banner_enabled,
        message: settings.login_banner_message
      }
    },
    '查詢成功'
  )
}

// Bot Detection + Rate Limiting（合理限制 60/小時）
export const GET = withBotDetection(handleGET, {
  module: 'SystemStatusAPI',
  botDetection: {
    enableRateLimit: true,
    enableBehaviorDetection: false,
    rateLimit: {
      limit: 60, // 每小時 60 次（考慮多元件使用和快取失效情況）
      window: 3600
    }
  }
})
