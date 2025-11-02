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
 * @module system-status
 */

import { NextRequest } from 'next/server'
import { success } from '@/lib/api-response'
import { getSystemSettings } from '@/lib/config/system-config'

// =====================================================
// GET - 查詢系統狀態
// =====================================================

export async function GET(_request: NextRequest) {
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
