import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Supabase 客戶端（用於瀏覽器端）
 *
 * 使用 ANON_KEY，配合 Row Level Security (RLS) 使用。
 * 此客戶端可安全地在瀏覽器中使用。
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
