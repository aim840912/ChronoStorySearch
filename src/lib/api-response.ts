/**
 * 統一 API 回應格式
 *
 * 符合 CLAUDE.md 規範的標準回應格式
 * 所有 API 端點都應使用這些函數返回資料，確保前後端約定一致
 *
 * @example
 * ```ts
 * import { success, created, error } from '@/lib/api-response'
 *
 * // 成功回應
 * return success({ id: 123, name: '物品' }, '查詢成功')
 *
 * // 建立成功
 * return created({ id: 456 }, '刊登建立成功')
 *
 * // 錯誤回應
 * return error('物品不存在', 'NOT_FOUND', 404)
 * ```
 */

import { NextResponse } from 'next/server'

/**
 * 成功回應格式
 */
export interface SuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
  timestamp: string
}

/**
 * 錯誤回應格式
 */
export interface ErrorResponse {
  success: false
  error: string
  code: string
  trace_id?: string
  details?: Record<string, unknown>
  timestamp: string
}

/**
 * 分頁資訊
 */
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * 分頁回應格式
 */
export interface PaginatedResponse<T = unknown> {
  success: true
  data: T[]
  pagination: PaginationInfo
  message?: string
  timestamp: string
}

/**
 * 200 OK - 成功回應
 *
 * 用於 GET、PATCH、DELETE 等操作成功時返回
 *
 * @param data - 回應資料
 * @param message - 可選的成功訊息
 *
 * @example
 * ```ts
 * // 查詢成功
 * return success({ listings: [...] }, '查詢成功')
 *
 * // 更新成功
 * return success({ id: 123, status: 'completed' }, '刊登已完成')
 *
 * // 刪除成功
 * return success(null, '刊登已刪除')
 * ```
 */
export function success<T = unknown>(
  data: T,
  message?: string
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  )
}

/**
 * 201 Created - 建立成功回應
 *
 * 用於 POST 操作成功建立資源時返回
 *
 * @param data - 新建立的資源資料（通常包含 id）
 * @param message - 可選的成功訊息
 *
 * @example
 * ```ts
 * // 建立刊登成功
 * return created({ id: 123, item_id: 456 }, '刊登建立成功')
 *
 * // 登記意向成功
 * return created({ interest_id: 789 }, '購買意向已登記')
 * ```
 */
export function created<T = unknown>(
  data: T,
  message?: string
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    },
    { status: 201 }
  )
}

/**
 * 錯誤回應（通用）
 *
 * 用於返回各種錯誤狀態（400, 401, 403, 404, 500 等）
 *
 * @param message - 錯誤訊息（使用者可讀）
 * @param code - 錯誤代碼（大寫蛇形，如 VALIDATION_ERROR）
 * @param status - HTTP 狀態碼
 * @param trace_id - 可選的追蹤 ID（用於日誌追蹤）
 * @param details - 可選的錯誤詳細資訊
 *
 * @example
 * ```ts
 * // 驗證錯誤
 * return error('價格必須大於 0', 'VALIDATION_ERROR', 400)
 *
 * // 未認證
 * return error('需要登入', 'UNAUTHORIZED', 401)
 *
 * // 權限不足
 * return error('需要管理員權限', 'FORBIDDEN', 403)
 *
 * // 資源不存在
 * return error('找不到該刊登', 'NOT_FOUND', 404)
 *
 * // 伺服器錯誤（帶追蹤 ID）
 * return error('系統錯誤', 'INTERNAL_SERVER_ERROR', 500, 'trace-123')
 * ```
 */
export function error(
  message: string,
  code: string,
  status: number,
  trace_id?: string,
  details?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      trace_id,
      details,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

/**
 * 分頁成功回應
 *
 * 用於返回分頁資料（如市場列表、我的刊登等）
 *
 * @param data - 當前頁的資料陣列
 * @param pagination - 分頁資訊
 * @param message - 可選的成功訊息
 *
 * @example
 * ```ts
 * const listings = [...] // 當前頁資料
 * const total = 100 // 總筆數
 * const page = 1
 * const limit = 20
 *
 * return successWithPagination(listings, {
 *   page,
 *   limit,
 *   total,
 *   totalPages: Math.ceil(total / limit),
 *   hasNext: page * limit < total,
 *   hasPrev: page > 1
 * }, '查詢成功')
 * ```
 */
export function successWithPagination<T = unknown>(
  data: T[],
  pagination: PaginationInfo,
  message?: string
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination,
      message,
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  )
}

/**
 * 工具函數：計算分頁資訊
 *
 * @param page - 當前頁碼（從 1 開始）
 * @param limit - 每頁筆數
 * @param total - 總筆數
 *
 * @example
 * ```ts
 * const total = 100
 * const page = 2
 * const limit = 20
 *
 * const pagination = calculatePagination(page, limit, total)
 * // {
 * //   page: 2,
 * //   limit: 20,
 * //   total: 100,
 * //   totalPages: 5,
 * //   hasNext: true,
 * //   hasPrev: true
 * // }
 * ```
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit)

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }
}

/**
 * 工具函數：解析查詢參數中的分頁資訊
 *
 * @param searchParams - URL 查詢參數
 * @param defaultLimit - 預設每頁筆數（預設 20）
 * @param maxLimit - 最大每頁筆數（預設 50）
 *
 * @example
 * ```ts
 * const { searchParams } = new URL(request.url)
 * const { page, limit, offset } = parsePaginationParams(searchParams)
 *
 * const { data, count } = await supabase
 *   .from('listings')
 *   .select('*', { count: 'exact' })
 *   .range(offset, offset + limit - 1)
 * ```
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit = 20,
  maxLimit = 50
): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit), 10))
  )
  const offset = (page - 1) * limit

  return { page, limit, offset }
}
