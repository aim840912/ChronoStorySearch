/**
 * API 認證中間件
 *
 * 提供三種認證層級：
 * - requireAuth: 需要使用者登入
 * - requireAdmin: 需要管理員權限
 * - optionalAuth: 可選認證（公開 API 但可能需要使用者資訊）
 *
 * 以及三種組合中間件：
 * - withAuthAndError: 認證 + 錯誤處理
 * - withAdminAndError: 管理員認證 + 錯誤處理
 * - withOptionalAuthAndError: 可選認證 + 錯誤處理
 *
 * 使用方式:
 * ```ts
 * export const POST = withAuthAndError(handlePOST, { module: 'ListingAPI' })
 * async function handlePOST(request: NextRequest, user: User) { ... }
 * ```
 *
 * 參考:
 * - CLAUDE.md - API 中間件架構
 * - docs/architecture/交易系統/03-API設計.md
 */

import { NextRequest } from 'next/server'
import { validateSession, User } from '@/lib/auth/session-validator'
import { withErrorHandler, ErrorHandlerOptions } from './error-handler'
import { UnauthorizedError, AuthorizationError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { dbLogger } from '@/lib/logger'

// 重新導出 User 類型供 API 路由使用
export type { User } from '@/lib/auth/session-validator'

/**
 * 認證中間件: 需要使用者登入
 *
 * 功能：
 * 1. 呼叫 validateSession 驗證 session
 * 2. 檢查 valid 和 user
 * 3. 檢查 banned 狀態
 * 4. 傳遞 user 給 handler
 *
 * @param handler - API 處理函數（接收 request 和 user）
 * @returns 包裝後的 API 處理函數
 *
 * @example
 * ```ts
 * async function handlePOST(request: NextRequest, user: User) {
 *   // user 一定存在且已驗證
 *   const data = await req.json()
 *   return success({ userId: user.id })
 * }
 *
 * export const POST = requireAuth(handlePOST)
 * ```
 */
export function requireAuth(
  handler: (request: NextRequest, user: User, ...args: any[]) => Promise<Response> // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  return async (request: NextRequest, ...args: any[]): Promise<Response> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      // 1. 呼叫 validateSession
      const { valid, user } = await validateSession(request)

      // 2. 檢查 valid 和 user
      if (!valid || !user) {
        dbLogger.debug('Authentication failed: invalid session or user not found')
        throw new UnauthorizedError('需要登入才能使用此功能')
      }

      // 3. 檢查 banned 狀態（validateSession 已檢查，但這裡再次確認）
      if (user.banned) {
        dbLogger.info('Authentication failed: user is banned', { user_id: user.id })
        throw new AuthorizationError('您的帳號已被封禁')
      }

      // 4. 傳遞 user 給 handler
      return await handler(request, user, ...args)
    } catch (error) {
      // 如果是已知錯誤（UnauthorizedError, AuthorizationError），直接拋出
      // withErrorHandler 會處理
      throw error
    }
  }
}

/**
 * 認證中間件: 需要管理員權限
 *
 * 功能：
 * 1. 先呼叫 requireAuth
 * 2. 檢查使用者是否為管理員
 *   - 檢查 discord_profiles.server_roles 是否包含 'Admin' 或 'Moderator'
 *   - 或使用專門的 admin 欄位（未來擴展）
 * 3. 傳遞 user 給 handler
 *
 * @param handler - API 處理函數（接收 request 和 user）
 * @returns 包裝後的 API 處理函數
 *
 * @example
 * ```ts
 * async function handleDELETE(request: NextRequest, user: User) {
 *   // user 一定是管理員
 *   return success(null, '刊登已刪除')
 * }
 *
 * export const DELETE = requireAdmin(handleDELETE)
 * ```
 */
export function requireAdmin(
  handler: (request: NextRequest, user: User, ...args: any[]) => Promise<Response> // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  return async (request: NextRequest, ...args: any[]): Promise<Response> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      // 1. 先呼叫 requireAuth
      const { valid, user } = await validateSession(request)

      if (!valid || !user) {
        dbLogger.debug('Admin authentication failed: invalid session')
        throw new UnauthorizedError('需要登入才能使用此功能')
      }

      if (user.banned) {
        dbLogger.info('Admin authentication failed: user is banned', { user_id: user.id })
        throw new AuthorizationError('您的帳號已被封禁')
      }

      // 2. 檢查是否為管理員
      // 查詢 discord_profiles 表的 server_roles
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('discord_profiles')
        .select('server_roles')
        .eq('user_id', user.id)
        .single()

      if (profileError) {
        dbLogger.debug('Admin authentication failed: discord profile not found', {
          user_id: user.id,
          error: profileError
        })
        // 如果找不到 discord_profiles，視為非管理員
        throw new AuthorizationError('需要管理員權限')
      }

      // 檢查 server_roles 是否包含 'Admin' 或 'Moderator'
      const isAdmin =
        Array.isArray(profile.server_roles) &&
        (profile.server_roles.includes('Admin') ||
          profile.server_roles.includes('Moderator'))

      if (!isAdmin) {
        dbLogger.info('Admin authentication failed: user is not admin', {
          user_id: user.id,
          roles: profile.server_roles
        })
        throw new AuthorizationError('需要管理員權限')
      }

      // 3. 傳遞 user 給 handler
      dbLogger.debug('Admin authentication successful', { user_id: user.id })
      return await handler(request, user, ...args)
    } catch (error) {
      throw error
    }
  }
}

