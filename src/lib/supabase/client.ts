/**
 * Supabase 客戶端（瀏覽器端）
 *
 * 用於客戶端元件的 Supabase 操作
 * 使用 ANON_KEY，受 Row Level Security (RLS) 限制
 *
 * 使用 @supabase/ssr 套件，支援 Next.js App Router 的 SSR
 */

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

/**
 * 瀏覽器端 Supabase 客戶端（舊版 API，保留向後兼容）
 *
 * @deprecated 請使用 createClient() 函數以支援 SSR
 *
 * @example
 * ```tsx
 * import { supabase } from '@/lib/supabase/client'
 *
 * const { data, error } = await supabase
 *   .from('listings')
 *   .select('*')
 *   .limit(10)
 * ```
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

/**
 * 創建瀏覽器端 Supabase 客戶端（推薦）
 *
 * 使用 @supabase/ssr 套件，支援 Supabase Auth 的 cookie 管理
 *
 * @example
 * ```tsx
 * import { createClient } from '@/lib/supabase/client'
 *
 * export default function MyComponent() {
 *   const supabase = createClient()
 *
 *   const { data: { user } } = await supabase.auth.getUser()
 *
 *   return <div>Welcome {user?.email}</div>
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
