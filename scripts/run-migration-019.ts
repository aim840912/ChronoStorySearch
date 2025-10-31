/**
 * 執行 Migration 019：修復配額雙重計數問題
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
  console.log('🚀 開始執行 Migration 019：修復配額雙重計數問題...\n')

  try {
    // 讀取 migration SQL 檔案
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '019_fix_quota_double_counting.sql')
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

      const { error } = await supabase.rpc('exec_sql' as any, { sql_string: stmt + ';' }) as any

      if (error) {
        console.error(`   ❌ 語句 ${i + 1} 執行失敗:`, error.message)
        throw error
      }

      console.log(`   ✅ 語句 ${i + 1} 執行成功`)
    }

    console.log('\n🎉 Migration 019 執行成功！')
    console.log('\n修復內容：')
    console.log('  ✅ 移除 create_listing_safe() 函數中的配額更新邏輯')
    console.log('  ✅ 配額現在完全由 Migration 018 觸發器自動管理')
    console.log('  ✅ 解決每次創建刊登配額增加 2 的問題')

  } catch (error) {
    console.error('\n❌ Migration 執行失敗：', error)
    console.error('\n💡 建議：請使用 Supabase Dashboard 的 SQL Editor 手動執行')
    console.error('   檔案位置: supabase/migrations/019_fix_quota_double_counting.sql')
    process.exit(1)
  }
}

runMigration()
