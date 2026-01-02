import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * 生成 popup 關閉頁面的 HTML
 */
function createPopupHtml(success: boolean, errorMessage?: string): string {
  const statusIcon = success
    ? `<div style="width:48px;height:48px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg width="24" height="24" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
       </div>`
    : `<div style="width:48px;height:48px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg width="24" height="24" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
       </div>`

  const message = success ? '登入成功！' : '登入失敗'
  const subMessage = success ? '視窗即將關閉...' : (errorMessage || '發生錯誤，請重試')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${message}</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;background:#f9fafb}
    @media(prefers-color-scheme:dark){body{background:#111827}}
    .card{text-align:center;padding:32px}
    .title{color:#111827;font-size:16px;font-weight:500;margin:0 0 4px}
    .sub{color:#6b7280;font-size:14px;margin:0}
    @media(prefers-color-scheme:dark){.title{color:#f3f4f6}.sub{color:#9ca3af}}
  </style>
</head>
<body>
  <div class="card">
    ${statusIcon}
    <p class="title">${message}</p>
    <p class="sub">${subMessage}</p>
  </div>
  <script>
    ${success ? `if(window.opener){window.opener.postMessage({type:'AUTH_SUCCESS'},'*');}` : ''}
    setTimeout(function(){window.close()},${success ? 800 : 2000});
  </script>
</body>
</html>`
}

/**
 * OAuth Callback Handler
 *
 * 處理 Discord OAuth 回調，交換 authorization code 為 session token。
 * 使用 @supabase/ssr 的 server client 將 session 存入 HttpOnly cookie。
 *
 * 支援 popup 模式：
 * - 帶 popup=true 參數時，返回 HTML 頁面並自動關閉視窗
 * - 一般模式時，重導向回首頁
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
  const isPopup = requestUrl.searchParams.get('popup') === 'true'
  const origin = requestUrl.origin

  // 處理 OAuth 錯誤（例如用戶拒絕授權）
  if (error) {
    console.error('[Auth Callback] OAuth error:', error, errorDescription)

    if (isPopup) {
      const errorMsg = error === 'access_denied' ? '您取消了授權' : (errorDescription ?? undefined)
      return new NextResponse(createPopupHtml(false, errorMsg), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

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
    if (isPopup) {
      return new NextResponse(createPopupHtml(false, '無效的回調請求'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
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

    if (isPopup) {
      return new NextResponse(createPopupHtml(false, '認證失敗，請重試'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const redirectUrl = new URL(origin)
    redirectUrl.searchParams.set('auth_error', 'exchange_failed')
    return NextResponse.redirect(redirectUrl)
  }

  // 成功
  if (isPopup) {
    return new NextResponse(createPopupHtml(true), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return NextResponse.redirect(origin)
}
