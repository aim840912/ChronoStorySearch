/**
 * API 認證中間件（使用 Supabase Auth）
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
 * - https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { withErrorHandler, ErrorHandlerOptions } from './error-handler'
import { UnauthorizedError, AuthorizationError } from '@/lib/errors'
import { dbLogger } from '@/lib/logger'

/**
 * 用戶資訊介面（與 Supabase Auth 整合）
 */
export interface User {
  id: string
  discord_id: string
  discord_username: string
  discord_discriminator: string
  discord_avatar: string | null
  email: string | null
  banned: boolean
  last_login_at: string
  created_at: string
  session_id: string // 保留向後相容（Supabase 管理 session，設為空字串）
  access_token: string // Discord OAuth access token（從 Supabase Auth session 取得）
}

/**
 * 認證中間件: 需要使用者登入（使用 Supabase Auth）
 *
 * 功能：
 * 1. 從 Supabase Auth 取得當前用戶
 * 2. 從資料庫查詢完整用戶資料
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
      // 1. 從 Supabase Auth 取得當前用戶和 session
      const supabase = await createClient()
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authUser) {
        dbLogger.debug('Authentication failed: no Supabase auth user')
        throw new UnauthorizedError('需要登入才能使用此功能')
      }

      // 取得 session（包含 access_token）
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.provider_token || '' // Discord OAuth access token

      // 2. 從資料庫查詢完整用戶資料
      // 先用 Supabase Auth UUID 查詢
      let { data: dbUser, error: dbError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // 如果查不到，嘗試用 discord_id 查詢（遷移場景）
      if (dbError && dbError.code === 'PGRST116') {
        const discordId = authUser.user_metadata?.provider_id || authUser.user_metadata?.sub

        if (discordId) {
          dbLogger.debug('User not found by Supabase Auth UUID, trying discord_id', {
            supabase_auth_id: authUser.id,
            discord_id: discordId
          })

          const result = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('discord_id', discordId)
            .single()

          dbUser = result.data
          dbError = result.error
        }
      }

      if (dbError || !dbUser) {
        dbLogger.error('Authentication failed: user not found in database', {
          user_id: authUser.id,
          error: dbError,
        })
        throw new UnauthorizedError('用戶不存在')
      }

      // 3. 檢查 banned 狀態
      if (dbUser.banned) {
        dbLogger.info('Authentication failed: user is banned', { user_id: dbUser.id })
        throw new AuthorizationError('您的帳號已被封禁')
      }

      // 4. 構建 User 物件（保持向後相容）
      const user: User = {
        id: dbUser.id,
        discord_id: dbUser.discord_id,
        discord_username: dbUser.discord_username,
        discord_discriminator: dbUser.discord_discriminator,
        discord_avatar: dbUser.discord_avatar,
        email: dbUser.email,
        banned: dbUser.banned,
        last_login_at: dbUser.last_login_at,
        created_at: dbUser.created_at,
        session_id: '', // Supabase 管理 session，不需要手動處理
        access_token: accessToken, // Discord OAuth access token
      }

      // 5. 傳遞 user 給 handler
      return await handler(request, user, ...args)
    } catch (error) {
      // 如果是已知錯誤（UnauthorizedError, AuthorizationError），直接拋出
      // withErrorHandler 會處理
      throw error
    }
  }
}

/**
 * 認證中間件: 需要管理員權限（使用 Supabase Auth）
 *
 * 功能：
 * 1. 從 Supabase Auth 取得當前用戶
 * 2. 從資料庫查詢完整用戶資料
 * 3. 檢查使用者是否為管理員
 *   - 檢查 discord_profiles.server_roles 是否包含 'Admin' 或 'Moderator'
 * 4. 傳遞 user 給 handler
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
      // 1. 從 Supabase Auth 取得當前用戶和 session
      const supabase = await createClient()
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authUser) {
        dbLogger.debug('Admin authentication failed: no Supabase auth user')
        throw new UnauthorizedError('需要登入才能使用此功能')
      }

      // 取得 session（包含 access_token）
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.provider_token || '' // Discord OAuth access token

      // 2. 從資料庫查詢完整用戶資料
      // 先用 Supabase Auth UUID 查詢
      let { data: dbUser, error: dbError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // 如果查不到，嘗試用 discord_id 查詢（遷移場景）
      if (dbError && dbError.code === 'PGRST116') {
        const discordId = authUser.user_metadata?.provider_id || authUser.user_metadata?.sub

        if (discordId) {
          dbLogger.debug('Admin user not found by Supabase Auth UUID, trying discord_id', {
            supabase_auth_id: authUser.id,
            discord_id: discordId
          })

          const result = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('discord_id', discordId)
            .single()

          dbUser = result.data
          dbError = result.error
        }
      }

      if (dbError || !dbUser) {
        dbLogger.error('Admin authentication failed: user not found in database', {
          user_id: authUser.id,
          error: dbError,
        })
        throw new UnauthorizedError('用戶不存在')
      }

      if (dbUser.banned) {
        dbLogger.info('Admin authentication failed: user is banned', { user_id: dbUser.id })
        throw new AuthorizationError('您的帳號已被封禁')
      }

      // 3. 檢查是否為管理員
      // 查詢 discord_profiles 表的 server_roles
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('discord_profiles')
        .select('server_roles')
        .eq('user_id', dbUser.id)
        .single()

      if (profileError) {
        dbLogger.debug('Admin authentication failed: discord profile not found', {
          user_id: dbUser.id,
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
          user_id: dbUser.id,
          roles: profile.server_roles
        })
        throw new AuthorizationError('需要管理員權限')
      }

      // 4. 構建 User 物件（保持向後相容）
      const user: User = {
        id: dbUser.id,
        discord_id: dbUser.discord_id,
        discord_username: dbUser.discord_username,
        discord_discriminator: dbUser.discord_discriminator,
        discord_avatar: dbUser.discord_avatar,
        email: dbUser.email,
        banned: dbUser.banned,
        last_login_at: dbUser.last_login_at,
        created_at: dbUser.created_at,
        session_id: '', // Supabase 管理 session，不需要手動處理
        access_token: accessToken, // Discord OAuth access token
      }

      // 5. 傳遞 user 給 handler
      dbLogger.debug('Admin authentication successful', { user_id: user.id })
      return await handler(request, user, ...args)
    } catch (error) {
      throw error
    }
  }
}

/**
 * 認證中間件: 可選認證（使用 Supabase Auth）
 *
 * 功能：
 * 1. 嘗試從 Supabase Auth 取得當前用戶
 * 2. 如果成功，從資料庫查詢完整用戶資料並傳遞
 * 3. 如果失敗，傳遞 null
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
      // 1. 嘗試從 Supabase Auth 取得當前用戶
      const supabase = await createClient()
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      // 2. 如果沒有認證用戶，傳遞 null
      if (authError || !authUser) {
        dbLogger.debug('Optional auth: no Supabase auth user, continuing with null')
        return await handler(request, null, ...args)
      }

      // 3. 從資料庫查詢完整用戶資料
      // 先用 Supabase Auth UUID 查詢
      let { data: dbUser, error: dbError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // 如果查不到，嘗試用 discord_id 查詢（遷移場景）
      if (dbError && dbError.code === 'PGRST116') {
        const discordId = authUser.user_metadata?.provider_id || authUser.user_metadata?.sub

        if (discordId) {
          dbLogger.debug('Optional auth: user not found by Supabase Auth UUID, trying discord_id', {
            supabase_auth_id: authUser.id,
            discord_id: discordId
          })

          const result = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('discord_id', discordId)
            .single()

          dbUser = result.data
          dbError = result.error
        }
      }

      // 4. 如果資料庫查詢失敗或用戶被封禁，傳遞 null
      if (dbError || !dbUser || dbUser.banned) {
        dbLogger.debug('Optional auth: user not found or banned, continuing with null', {
          user_id: authUser.id,
          db_error: dbError,
          banned: dbUser?.banned,
        })
        return await handler(request, null, ...args)
      }

      // 5. 取得 session（包含 access_token）
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.provider_token || '' // Discord OAuth access token

      // 6. 構建 User 物件並傳遞
      const user: User = {
        id: dbUser.id,
        discord_id: dbUser.discord_id,
        discord_username: dbUser.discord_username,
        discord_discriminator: dbUser.discord_discriminator,
        discord_avatar: dbUser.discord_avatar,
        email: dbUser.email,
        banned: dbUser.banned,
        last_login_at: dbUser.last_login_at,
        created_at: dbUser.created_at,
        session_id: '', // Supabase 管理 session，不需要手動處理
        access_token: accessToken, // Discord OAuth access token
      }

      return await handler(request, user, ...args)
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
