import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase 客戶端（用於瀏覽器端）
 *
 * 使用 ANON_KEY，配合 Row Level Security (RLS) 使用。
 * 此客戶端可安全地在瀏覽器中使用。
 *
 * 使用 @supabase/ssr 的 createBrowserClient：
 * - 自動啟用 PKCE Flow
 * - 使用 cookie-based session（與 server client 共享）
 * - 不會在 URL 中產生 # 符號
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
