/**
 * 臨時 script：新增 max_active_listings_per_user 設定到資料庫
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// 手動載入 .env.local
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=')
    if (key) {
      const value = valueParts.join('=').trim()
      envVars[key] = value
    }
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('錯誤：缺少環境變數')
  console.error('SUPABASE_URL:', supabaseUrl ? '已設定' : '未設定')
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '已設定' : '未設定')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addMaxListingsSetting() {
  console.log('正在新增 max_active_listings_per_user 設定...')

  // 檢查是否已存在
  const { data: existing, error: checkError } = await supabase
    .from('system_settings')
    .select('*')
    .eq('key', 'max_active_listings_per_user')
    .maybeSingle()

  if (checkError) {
    console.error('檢查設定失敗:', checkError)
    process.exit(1)
  }

  if (existing) {
    console.log('設定已存在:', existing)
    console.log('目前值:', existing.value)
    return
  }

  // 插入新設定
  const { data, error } = await supabase
    .from('system_settings')
    .insert({
      key: 'max_active_listings_per_user',
      value: 5,
      description: '每個用戶可以建立的最大活躍刊登數量'
    })
    .select()
    .single()

  if (error) {
    console.error('新增設定失敗:', error)
    process.exit(1)
  }

  console.log('設定新增成功:', data)
}

addMaxListingsSetting()
  .then(() => {
    console.log('完成！')
    process.exit(0)
  })
  .catch((error) => {
    console.error('執行失敗:', error)
    process.exit(1)
  })
