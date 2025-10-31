/**
 * 原始資料庫查詢 - 檢查配額相關的所有資料
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function rawCheck() {
  console.log('🔍 原始資料庫查詢...\n')

  try {
    // 1. 列出所有用戶配額
    console.log('📊 User Quotas 表：')
    const { data: quotas, error: quotaError } = await supabase
      .from('user_quotas')
      .select('*')
      .order('updated_at', { ascending: false })

    if (quotaError) {
      console.error('錯誤：', quotaError)
    } else {
      quotas.forEach(quota => {
        console.log(`  用戶 ID: ${quota.user_id}`)
        console.log(`    active_listings_count: ${quota.active_listings_count}`)
        console.log(`    created_at: ${quota.created_at}`)
        console.log(`    updated_at: ${quota.updated_at}`)
        console.log()
      })
    }

    // 2. 列出所有活躍刊登
    console.log('\n📋 Active Listings：')
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, seller_id, title, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (listingsError) {
      console.error('錯誤：', listingsError)
    } else {
      console.log(`總共 ${listings.length} 筆活躍刊登：`)
      listings.forEach(listing => {
        console.log(`  ${listing.id}: ${listing.title}`)
        console.log(`    seller_id: ${listing.seller_id}`)
        console.log(`    created_at: ${listing.created_at}`)
        console.log()
      })
    }

    // 3. 按用戶統計活躍刊登數
    console.log('\n📈 按用戶統計活躍刊登數：')
    const { data: counts, error: countsError } = await supabase
      .rpc('count_active_listings_by_user')

    if (countsError) {
      // RPC 可能不存在，改用手動統計
      console.log('  (使用手動統計)')
      if (listings) {
        const userCounts: Record<string, number> = {}
        listings.forEach(listing => {
          userCounts[listing.seller_id] = (userCounts[listing.seller_id] || 0) + 1
        })
        Object.entries(userCounts).forEach(([userId, count]) => {
          console.log(`  ${userId}: ${count} 筆`)
        })
      }
    } else {
      counts.forEach((row: any) => {
        console.log(`  ${row.seller_id}: ${row.count} 筆`)
      })
    }

    // 4. 檢查系統設定
    console.log('\n⚙️  系統設定：')
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')

    if (settingsError) {
      console.error('錯誤：', settingsError)
    } else {
      settings.forEach(setting => {
        if (setting.key.includes('listing') || setting.key.includes('quota')) {
          console.log(`  ${setting.key}: ${setting.value}`)
          console.log(`    description: ${setting.description}`)
        }
      })
    }

  } catch (error) {
    console.error('\n❌ 查詢失敗：', error)
    process.exit(1)
  }
}

rawCheck()
