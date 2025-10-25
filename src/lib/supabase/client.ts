/**
 * Supabase 客戶端（瀏覽器端）
 *
 * 用於客戶端元件的 Supabase 操作
 * 使用 ANON_KEY，受 Row Level Security (RLS) 限制
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

/**
 * 瀏覽器端 Supabase 客戶端
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
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