/**
 * 認證中間件: 可選認證 (公開 API 但可能需要使用者資訊)
 *
 * 功能：
 * 1. 呼叫 validateSession
 * 2. 如果 valid = true, 傳遞 user
 * 3. 如果 valid = false, 傳遞 null
 * 4. 無論如何都執行 handler
 *
 * @param handler - API 處理函數（接收 request 和 user | null）
 * @returns 包裝後的 API 處理函數
 *
 * @example
 * ```ts
 * async function handleGET(request: NextRequest, user: User | null) {
 *   // user 可能為 null（未登入）
 *   if (user) {
 *     // 已登入：返回個人化資料
 *     return success({ items: [...], userId: user.id })
 *   } else {
 *     // 未登入：返回公開資料
 *     return success({ items: [...] })
 *   }
 * }
 *
 * export const GET = optionalAuth(handleGET)
 * ```
 */
export function optionalAuth(
  handler: (request: NextRequest, user: User | null, ...args: any[]) => Promise<Response> // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  return async (request: NextRequest, ...args: any[]): Promise<Response> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      // 1. 呼叫 validateSession
      const { valid, user } = await validateSession(request)

      // 2-4. 傳遞 user 或 null，無論如何都執行 handler
      return await handler(request, valid ? user : null, ...args)
    } catch (error) {
      // 對於 optionalAuth，即使驗證失敗也繼續執行
      // 傳遞 null 作為 user
      dbLogger.debug('Optional auth failed, continuing with user=null', { error })
      return await handler(request, null, ...args)
    }
  }
}

/**
 * 組合中間件: 認證 + 錯誤處理
 *
 * 推薦使用此函數而非手動組合
 *
 * @param handler - API 處理函數（接收 request 和 user）
 * @param options - 錯誤處理選項（module, enableAuditLog）
 * @returns 包裝後的 API 處理函數
 *
 * @example
 * ```ts
 * async function handlePOST(request: NextRequest, user: User) {
 *   const data = await request.json()
 *   // ... 業務邏輯
 *   return created(result, '建立成功')
 * }
 *
 * export const POST = withAuthAndError(handlePOST, {
 *   module: 'ListingAPI',
 *   enableAuditLog: true
 * })
 * ```
 */
export function withAuthAndError(
  handler: (request: NextRequest, user: User, ...args: any[]) => Promise<Response>, // eslint-disable-line @typescript-eslint/no-explicit-any
  options: ErrorHandlerOptions
) {
  // 先套用 requireAuth，再套用 withErrorHandler
  return withErrorHandler(requireAuth(handler), options)
}

/**
 * 組合中間件: 管理員認證 + 錯誤處理
 *
 * 推薦使用此函數而非手動組合
 *
 * @param handler - API 處理函數（接收 request 和 user）
 * @param options - 錯誤處理選項（module, enableAuditLog）
 * @returns 包裝後的 API 處理函數
 *
 * @example
 * ```ts
 * async function handleDELETE(request: NextRequest, user: User) {
 *   // user 一定是管理員
 *   await deleteAllListings()
 *   return success(null, '所有刊登已刪除')
 * }
 *
 * export const DELETE = withAdminAndError(handleDELETE, {
 *   module: 'AdminAPI',
 *   enableAuditLog: true
 * })
 * ```
 */
export function withAdminAndError(
  handler: (request: NextRequest, user: User, ...args: any[]) => Promise<Response>, // eslint-disable-line @typescript-eslint/no-explicit-any
  options: ErrorHandlerOptions
) {
  // 先套用 requireAdmin，再套用 withErrorHandler
  return withErrorHandler(requireAdmin(handler), options)
}

/**
 * 組合中間件: 可選認證 + 錯誤處理
 *
 * 推薦使用此函數而非手動組合
 *
 * @param handler - API 處理函數（接收 request 和 user | null）
 * @param options - 錯誤處理選項（module, enableAuditLog）
 * @returns 包裝後的 API 處理函數
 *
 * @example
 * ```ts
 * async function handleGET(request: NextRequest, user: User | null) {
 *   if (user) {
 *     // 已登入：返回個人化資料
 *     return success({ items: [...], userId: user.id })
 *   }
 *   // 未登入：返回公開資料
 *   return success({ items: [...] })
 * }
 *
 * export const GET = withOptionalAuthAndError(handleGET, {
 *   module: 'MarketAPI'
 * })
 * ```
 */
export function withOptionalAuthAndError(
  handler: (request: NextRequest, user: User | null, ...args: any[]) => Promise<Response>, // eslint-disable-line @typescript-eslint/no-explicit-any
  options: ErrorHandlerOptions
) {
  // 先套用 optionalAuth，再套用 withErrorHandler
  return withErrorHandler(optionalAuth(handler), options)
}
