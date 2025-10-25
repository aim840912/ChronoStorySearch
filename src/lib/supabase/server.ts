/**
 * Supabase 伺服器端客戶端
 *
 * 用於 API 路由和伺服器元件的 Supabase 操作
 * 使用 SERVICE_ROLE_KEY，可繞過 Row Level Security (RLS)
 *
 * ⚠️ 注意：此客戶端擁有完整資料庫權限，僅能在伺服器端使用
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  )
}

/**
 * 伺服器端 Supabase 客戶端（繞過 RLS）
 *
 * ⚠️ 警告：此客戶端擁有完整權限，請謹慎使用
 *
 * @example
 * ```ts
 * import { supabaseAdmin } from '@/lib/supabase/server'
 *
 * // API Route
 * export async function GET() {
 *   const { data } = await supabaseAdmin
 *     .from('users')
 *     .select('*')
 *
 *   return Response.json(data)
 * }
 * ```
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * 伺服器端 Supabase 客戶端（遵守 RLS）
 *
 * 用於需要 RLS 保護的伺服器端操作
 *
 * @example
 * ```ts
 * import { supabaseServer } from '@/lib/supabase/server'
 *
 * const { data } = await supabaseServer
 *   .from('listings')
 *   .select('*')
 *   .eq('user_id', userId)
 * ```
 */
export const supabaseServer = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
