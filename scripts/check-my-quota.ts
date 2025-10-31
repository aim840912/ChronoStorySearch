/**
 * 檢查當前登入用戶的配額狀態
 *
 * 使用方式：提供您的 user_id 作為參數
 * npx tsx scripts/check-my-quota.ts <your_user_id>
 */

import { createClient } from '@supabase/supabase-js'

const userId = process.argv[2]

if (!userId) {
  console.error('❌ 請提供 user_id 參數')
  console.error('使用方式: npx tsx scripts/check-my-quota.ts <your_user_id>')
  console.error('\n您可以在瀏覽器開發工具的 localStorage 中找到 user_id')
  console.error('或者訪問 /api/auth/me 查看您的用戶資訊')
  process.exit(1)
}

// 讀取環境變數
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkQuota() {
  console.log(`🔍 檢查用戶 ${userId} 的配額狀態...\n`)

  try {
    // 1. 查詢配額記錄
    const { data: quota, error: quotaError } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (quotaError) {
      if (quotaError.code === 'PGRST116') {
        console.log('⚠️  您還沒有配額記錄（這通常在第一次建立刊登時自動建立）')
        console.log('   recorded_count: 0')
      } else {
        throw quotaError
      }
    } else {
      console.log('📊 配額記錄：')
      console.log(`   recorded_count: ${quota.active_listings_count}`)
      console.log(`   created_at: ${quota.created_at}`)
      console.log(`   updated_at: ${quota.updated_at}`)
      console.log()
    }

    // 2. 查詢實際的活躍刊登
    const { data: activeListings, error: listingsError } = await supabase
      .from('listings')
      .select('id, title, status, created_at')
      .eq('seller_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (listingsError) {
      throw listingsError
    }

    console.log(`📋 實際活躍刊登 (${activeListings.length} 筆)：`)
    if (activeListings.length === 0) {
      console.log('   （無活躍刊登）')
    } else {
      activeListings.forEach((listing, index) => {
        console.log(`   ${index + 1}. ${listing.title} (${listing.id})`)
        console.log(`      建立時間: ${new Date(listing.created_at).toLocaleString('zh-TW')}`)
      })
    }
    console.log()

    // 3. 查詢所有狀態的刊登
    const { data: allListings, error: allError } = await supabase
      .from('listings')
      .select('status')
      .eq('seller_id', userId)

    if (!allError) {
      const statusCount: Record<string, number> = {}
      allListings.forEach(listing => {
        statusCount[listing.status] = (statusCount[listing.status] || 0) + 1
      })

      console.log('📈 所有刊登狀態分佈：')
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`)
      })
      console.log()
    }

    // 4. 比較結果
    const recordedCount = quota?.active_listings_count || 0
    const actualCount = activeListings.length
    const difference = recordedCount - actualCount

    console.log('🎯 診斷結果：')
    console.log(`   記錄的計數: ${recordedCount}`)
    console.log(`   實際刊登數: ${actualCount}`)
    console.log(`   差異: ${difference}`)

    if (difference === 0) {
      console.log('   ✅ 計數器正確！')
    } else if (difference > 0) {
      console.log(`   ⚠️  計數器多計了 ${difference} 筆`)
      console.log('   💡 建議執行修復腳本')
    } else {
      console.log(`   ⚠️  計數器少計了 ${Math.abs(difference)} 筆`)
      console.log('   💡 建議執行修復腳本')
    }

    // 5. 檢查系統配額上限
    console.log('\n📋 系統配額設定：')
    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'max_active_listings_per_user')
      .single()

    if (settings) {
      console.log(`   最大活躍刊登數: ${settings.value}`)
      console.log(`   您目前可再建立: ${settings.value - actualCount} 筆`)
    }

  } catch (error) {
    console.error('\n❌ 檢查失敗：', error)
    process.exit(1)
  }
}

checkQuota()
