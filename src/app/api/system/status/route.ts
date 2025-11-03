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

// Bot Detection + Rate Limiting（嚴格限制 10/小時）
export const GET = withBotDetection(handleGET, {
  module: 'SystemStatusAPI',
  botDetection: {
    enableRateLimit: true,
    enableBehaviorDetection: false,
    rateLimit: {
      limit: 10, // 每小時僅 10 次（健康檢查端點，嚴格限制）
      window: 3600
    }
  }
})
