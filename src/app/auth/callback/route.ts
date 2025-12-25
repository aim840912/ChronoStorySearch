import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * OAuth Callback Handler
 *
 * 處理 Discord OAuth 回調，交換 authorization code 為 session token。
 * Supabase 會在 URL 中附加 code 參數，我們需要用它來取得 session。
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 交換 code 為 session
    await supabase.auth.exchangeCodeForSession(code)
  }

  // 重導向回首頁
  return NextResponse.redirect(origin)
}
