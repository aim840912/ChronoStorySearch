/**
 * 修復用戶刊登配額計數器同步問題
 *
 * 使用方式：npx tsx scripts/fix-quota-sync.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixQuotaSync() {
  console.log('🔧 開始修復刊登配額計數器同步問題...\n')

  try {
    // 1. 獲取所有用戶配額記錄
    const { data: quotas, error: quotaError } = await supabase
      .from('user_quotas')
      .select('user_id, active_listings_count')

    if (quotaError) {
      throw new Error(`查詢 user_quotas 失敗: ${quotaError.message}`)
    }

    console.log(`📊 找到 ${quotas.length} 個用戶配額記錄`)

    let fixed = 0
    let skipped = 0

    // 2. 為每個用戶重新計算並同步計數器
    for (const quota of quotas) {
      // 查詢實際的活躍刊登數（使用正確的欄位名稱 user_id）
      const { count: actualCount, error: listingError } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', quota.user_id)
        .eq('status', 'active')

      if (listingError) {
        console.error(`⚠️  用戶 ${quota.user_id} 查詢失敗:`, listingError.message)
        continue
      }

      const recordedCount = quota.active_listings_count
      const actual = actualCount || 0

      // 如果計數不一致，更新資料庫
      if (recordedCount !== actual) {
        console.log(`\n🔄 修復用戶 ${quota.user_id}:`)
        console.log(`   before: ${recordedCount} → after: ${actual}`)

        const { error: updateError } = await supabase
          .from('user_quotas')
          .update({
            active_listings_count: actual,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', quota.user_id)

        if (updateError) {
          console.error(`   ❌ 更新失敗:`, updateError.message)
        } else {
          console.log(`   ✅ 更新成功`)
          fixed++
        }
      } else {
        skipped++
      }
    }

    // 3. 顯示修復結果
    console.log(`\n\n📈 修復完成！`)
    console.log(`   ✅ 已修復: ${fixed} 個用戶`)
    console.log(`   ⏭️  已跳過: ${skipped} 個用戶（計數正確）`)

    if (fixed > 0) {
      console.log('\n💡 建議測試：嘗試建立新刊登，應該可以正常建立')
    }

  } catch (error) {
    console.error('\n❌ 修復失敗：', error)
    process.exit(1)
  }
}

fixQuotaSync()
