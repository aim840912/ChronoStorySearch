/**
 * 診斷用戶刊登配額計數器問題
 *
 * 使用方式：npx tsx scripts/diagnose-user-quota.ts
 */

import { createClient } from '@supabase/supabase-js'

// 讀取環境變數
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的環境變數')
  console.error('   請確認 .env.local 中有以下變數：')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 建立 Supabase 客戶端
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 定義查詢結果類型
interface QuotaWithUser {
  user_id: string
  active_listings_count: number
  users: {
    email: string
    discord_username: string | null
  } | null
}

async function diagnoseQuota() {
  console.log('🔍 開始診斷刊登配額計數器...\n')

  try {
    // 1. 獲取所有用戶的配額記錄（包含用戶 email）
    const { data: quotas, error: quotaError } = await supabase
      .from('user_quotas')
      .select(`
        user_id,
        active_listings_count,
        users!inner(email, discord_username)
      `)
      .returns<QuotaWithUser[]>()

    if (quotaError) {
      throw new Error(`查詢 user_quotas 失敗: ${quotaError.message}`)
    }

    console.log(`📊 找到 ${quotas.length} 個用戶配額記錄\n`)

    // 2. 檢查每個用戶的實際刊登數
    const issues: Array<{
      user_id: string
      email: string
      discord_username: string | null
      recorded_count: number
      actual_count: number
      total_count: number
      difference: number
    }> = []

    for (const quota of quotas) {
      // 查詢實際的活躍刊登數
      const { count: actualCount, error: listingError } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', quota.user_id)
        .eq('status', 'active')

      if (listingError) {
        console.error(`⚠️  查詢用戶 ${quota.user_id} 的刊登失敗:`, listingError)
        continue
      }

      // 同時查詢所有狀態的刊登數（用於診斷）
      const { count: totalCount } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', quota.user_id)

      const recordedCount = quota.active_listings_count
      const actual = actualCount || 0
      const total = totalCount || 0
      const difference = recordedCount - actual

      if (difference !== 0) {
        issues.push({
          user_id: quota.user_id,
          email: quota.users?.email || 'unknown',
          discord_username: quota.users?.discord_username || null,
          recorded_count: recordedCount,
          actual_count: actual,
          total_count: total,
          difference
        })
      }
    }

    // 3. 顯示診斷結果
    if (issues.length === 0) {
      console.log('✅ 所有用戶的配額計數器都是準確的！')
    } else {
      console.log(`⚠️  發現 ${issues.length} 個計數器不同步的用戶：\n`)

      for (const issue of issues) {
        console.log(`👤 用戶: ${issue.email}${issue.discord_username ? ` (@${issue.discord_username})` : ''}`)
        console.log(`   用戶 ID: ${issue.user_id}`)
        console.log(`   記錄的計數: ${issue.recorded_count}`)
        console.log(`   實際活躍數: ${issue.actual_count}`)
        console.log(`   總刊登數: ${issue.total_count}`)
        console.log(`   差異: ${issue.difference > 0 ? '+' : ''}${issue.difference} (${issue.difference > 0 ? '多計' : '少計'})`)
        console.log()
      }

      console.log('💡 建議執行修復腳本：npx tsx scripts/fix-user-quota.ts')
    }

    // 4. 檢查系統配額設定
    console.log('\n📋 系統配額設定：')
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('key, value')
      .eq('key', 'max_active_listings_per_user')
      .single()

    if (settingsError) {
      console.log('   ⚠️  無法讀取配額設定')
    } else {
      console.log(`   最大活躍刊登數: ${settings.value}`)
    }

  } catch (error) {
    console.error('\n❌ 診斷失敗：', error)
    process.exit(1)
  }
}

// 執行診斷
diagnoseQuota()
