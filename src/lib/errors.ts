/**
 * 標準錯誤類別
 *
 * 符合 CLAUDE.md 規範的統一錯誤處理系統
 * 所有錯誤都應繼承自 BaseError，並提供明確的 HTTP 狀態碼和錯誤代碼
 *
 * @example
 * ```ts
 * import { ValidationError, NotFoundError } from '@/lib/errors'
 *
 * // 輸入驗證錯誤
 * throw new ValidationError('物品 ID 格式不正確')
 *
 * // 資源不存在
 * throw new NotFoundError('找不到該刊登')
 * ```
 */

/**
 * 基礎錯誤類別
 *
 * 所有自定義錯誤都應繼承此類別
 */
export class BaseError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean
  public readonly context?: Record<string, unknown>

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    context?: Record<string, unknown>
  ) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)

    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    this.context = context

    Error.captureStackTrace(this)
  }
}

/**
 * 400 Bad Request - 輸入驗證錯誤
 *
 * 用於客戶端提供的資料格式不正確、缺少必填欄位等情況
 *
 * @example
 * ```ts
 * throw new ValidationError('價格必須大於 0')
 * throw new ValidationError('物品 ID 不存在', { itemId: 12345 })
 * ```
 */
export class ValidationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', true, context)
    this.name = 'ValidationError'
  }
}

/**
 * 401 Unauthorized - 未認證錯誤
 *
 * 用於使用者未登入或 session 無效的情況
 *
 * @example
 * ```ts
 * throw new UnauthorizedError('需要登入才能使用此功能')
 * throw new UnauthorizedError('Session 已過期')
 * ```
 */
export class UnauthorizedError extends BaseError {
  constructor(message: string = '需要登入才能使用此功能', context?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', true, context)
    this.name = 'UnauthorizedError'
  }
}

/**
 * 403 Forbidden - 權限不足錯誤
 *
 * 用於使用者已登入但權限不足的情況（如非管理員）
 *
 * @example
 * ```ts
 * throw new AuthorizationError('需要管理員權限')
 * throw new AuthorizationError('您無權編輯此刊登')
 * ```
 */
export class AuthorizationError extends BaseError {
  constructor(message: string = '權限不足', context?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', true, context)
    this.name = 'AuthorizationError'
  }
}

/**
 * 404 Not Found - 資源不存在錯誤
 *
 * 用於請求的資源不存在的情況
 *
 * @example
 * ```ts
 * throw new NotFoundError('找不到該刊登')
 * throw new NotFoundError('使用者不存在', { userId: 'uuid-123' })
 * ```
 */
export class NotFoundError extends BaseError {
  constructor(message: string = '找不到請求的資源', context?: Record<string, unknown>) {
    super(message, 404, 'NOT_FOUND', true, context)
    this.name = 'NotFoundError'
  }
}

/**
 * 405 Method Not Allowed - HTTP 方法不支援錯誤
 *
 * 用於客戶端使用了不支援的 HTTP 方法（如 PUT、PATCH）
 *
 * @example
 * ```ts
 * throw new MethodNotAllowedError('此端點不支援 PUT 方法')
 * throw new MethodNotAllowedError(['GET', 'POST']) // 自動生成訊息
 * ```
 */
export class MethodNotAllowedError extends BaseError {
  constructor(allowedMethodsOrMessage: string | string[]) {
    const message = Array.isArray(allowedMethodsOrMessage)
      ? `此端點僅支援 ${allowedMethodsOrMessage.join(', ')} 方法`
      : allowedMethodsOrMessage

    super(message, 405, 'METHOD_NOT_ALLOWED', true)
    this.name = 'MethodNotAllowedError'
  }
}

/**
 * 409 Conflict - 資源衝突錯誤
 *
 * 用於資源已存在或狀態衝突的情況（如重複刊登、重複意向）
 *
 * @example
 * ```ts
 * throw new ConflictError('您已對此刊登登記過購買意向')
 * throw new ConflictError('刊登已存在', { listingId: 123 })
 * ```
 */
