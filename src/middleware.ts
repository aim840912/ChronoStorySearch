import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase Auth Middleware
 *
 * 處理每個請求的 session cookie：
 * - 讀取現有的 session
 * - 刷新即將過期的 token
 * - 將更新的 session 寫回 cookie
 */
export async function middleware(request: NextRequest) {
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
