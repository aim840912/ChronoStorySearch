import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase Auth Middleware
 *
 * 處理每個請求的 session cookie：
 * - 讀取現有的 session
 * - 刷新即將過期的 token
 * - 將更新的 session 寫回 cookie
 *
 * 可透過環境變數控制：
 * - NEXT_PUBLIC_AUTH_ENABLED=false: 停止認證功能
 * - NEXT_PUBLIC_MIDDLEWARE_ENABLED=false: 停止 Middleware 執行
 */
export async function middleware(request: NextRequest) {
  // 檢查開關：任一關閉時直接放行，不執行 Supabase 調用
  const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'false'
  const middlewareEnabled = process.env.NEXT_PUBLIC_MIDDLEWARE_ENABLED !== 'false'

  if (!authEnabled || !middlewareEnabled) {
    return NextResponse.next({ request })
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 刷新 session（如果需要）
  // 注意：必須使用 getUser() 而非 getSession()，因為 getUser() 會驗證 token
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // 排除靜態資源和圖片
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
