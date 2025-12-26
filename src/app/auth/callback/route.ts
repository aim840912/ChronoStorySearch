import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * OAuth Callback Handler
 *
 * 處理 Discord OAuth 回調，交換 authorization code 為 session token。
 * 使用 @supabase/ssr 的 server client 將 session 存入 HttpOnly cookie。
 *
 * 錯誤處理：
 * - OAuth 錯誤（用戶拒絕授權）：重導向到首頁並帶上 auth_error 參數
 * - 交換 session 失敗：記錄錯誤並重導向到首頁
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  // 處理 OAuth 錯誤（例如用戶拒絕授權）
  if (error) {
    console.error('[Auth Callback] OAuth error:', error, errorDescription)
    const redirectUrl = new URL(origin)
    redirectUrl.searchParams.set('auth_error', error)
    if (errorDescription) {
      redirectUrl.searchParams.set('auth_error_description', errorDescription)
    }
    return NextResponse.redirect(redirectUrl)
  }

  // 沒有 code 也沒有 error，可能是直接訪問此 URL
  if (!code) {
    console.warn('[Auth Callback] No code or error in callback')
    return NextResponse.redirect(origin)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // 交換 code 為 session，session 會自動存入 cookie
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[Auth Callback] Exchange error:', exchangeError.message)
    const redirectUrl = new URL(origin)
    redirectUrl.searchParams.set('auth_error', 'exchange_failed')
    return NextResponse.redirect(redirectUrl)
  }

  // 成功，重導向回首頁
  return NextResponse.redirect(origin)
}
