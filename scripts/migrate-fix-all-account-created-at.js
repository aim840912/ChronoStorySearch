#!/usr/bin/env node
/**
 * 批量修正所有用戶的 Discord 帳號建立時間
 *
 * 用途：修正資料庫中所有錯誤的 account_created_at
 * 執行：node scripts/migrate-fix-all-account-created-at.js [--dry-run]
 *
 * 選項：
 *   --dry-run: 只顯示需要修正的用戶，不實際更新資料庫
 */

const { createClient } = require('@supabase/supabase-js')

// 從 Discord Snowflake ID 解析建立時間
function parseSnowflakeTimestamp(snowflake) {
  const DISCORD_EPOCH = 1420070400000
  const milliseconds = Number(BigInt(snowflake) >> BigInt(22)) + DISCORD_EPOCH
  return new Date(milliseconds)
}

async function migrateAllAccounts(dryRun = false) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 環境變數未設定 (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('='.repeat(70))
  console.log('🔧 批量修正 Discord 帳號建立時間')
  console.log('='.repeat(70))
  console.log('模式:', dryRun ? '🔍 Dry Run（預覽模式）' : '✍️  實際更新')
  console.log('')

  // 1. 查詢所有用戶
  console.log('📋 查詢所有用戶...')
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, discord_id, discord_username')
    .order('created_at', { ascending: false })

  if (usersError || !users) {
    console.error('❌ 查詢用戶失敗:', usersError)
    process.exit(1)
  }

  console.log(`✅ 找到 ${users.length} 個用戶\n`)

  // 2. 查詢所有 discord_profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('discord_profiles')
    .select('user_id, account_created_at')

  if (profilesError) {
    console.error('❌ 查詢 discord_profiles 失敗:', profilesError)
    process.exit(1)
  }

  // 建立 profile map
  const profileMap = new Map()
  profiles?.forEach((p) => profileMap.set(p.user_id, p))

  // 3. 檢查每個用戶
  const needsUpdate = []

  console.log('🔍 檢查帳號建立時間...\n')

  for (const user of users) {
    const profile = profileMap.get(user.id)

    if (!profile) {
      console.log(`⚠️  跳過: ${user.discord_username} (user_id: ${user.id}) - 沒有 discord_profile`)
      continue
    }

    const correctCreatedAt = parseSnowflakeTimestamp(user.discord_id)
    const storedCreatedAt = new Date(profile.account_created_at)

    const diffMs = Math.abs(storedCreatedAt.getTime() - correctCreatedAt.getTime())
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    // 如果差距超過 1 天，標記為需要更新
    if (diffDays > 1) {
      needsUpdate.push({
        user_id: user.id,
        discord_id: user.discord_id,
        discord_username: user.discord_username,
        old_created_at: storedCreatedAt,
        new_created_at: correctCreatedAt,
        diff_days: diffDays
      })
    }
  }

  console.log('')
  console.log('='.repeat(70))
  console.log('📊 檢查結果')
  console.log('='.repeat(70))
  console.log(`總用戶數: ${users.length}`)
  console.log(`需要修正: ${needsUpdate.length}`)
  console.log(`已正確: ${users.length - needsUpdate.length}`)
  console.log('')

  if (needsUpdate.length === 0) {
    console.log('✅ 所有用戶的帳號建立時間都已正確！')
    return
  }

  // 4. 顯示需要修正的用戶
  console.log('需要修正的用戶：\n')
  needsUpdate.forEach((item, index) => {
    console.log(`${index + 1}. ${item.discord_username}`)
    console.log(`   User ID: ${item.user_id}`)
    console.log(`   Discord ID: ${item.discord_id}`)
    console.log(`   錯誤時間: ${item.old_created_at.toISOString()}`)
    console.log(`   正確時間: ${item.new_created_at.toISOString()}`)
    console.log(`   差距: ${item.diff_days} 天`)
    console.log('')
  })

  // 5. 執行更新（如果不是 dry run）
  if (!dryRun) {
    console.log('='.repeat(70))
    console.log('🔄 開始更新資料庫...')
    console.log('='.repeat(70))
    console.log('')

    let successCount = 0
    let errorCount = 0

    for (const item of needsUpdate) {
      const { error } = await supabase
        .from('discord_profiles')
        .update({
          account_created_at: item.new_created_at.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', item.user_id)

      if (error) {
        console.error(`❌ 更新失敗: ${item.discord_username} - ${error.message}`)
        errorCount++
      } else {
        console.log(`✅ 已更新: ${item.discord_username}`)
        successCount++
      }
    }

    console.log('')
    console.log('='.repeat(70))
    console.log('📊 更新結果')
    console.log('='.repeat(70))
    console.log(`成功: ${successCount}`)
    console.log(`失敗: ${errorCount}`)
    console.log('='.repeat(70))
  } else {
    console.log('='.repeat(70))
    console.log('💡 提示：這是 Dry Run 模式，沒有實際更新資料庫')
    console.log('   如要執行更新，請移除 --dry-run 參數')
    console.log('='.repeat(70))
  }
}

// 執行
const dryRun = process.argv.includes('--dry-run')

migrateAllAccounts(dryRun)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ 執行失敗:', err)
    process.exit(1)
  })
