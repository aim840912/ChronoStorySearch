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
import { createClient } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'

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
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // 確定正確的 base URL
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : origin || 'http://localhost:3000'

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

    // 成功登入
    apiLogger.info('User logged in via Supabase Auth', {
      user_id: data.user?.id,
      email: data.user?.email,
      provider: 'discord'
    })

    return NextResponse.redirect(new URL('/', baseUrl))
  } catch (error) {
    apiLogger.error('OAuth callback processing failed', { error })
    return NextResponse.redirect(
      new URL(`/?error=oauth_failed&message=${encodeURIComponent('處理授權回調時發生錯誤')}`, baseUrl)
    )
  }
}
