/**
 * 配額修復測試腳本
 * 用途：檢查當前配額狀態，並測試修復功能
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 手動載入 .env.local
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      // 移除引號
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  })
} catch {
  console.error('⚠️  無法載入 .env.local，使用現有環境變數')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 定義查詢結果類型
interface QuotaWithUser {
  user_id: string
  active_listings_count: number
  users: {
    email: string
    discord_username: string | null
  } | null
}

async function testQuotaFix() {
  console.log('🔍 開始測試配額修復功能...\n')

  try {
    // 步驟 1: 檢查當前配額狀態
    console.log('📊 步驟 1: 檢查當前配額狀態')
    console.log('─'.repeat(50))

    const { data: quotas, error: quotaError } = await supabase
      .from('user_quotas')
      .select(`
        user_id,
        active_listings_count,
        users!inner(email, discord_username)
      `)
      .returns<QuotaWithUser[]>()

    if (quotaError) {
      throw new Error(`查詢配額失敗: ${quotaError.message}`)
    }

    const issues = []

    for (const quota of quotas || []) {
      // 查詢實際活躍刊登數
      const { count, error: countError } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', quota.user_id)
        .eq('status', 'active')
        .is('deleted_at', null)

      if (countError) {
        console.error(`⚠️  查詢刊登失敗:`, countError)
        continue
      }

      const actual = count || 0
      const recorded = quota.active_listings_count
      const diff = recorded - actual
      const status = diff === 0 ? '✅' : '❌'

      const email = quota.users?.email || 'unknown'
      const discord = quota.users?.discord_username || null

      console.log(`${status} ${email}${discord ? ` (@${discord})` : ''}`)
      console.log(`   記錄配額: ${recorded}`)
      console.log(`   實際刊登: ${actual}`)

      if (diff !== 0) {
        console.log(`   ⚠️  差異: ${diff > 0 ? '+' : ''}${diff}`)
        issues.push({
          user_id: quota.user_id,
          email,
          recorded,
          actual,
          diff
        })
      }
      console.log('')
    }

    // 步驟 2: 顯示問題摘要
    console.log('─'.repeat(50))
    console.log('📋 步驟 2: 問題摘要\n')

    if (issues.length === 0) {
      console.log('✅ 所有配額都是同步的！無需修復。\n')
      return
    }

    console.log(`⚠️  發現 ${issues.length} 個配額不同步的用戶：\n`)
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.email}`)
      console.log(`   差異: ${issue.diff > 0 ? `多計 ${issue.diff} 個` : `少計 ${Math.abs(issue.diff)} 個`}`)
    })
    console.log('')

    // 步驟 3: 執行修復
    console.log('─'.repeat(50))
    console.log('🔧 步驟 3: 執行配額修復\n')

    let fixedCount = 0

    for (const issue of issues) {
      const { error: updateError } = await supabase
        .from('user_quotas')
        .update({
          active_listings_count: issue.actual,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', issue.user_id)

      if (updateError) {
        console.log(`❌ 修復失敗: ${issue.email}`)
        console.error(`   錯誤:`, updateError)
      } else {
        console.log(`✅ 已修復: ${issue.email} (${issue.recorded} → ${issue.actual})`)
        fixedCount++
      }
    }

    // 步驟 4: 驗證修復結果
    console.log('')
    console.log('─'.repeat(50))
    console.log('✅ 修復完成！\n')
    console.log(`總計檢查: ${quotas?.length || 0} 個用戶`)
    console.log(`發現問題: ${issues.length} 個`)
    console.log(`成功修復: ${fixedCount} 個`)
    console.log('')

  } catch (error) {
    console.error('❌ 測試失敗：', error)
    process.exit(1)
  }
}

testQuotaFix()
