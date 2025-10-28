/**
 * 統一錯誤處理中間件
 *
 * 功能：
 * - 捕獲所有錯誤並統一處理
 * - 使用 apiLogger 記錄錯誤
 * - 產生 trace_id 用於追蹤
 * - 返回統一錯誤格式
 * - 區分已知錯誤 (ValidationError, NotFoundError 等) 和未知錯誤
 * - 生產環境不洩漏敏感資訊
 *
 * 使用方式:
 * ```ts
 * export const GET = withErrorHandler(handleGET, { module: 'YourAPI' })
 * ```
 *
 * 參考:
 * - CLAUDE.md - API 開發規範
 * - src/lib/errors (錯誤類別定義)
 * - src/lib/api-response (統一回應格式)
 */

import { NextRequest } from 'next/server'
import { apiLogger } from '@/lib/logger'
import { BaseError, ErrorFactory } from '@/lib/errors'
import { error } from '@/lib/api-response'
import { v4 as uuidv4 } from 'uuid'

/**
 * 錯誤處理選項
 */
export interface ErrorHandlerOptions {
  /** 模組名稱（用於日誌分類）*/
  module: string
  /** 是否啟用審計日誌（記錄所有請求和回應）*/
  enableAuditLog?: boolean
}

/**
 * 統一錯誤處理中間件
 *
 * 包裝 API 處理函數，捕獲並處理所有錯誤
 *
 * @param handler - API 處理函數
 * @param options - 錯誤處理選項
 * @returns 包裝後的 API 處理函數
 *
 * @example
 * ```ts
 * async function handleGET(request: NextRequest) {
 *   // 如果拋出錯誤，會被 withErrorHandler 捕獲
 *   throw new ValidationError('參數錯誤')
 * }
 *
 * export const GET = withErrorHandler(handleGET, {
 *   module: 'ListingAPI',
 *   enableAuditLog: true
 * })
 * ```
 */
export function withErrorHandler(
  handler: (request: NextRequest, ...args: any[]) => Promise<Response>, // eslint-disable-line @typescript-eslint/no-explicit-any
  options: ErrorHandlerOptions
) {
  return async (request: NextRequest, ...args: any[]): Promise<Response> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    // 1. 產生 trace_id（用於追蹤整個請求生命週期）
    const trace_id = uuidv4()

    // 取得請求資訊（用於日誌）
    const method = request.method
    const url = request.url
    const { module, enableAuditLog } = options

    try {
      // 2. 記錄請求開始（如果啟用審計日誌）
      if (enableAuditLog) {
        apiLogger.info(`[${module}] Request started`, {
          trace_id,
          method,
          url,
          headers: {
            'user-agent': request.headers.get('user-agent'),
            'x-forwarded-for': request.headers.get('x-forwarded-for')
          }
        })
      }

      // 3. 執行 handler
      const startTime = Date.now()
      const response = await handler(request, ...args)
      const duration = Date.now() - startTime

      // 4. 記錄請求成功（如果啟用審計日誌）
      if (enableAuditLog) {
        apiLogger.info(`[${module}] Request completed`, {
          trace_id,
          method,
          url,
          status: response.status,
          duration_ms: duration
        })
      }

      return response
    } catch (err: unknown) {
      // 5. 捕獲錯誤並記錄
      return handleError(err, {
        trace_id,
        module,
        method,
        url
      })
    }
  }
}

/**
 * 錯誤處理函數
 *
 * 將各種錯誤轉換為統一的 API 回應格式
 *
 * @param err - 捕獲的錯誤
 * @param context - 錯誤上下文（trace_id, module, method, url）
 * @returns 統一格式的錯誤回應
 */
function handleError(
  err: unknown,
  context: {
    trace_id: string
    module: string
    method: string
    url: string
  }
): Response {
  const { trace_id, module, method, url } = context

  // 6. 區分已知錯誤和未知錯誤
  let handledError: BaseError

  if (err instanceof BaseError) {
    // 已知錯誤（ValidationError, NotFoundError 等）
    handledError = err
  } else {
    // 未知錯誤（轉換為 BaseError）
    handledError = ErrorFactory.fromUnknown(err)
  }

  // 7. 記錄錯誤到 apiLogger
  const logLevel = determineLogLevel(handledError)
  const logMessage = `[${module}] ${method} ${url} - ${handledError.code}: ${handledError.message}`

  const logContext = {
    trace_id,
    module,
    method,
    url,
    error_code: handledError.code,
    error_message: handledError.message,
    status_code: handledError.statusCode,
    is_operational: handledError.isOperational,
    stack: process.env.NODE_ENV === 'development' ? handledError.stack : undefined,
    context: handledError.context
  }

  switch (logLevel) {
    case 'error':
      apiLogger.error(logMessage, logContext)
      break
    case 'warn':
      apiLogger.warn(logMessage, logContext)
      break
    case 'info':
      apiLogger.info(logMessage, logContext)
      break
    case 'debug':
      apiLogger.debug(logMessage, logContext)
      break
  }

  // 8. 返回統一錯誤格式
  // 生產環境不洩漏敏感資訊（如 stack trace）
  const shouldIncludeDetails = process.env.NODE_ENV === 'development'

  return error(
    handledError.message,
    handledError.code,
    handledError.statusCode,
    trace_id,
    shouldIncludeDetails
      ? {
          stack: handledError.stack,
          ...handledError.context
        }
      : undefined
  )
}

/**
 * 根據錯誤類型決定日誌級別
 *
 * @param error - BaseError 實例
 * @returns 日誌級別
 */
function determineLogLevel(
  error: BaseError
): 'error' | 'warn' | 'info' | 'debug' {
  // 500 錯誤：error
  if (error.statusCode >= 500) {
    return 'error'
  }

  // 401 Unauthorized：debug（正常的認證失敗）
  if (error.statusCode === 401) {
    return 'debug'
  }

  // 403 Forbidden：info（權限不足，可能是惡意嘗試）
  if (error.statusCode === 403) {
    return 'info'
  }

  // 404 Not Found：debug（正常的資源不存在）
  if (error.statusCode === 404) {
    return 'debug'
  }

  // 429 Rate Limit：warn（可能是 Bot 或濫用）
  if (error.statusCode === 429) {
    return 'warn'
  }

  // 其他 4xx 錯誤（如 400 ValidationError）：info
  if (error.statusCode >= 400 && error.statusCode < 500) {
    return 'info'
  }

  // 預設：warn
  return 'warn'
}
