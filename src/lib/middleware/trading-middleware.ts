/**
 * 交易系統開關中間件
 *
 * 功能：
 * - 檢查交易系統是否啟用
 * - 關閉時返回 503 Service Unavailable
 * - 即時從資料庫檢查（帶快取）
 *
 * 使用範例：
 * ```typescript
 * export const POST = requireTradingEnabled(
 *   withAuthAndError(handlePOST, { module: 'ListingAPI' })
 * )
 * ```
 *
 * @module trading-middleware
 */

import { NextRequest, NextResponse } from 'next/server'
import { isTradingEnabled } from '@/lib/config/system-config'
import { error as errorResponse } from '@/lib/api-response'
import { apiLogger } from '@/lib/logger'

/**
 * 交易系統開關中間件
 *
 * 包裝 API handler，在執行前檢查交易系統是否啟用
 *
 * @param handler - 原始 API handler
 * @returns 包裝後的 handler
 */
export function requireTradingEnabled<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      // 檢查交易系統是否啟用
      const enabled = await isTradingEnabled()

      if (!enabled) {
        apiLogger.warn('交易系統已關閉，拒絕請求', {
          path: request.nextUrl.pathname,
          method: request.method
        })

        return NextResponse.json(
          errorResponse('交易系統暫時關閉維護中，請稍後再試', 'TRADING_SYSTEM_DISABLED', 503),
          { status: 503 }
        )
      }

      // 交易系統啟用，繼續執行原始 handler
      return handler(request, ...args)
    } catch (error) {
      // 檢查系統狀態時發生錯誤，記錄錯誤但允許請求通過（避免單點故障）
      apiLogger.error('檢查交易系統狀態時發生錯誤', { error })

      // 為了系統穩定性，允許請求通過
      return handler(request, ...args)
    }
  }
}
