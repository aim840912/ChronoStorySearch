/**
 * Next.js 全域 Middleware - Bot Detection 第一道防線
 *
 * 功能：
 * 1. 在所有 API 路由之前執行 User-Agent 檢測
 * 2. 阻擋已知的 Bot（返回 403 Forbidden）
 * 3. 允許 SEO 爬蟲通過（保留 SEO 友好）
 * 4. 記錄 Bot 檢測日誌到 apiLogger
 *
 * 優勢：
 * - 最早攔截 Bot（節省 Vercel Functions 執行時間）
 * - 避免不必要的認證和資料庫查詢
 * - 直接返回 403，無需進入路由邏輯
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  detectBotByUserAgent,
  getClientIP,
} from '@/lib/bot-detection/user-agent-detector'
import { apiLogger } from '@/lib/logger'

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')
  const ip = getClientIP(request.headers)
  const path = request.nextUrl.pathname

  // 階段 1：User-Agent Bot Detection
  const botCheck = detectBotByUserAgent(userAgent)

  // SEO 爬蟲：允許通過（保留 SEO 友好）
  if (botCheck.isBot && !botCheck.shouldBlock) {
    apiLogger.info('SEO 爬蟲已允許', {
      ip,
      userAgent,
      reason: botCheck.reason,
      path,
    })
    return NextResponse.next()
  }

  // Bot 檢測：阻擋請求
  if (botCheck.shouldBlock) {
    apiLogger.warn('Bot 已阻擋', {
      ip,
      userAgent,
      reason: botCheck.reason,
      confidence: botCheck.confidence,
      path,
    })

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Bot detected',
        code: 'BOT_DETECTED',
        message: 'Automated requests are not allowed. If you believe this is an error, please contact support.',
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Bot-Detection': 'blocked',
          'X-Bot-Reason': botCheck.reason || 'unknown',
        },
      }
    )
  }

  // 真實瀏覽器：允許通過
  return NextResponse.next()
}

/**
 * Middleware 配置
 *
 * ⚠️ 已停用（2025-11-24）
 * 原因：Edge Requests 超出免費額度（2.3M / 1M）
 *
 * 安全性說明：
 * - Layer 2 防護仍然有效（API 路由中的 Rate Limiting + Behavior Detection）
 * - User-Agent 檢測已移至 API middleware（withBotDetection）
 * - 敏感端點仍需認證
 *
 * 如需重新啟用，將 matcher 改回 '/api/:path*'
 *
 * 歷史記錄：
 * - 2025-11-03：移除頁面層級匹配，減少 40-50% invocations
 * - 2025-11-24：完全停用以消除 Edge Request 成本
 */
export const config = {
  matcher: [
    // 已停用 - 所有 Bot Detection 由 API 路由中的 withBotDetection 處理
    // '/api/:path*',
  ],
}
