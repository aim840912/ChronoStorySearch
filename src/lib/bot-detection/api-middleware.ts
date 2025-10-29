/**
 * Bot Detection API 中間件整合
 *
 * 提供組合函數，整合 Bot Detection 與現有錯誤處理系統
 *
 * 設計模式：
 * - 遵循專案慣例（類似 withAuthAndError, withAdminAndError）
 * - 整合現有的 withErrorHandler 和日誌系統
 * - 支援可配置的 Rate Limit 和行為檢測
 *
 * 使用範例：
 * ```typescript
 * export const GET = withBotDetection(handleGET, {
 *   module: 'TrendingAPI',
 *   botDetection: {
 *     enableRateLimit: true,
 *     rateLimit: { limit: 30, window: 3600 }
 *   }
 * })
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  withErrorHandler,
  ErrorHandlerOptions,
} from '@/lib/middleware/error-handler'
import { fixedWindowRateLimit } from './rate-limiter'
import { detectAbnormalBehavior } from './behavior-detector'
import { getClientIP } from './user-agent-detector'
import { BotDetectionOptions } from './types'
import { RateLimitError } from '@/lib/errors'
import { DEFAULT_RATE_LIMITS } from './constants'

/**
 * Bot Detection 中間件選項（擴展 ErrorHandlerOptions）
 */
export interface BotDetectionMiddlewareOptions extends ErrorHandlerOptions {
  botDetection?: BotDetectionOptions
}

/**
 * Bot Detection 檢查邏輯（核心函數）
 *
 * @param request - Next.js Request
 * @param options - Bot Detection 選項
 * @throws RateLimitError - 超過限制時拋出
 */
async function checkBotDetection(
  request: NextRequest,
  options: BotDetectionOptions = {}
): Promise<void> {
  const {
    enableRateLimit = true,
    enableBehaviorDetection = true,
    rateLimit = DEFAULT_RATE_LIMITS.PUBLIC_API,
  } = options

  const ip = getClientIP(request.headers)
  const path = request.nextUrl.pathname

  // 1. Rate Limiting 檢查
  if (enableRateLimit) {
    const result = await fixedWindowRateLimit({
      limit: rateLimit.limit,
      window: rateLimit.window,
      identifier: ip,
      endpoint: path,
    })

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)

      throw new RateLimitError('請求過於頻繁，請稍後再試', {
        retryAfter,
        resetAt: result.resetAt,
      })
    }

    // 設定 Rate Limit Headers（標準做法）
    // 注意：Next.js Response 無法在此直接設定 headers，需在 handler 中處理
  }

  // 2. 行為模式檢測
  if (enableBehaviorDetection) {
    const behaviorResult = await detectAbnormalBehavior(ip, path)

    if (behaviorResult.isAbnormal) {
      throw new RateLimitError(
        `檢測到異常行為：${behaviorResult.type}`,
        {
          reason: behaviorResult.type,
          details: behaviorResult.details,
        }
      )
    }
  }
}

/**
 * 組合中間件：Bot Detection + Error Handler
 *
 * 用於公開 API 端點（無需認證）
 *
 * @param handler - API 處理函數
 * @param options - 中間件選項
 * @returns 包裝後的處理函數
 *
 * @example
 * ```typescript
 * async function handleGET(request: NextRequest) {
 *   const data = await fetchTrendingItems()
 *   return success(data, '查詢成功')
 * }
 *
 * export const GET = withBotDetection(handleGET, {
 *   module: 'TrendingAPI',
 *   botDetection: {
 *     enableRateLimit: true,
 *     rateLimit: { limit: 30, window: 3600 }
 *   }
 * })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withBotDetection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>,
  options: BotDetectionMiddlewareOptions
) {
  return withErrorHandler(
    async (request: NextRequest, ...args: T): Promise<Response> => {
      // 先執行 Bot Detection 檢查
      await checkBotDetection(request, options.botDetection)

      // 通過檢查後，執行實際 handler
      return await handler(request, ...args)
    },
    options
  )
}

/**
 * 組合中間件：Bot Detection + 認證 + Error Handler
 *
 * 用於需要認證的 API 端點
 *
 * @param handler - API 處理函數（接收 user 參數）
 * @param options - 中間件選項
 * @returns 包裝後的處理函數
 *
 * @example
 * ```typescript
 * import { User } from '@/lib/auth/session-validator'
 *
 * async function handlePOST(request: NextRequest, user: User) {
 *   const data = await req.json()
 *   const result = await createListing(data, user.id)
 *   return success(result, '建立成功')
 * }
 *
 * export const POST = withAuthAndBotDetection(handlePOST, {
 *   module: 'ListingAPI',
 *   botDetection: {
 *     rateLimit: { limit: 100, window: 3600 } // 認證用戶限制較寬鬆
 *   }
 * })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuthAndBotDetection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>,
  options: BotDetectionMiddlewareOptions
) {
  // 匯入認證中間件（延遲載入避免循環依賴）
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { withAuthAndError } = require('@/lib/middleware/api-middleware')

  // 先執行 Bot Detection，再執行認證
  return withAuthAndError(
    async (request: NextRequest, ...args: T): Promise<Response> => {
      // Bot Detection 已在 Next.js Middleware 執行（User-Agent 過濾）
      // 這裡執行更細緻的 Rate Limiting 和行為檢測
      await checkBotDetection(request, options.botDetection)

      // 通過檢查後，執行實際 handler
      return await handler(request, ...args)
    },
    options
  )
}

/**
 * 設定 Rate Limit Headers（輔助函數）
 *
 * 在 handler 中調用此函數設定標準 Rate Limit Headers
 *
 * @param response - Next.js Response
 * @param result - Rate Limit 檢測結果
 * @returns 更新後的 Response
 *
 * @example
 * ```typescript
 * const response = success(data, '查詢成功')
 * return setRateLimitHeaders(response, rateLimitResult)
 * ```
 */
export function setRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetAt: number
): NextResponse {
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.floor(resetAt / 1000).toString())
  return response
}
