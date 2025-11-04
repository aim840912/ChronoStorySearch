/**
 * Supabase Auth OAuth 回調端點
 *
 * GET /api/auth/callback
 *
 * 功能：
 * 1. 接收 Supabase Auth 的 OAuth 回調
 * 2. 用 code 交換 session（由 Supabase 自動處理）
 * 3. 設置 session cookie（由 Supabase SSR 自動處理）
 * 4. 重導向至首頁
 *
 * 參考文件：
 * - https://supabase.com/docs/guides/auth/server-side/nextjs
 * - https://supabase.com/docs/guides/auth/social-login/auth-discord
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger, dbLogger } from '@/lib/logger'
import { getBaseUrl } from '@/lib/env/url-config'
import type { User } from '@supabase/supabase-js'

/**
 * 同步 Supabase Auth 用戶到 users 和 discord_profiles 表
 *
 * @param user - Supabase Auth User 物件
 */
async function syncUserToDatabase(user: User) {
  const userId = user.id
  const metadata = user.user_metadata || {}

  // 提取 Discord 資訊
  const discordId = metadata.provider_id || metadata.sub
  const discordUsername = metadata.name || metadata.full_name || 'Unknown'
  // 嘗試多個可能的 avatar 欄位名稱
  const discordAvatar = metadata.avatar_url || metadata.avatar || metadata.picture || null
  const email = user.email || metadata.email

  if (!discordId) {
    throw new Error('Missing Discord ID in user metadata')
  }

  dbLogger.debug('Syncing user to database', {
    user_id: userId,
    discord_id: discordId,
    discord_avatar: discordAvatar,
    email,
    metadata_keys: Object.keys(metadata)
  })

  // 檢查用戶是否已存在
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (existingUser) {
    // 用戶已存在，只更新 last_login_at
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      dbLogger.error('Failed to update user last_login_at', {
        user_id: userId,
        error: updateError
      })
    } else {
      dbLogger.info('Updated user last_login_at', { user_id: userId })
    }
    return
  }

  // 用戶不存在，建立新記錄
  dbLogger.info('Creating new user record', {
    user_id: userId,
    discord_id: discordId
  })

  // 1. 插入 users 表
  const { error: userInsertError } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      discord_id: discordId,
      discord_username: discordUsername,
      discord_discriminator: '0', // Discord 已移除 discriminator
      discord_avatar: discordAvatar,
      email: email,
      last_login_at: new Date().toISOString()
    })

  if (userInsertError) {
    dbLogger.error('Failed to insert user', {
      user_id: userId,
      error: userInsertError
    })
    throw new Error(`Failed to create user record: ${userInsertError.message}`)
  }

  // 2. 插入 discord_profiles 表
  // 從 Discord Snowflake ID 計算帳號建立時間
  const discordEpoch = 1420070400000 // Discord epoch (2015-01-01)
  const snowflakeTimestamp = Number(BigInt(discordId) >> BigInt(22)) + discordEpoch
  const accountCreatedAt = new Date(snowflakeTimestamp).toISOString()

  const { error: profileInsertError } = await supabaseAdmin
    .from('discord_profiles')
    .insert({
      user_id: userId,
      account_created_at: accountCreatedAt,
      server_roles: [],
      verified: false,
      reputation_score: 50, // 預設信譽分數
      profile_privacy: 'public'
    })

  if (profileInsertError) {
    dbLogger.error('Failed to insert discord profile', {
      user_id: userId,
      error: profileInsertError
    })
    // 不拋出錯誤，因為 users 表已經建立成功
  } else {
    dbLogger.info('Created new user and discord profile', {
      user_id: userId,
      discord_id: discordId
    })
  }
}

/**
 * GET /api/auth/callback
 *
 * 處理 Supabase OAuth 回調
 *
 * 流程：
 * 1. 檢查 URL 參數（code 或 error）
 * 2. 如果有 error，重導向至首頁並顯示錯誤
 * 3. 如果有 code，用 code 交換 session
 * 4. 成功後重導向至首頁
 *
 * @example
 * Discord 回調：/api/auth/callback?code=xxx&state=xxx
 * 成功重導向：/
 * 失敗重導向：/?error=oauth_failed
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // 確定正確的 base URL（使用當前部署環境的 URL）
  // 這確保預覽部署使用預覽 URL，生產部署使用生產 URL
  const baseUrl = getBaseUrl()

  // 用戶拒絕授權或其他錯誤
  if (error) {
    apiLogger.warn('OAuth callback error', { error, errorDescription })
    return NextResponse.redirect(
      new URL(`/?error=${error}&message=${encodeURIComponent(errorDescription || '授權失敗')}`, baseUrl)
    )
  }

  // 沒有 code，異常情況
  if (!code) {
    apiLogger.warn('OAuth callback missing code parameter')
    return NextResponse.redirect(new URL('/?error=oauth_failed&message=缺少授權碼', baseUrl))
  }

  try {
    const supabase = await createClient()

    // 用 code 交換 session
    // Supabase 會自動設置 cookie
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      apiLogger.error('Code exchange failed', { error: exchangeError })
      return NextResponse.redirect(
        new URL(`/?error=oauth_failed&message=${encodeURIComponent(exchangeError.message)}`, baseUrl)
      )
    }

    if (!data.user) {
      apiLogger.error('No user data after code exchange')
      return NextResponse.redirect(
        new URL('/?error=oauth_failed&message=無法取得用戶資訊', baseUrl)
      )
    }

    // 同步用戶資料到 users 和 discord_profiles 表
    try {
      await syncUserToDatabase(data.user)
    } catch (syncError) {
      apiLogger.error('Failed to sync user to database', {
        error: syncError,
        user_id: data.user.id
      })
      // 繼續執行，不阻斷登入流程
    }

    // 驗證用戶角色（僅允許管理員登入）
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('discord_profiles')
      .select('server_roles')
      .eq('user_id', data.user.id)
      .single()

    if (profileError) {
      apiLogger.error('Failed to fetch user profile for role check', {
        user_id: data.user.id,
        error: profileError
      })
    }

    // 檢查是否為管理員
    const serverRoles = profile?.server_roles || []
    const isAdmin = Array.isArray(serverRoles) &&
      (serverRoles.includes('Admin') || serverRoles.includes('Moderator'))

    if (!isAdmin) {
      // 非管理員 - 拒絕登入
      apiLogger.warn('Non-admin user attempted to login', {
        user_id: data.user.id,
        discord_id: data.user.user_metadata?.provider_id,
        roles: serverRoles
      })

      // 登出 Supabase Auth session
      await supabase.auth.signOut()

      // 重導向至管理員登入頁，帶上錯誤訊息
      return NextResponse.redirect(
        new URL('/admin/login?error=unauthorized&message=admin_only', baseUrl)
      )
    }

    // 管理員登入成功
    apiLogger.info('Admin user logged in via Supabase Auth', {
      user_id: data.user?.id,
      email: data.user?.email,
      provider: 'discord',
      roles: serverRoles
    })

    return NextResponse.redirect(new URL('/', baseUrl))
  } catch (error) {
    apiLogger.error('OAuth callback processing failed', { error })
    return NextResponse.redirect(
      new URL(`/?error=oauth_failed&message=${encodeURIComponent('處理授權回調時發生錯誤')}`, baseUrl)
    )
  }
}
