/**
 * 執行 Migration 020：允許相同物品但不同屬性的刊登
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 開始執行 Migration 020：允許相同物品但不同屬性的刊登...\n')

  try {
    // 讀取 migration SQL 檔案
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '020_allow_duplicate_listings_with_stats.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('📄 讀取 SQL 檔案成功')
    console.log(`📏 SQL 長度: ${sql.length} 字元\n`)

    // 分割 SQL 語句並逐一執行
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

    console.log(`📋 找到 ${statements.length} 個 SQL 語句\n`)

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]

      // 跳過註解語句
      if (stmt.includes('COMMENT ON')) {
        console.log(`⏭️  跳過註解語句 ${i + 1}/${statements.length}`)
        continue
      }

      console.log(`▶️  執行語句 ${i + 1}/${statements.length}...`)

      const { error } = await supabase.rpc('exec_sql', { sql_string: stmt + ';' })

      if (error) {
        console.error(`   ❌ 語句 ${i + 1} 執行失敗:`, error.message)
        throw error
      }

      console.log(`   ✅ 語句 ${i + 1} 執行成功`)
    }

    console.log('\n🎉 Migration 020 執行成功！')
    console.log('\n修復內容：')
    console.log('  ✅ 移除舊的 unique_active_listing_per_user_item 索引')
    console.log('  ✅ 創建新的 unique_active_listing_per_user_item_no_stats 索引')
    console.log('  ✅ 有屬性刊登：完全無限制，可創建任意多個')
    console.log('  ✅ 無屬性刊登：每個用戶每個物品只能有一個活躍刊登')

  } catch (error) {
    console.error('\n❌ Migration 執行失敗：', error)
    console.error('\n💡 建議：請使用 Supabase Dashboard 的 SQL Editor 手動執行')
    console.error('   檔案位置: supabase/migrations/020_allow_duplicate_listings_with_stats.sql')
    process.exit(1)
  }
}

runMigration()
