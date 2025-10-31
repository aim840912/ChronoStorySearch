/**
 * 執行 Migration 017: 更新維護訊息預設值
 *
 * 使用方式：npx tsx scripts/run-migration-017.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

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

async function runMigration() {
  console.log('🚀 開始執行 Migration 017...\n')

  try {
    // 讀取 migration 檔案
    const migrationPath = path.join(__dirname, '../supabase/migrations/017_update_maintenance_message_default.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    // 提取 UPDATE 語句（跳過註解）
    const updateQuery = `
      UPDATE system_settings
      SET
        value = '""',
        description = '維護模式顯示訊息（空值時由前端翻譯系統提供預設訊息）'
      WHERE
        key = 'maintenance_message'
        AND value = '"系統維護中，請稍後再試"'
    `

    console.log('📝 執行 SQL：')
    console.log(updateQuery)
    console.log()

    // 執行更新
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: updateQuery
    })

    if (error) {
      // 如果 exec_sql 函數不存在，嘗試直接使用 from() 方法
      console.log('⚠️  exec_sql 函數不可用，嘗試使用替代方案...\n')

      // 檢查當前值
      const { data: currentData, error: selectError } = await supabase
        .from('system_settings')
        .select('key, value, description')
        .eq('key', 'maintenance_message')
        .single()

      if (selectError) {
        throw new Error(`查詢失敗: ${selectError.message}`)
      }

      console.log('📊 當前維護訊息值：', currentData.value)
      console.log('   值類型：', typeof currentData.value)

      // 檢查是否為預設中文訊息（支援兩種格式）
      const isDefaultMessage =
        currentData.value === '"系統維護中，請稍後再試"' ||  // JSON 字串格式
        currentData.value === '系統維護中，請稍後再試'        // 純文字格式

      if (isDefaultMessage) {
        // 執行更新
        const { error: updateError } = await supabase
          .from('system_settings')
          .update({
            value: '',  // 空字串（非 JSON 格式）
            description: '維護模式顯示訊息（空值時由前端翻譯系統提供預設訊息）'
          })
          .eq('key', 'maintenance_message')

        if (updateError) {
          throw new Error(`更新失敗: ${updateError.message}`)
        }

        console.log('✅ Migration 017 執行成功！')
        console.log('   維護訊息預設值已從「系統維護中，請稍後再試」改為空字串')
        console.log('   現在切換語言時，維護訊息會自動翻譯：')
        console.log('   - 中文：「系統維護中，請稍後再試」')
        console.log('   - 英文："System under maintenance, please try again later"')
      } else {
        console.log('ℹ️  維護訊息不是預設值，跳過更新')
        console.log('   當前值：', currentData.value)
        console.log('   如需使用自動翻譯，請在 Admin 頁面清空維護訊息')
      }
    } else {
      console.log('✅ Migration 017 執行成功！')
    }

    // 驗證結果
    console.log('\n🔍 驗證更新結果...')
    const { data: result, error: verifyError } = await supabase
      .from('system_settings')
      .select('key, value, description')
      .eq('key', 'maintenance_message')
      .single()

    if (verifyError) {
      throw new Error(`驗證失敗: ${verifyError.message}`)
    }

    console.log('📊 更新後的值：')
    console.log(`   key: ${result.key}`)
    console.log(`   value: ${result.value}`)
    console.log(`   description: ${result.description}`)

  } catch (error) {
    console.error('\n❌ Migration 執行失敗：', error)
    process.exit(1)
  }
}

// 執行 migration
runMigration()