export class ConflictError extends BaseError {
  constructor(message: string = '資源衝突', context?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', true, context)
    this.name = 'ConflictError'
  }
}

/**
 * 429 Too Many Requests - 速率限制錯誤
 *
 * 用於超過 API 速率限制的情況
 *
 * @example
 * ```ts
 * throw new RateLimitError('每分鐘最多 10 次請求')
 * throw new RateLimitError('請稍後再試', { retryAfter: 60 })
 * ```
 */
export class RateLimitError extends BaseError {
  constructor(message: string = '請求過於頻繁，請稍後再試', context?: Record<string, unknown>) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, context)
    this.name = 'RateLimitError'
  }
}

/**
 * 500 Internal Server Error - 資料庫錯誤
 *
 * 用於 Supabase 或其他資料庫操作失敗的情況
 *
 * @example
 * ```ts
 * throw new DatabaseError('查詢失敗', { table: 'listings' })
 * ```
 */
export class DatabaseError extends BaseError {
  constructor(message: string = '資料庫操作失敗', context?: Record<string, unknown>) {
    super(message, 500, 'DATABASE_ERROR', true, context)
    this.name = 'DatabaseError'
  }
}

/**
 * 錯誤工廠類別
 *
 * 提供便利方法來創建和轉換錯誤
 */
export class ErrorFactory {
  /**
   * 從 Supabase 錯誤轉換為標準錯誤
   *
   * @example
   * ```ts
   * const { data, error } = await supabase.from('listings').select('*')
   * if (error) {
   *   throw ErrorFactory.fromSupabaseError(error)
   * }
   * ```
   */
  static fromSupabaseError(error: unknown): BaseError {
    // Supabase 錯誤代碼對應
    // 參考：https://supabase.com/docs/guides/api/rest/error-codes

    // 安全訪問錯誤屬性
    const errorObj = error as Record<string, unknown>
    const code = (errorObj.code as string) || (errorObj.error_code as string) || 'UNKNOWN'
    const message = (errorObj.message as string) || '資料庫操作失敗'

    // 23505: unique_violation (重複鍵)
    if (code === '23505') {
      return new ConflictError('資源已存在', { originalError: error })
    }

    // 23503: foreign_key_violation (外鍵約束)
    if (code === '23503') {
      return new ValidationError('關聯資源不存在', { originalError: error })
    }

    // 42501: insufficient_privilege (權限不足，RLS 阻擋)
    if (code === '42501' || code === 'PGRST301') {
      return new AuthorizationError('權限不足', { originalError: error })
    }

    // PGRST116: 找不到資源（單筆查詢無結果）
    if (code === 'PGRST116') {
      return new NotFoundError('找不到請求的資源', { originalError: error })
    }

    // 其他資料庫錯誤
    return new DatabaseError(message, {
      code,
      originalError: error
    })
  }

  /**
   * 檢查錯誤是否為可操作的（已知）錯誤
   *
   * @example
   * ```ts
   * try {
   *   // ...
   * } catch (error) {
   *   if (ErrorFactory.isOperational(error)) {
   *     // 已知錯誤，可以安全處理
   *   } else {
   *     // 未知錯誤，需要記錄並警報
   *   }
   * }
   * ```
   */
  static isOperational(error: unknown): boolean {
    if (error instanceof BaseError) {
      return error.isOperational
    }
    return false
  }

  /**
   * 從未知錯誤創建標準錯誤
   *
   * @example
   * ```ts
   * try {
   *   JSON.parse(invalidJson)
   * } catch (error) {
   *   throw ErrorFactory.fromUnknown(error)
   * }
   * ```
   */
  static fromUnknown(error: unknown): BaseError {
    // 已經是 BaseError
    if (error instanceof BaseError) {
      return error
    }

    // 標準 Error
    if (error instanceof Error) {
      return new BaseError(
        error.message,
        500,
        'INTERNAL_SERVER_ERROR',
        false,
        { originalError: error }
      )
    }

    // 其他類型（字串、物件等）
    return new BaseError(
      String(error),
      500,
      'INTERNAL_SERVER_ERROR',
      false,
      { originalError: error }
    )
  }
}
