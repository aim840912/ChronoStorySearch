#!/usr/bin/env node
/**
 * 修正單一用戶的 Discord 帳號建立時間
 *
 * 用途：手動修正資料庫中錯誤的 account_created_at
 * 執行：node scripts/fix-single-user-account-age.js <USER_ID> <DISCORD_ID>
 */

const { createClient } = require('@supabase/supabase-js')

// 從 Discord Snowflake ID 解析建立時間
function parseSnowflakeTimestamp(snowflake) {
  const DISCORD_EPOCH = 1420070400000
  const milliseconds = Number(BigInt(snowflake) >> BigInt(22)) + DISCORD_EPOCH
  return new Date(milliseconds)
}

async function fixUserAccountAge(userId, discordId) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 環境變數未設定 (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('='.repeat(60))
  console.log('🔧 修正 Discord 帳號建立時間')
  console.log('='.repeat(60))
  console.log('User ID:', userId)
  console.log('Discord ID:', discordId)
  console.log('')

  // 1. 查詢目前資料
  const { data: profile, error: queryError } = await supabase
    .from('discord_profiles')
    .select('account_created_at')
    .eq('user_id', userId)
    .single()

  if (queryError || !profile) {
    console.error('❌ 查詢失敗:', queryError)
    process.exit(1)
  }

  const oldCreatedAt = new Date(profile.account_created_at)
  console.log('📊 目前資料庫中的時間:', oldCreatedAt.toISOString())

  // 2. 計算正確時間
  const correctCreatedAt = parseSnowflakeTimestamp(discordId)
  console.log('✅ 正確的建立時間:', correctCreatedAt.toISOString())

  const diffYears = (oldCreatedAt.getTime() - correctCreatedAt.getTime()) / (1000 * 60 * 60 * 24 * 365)
  console.log('⚠️  時間差距:', diffYears.toFixed(1), '年')
  console.log('')

  // 3. 更新資料庫
  console.log('🔄 更新資料庫...')
  const { error: updateError } = await supabase
    .from('discord_profiles')
    .update({
      account_created_at: correctCreatedAt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (updateError) {
    console.error('❌ 更新失敗:', updateError)
    process.exit(1)
  }

  console.log('✅ 更新成功!')
  console.log('')

  // 4. 驗證結果
  const { data: updated } = await supabase
    .from('discord_profiles')
    .select('account_created_at')
    .eq('user_id', userId)
    .single()

  const now = new Date()
  const accountAgeDays = Math.floor((now.getTime() - new Date(updated.account_created_at).getTime()) / (1000 * 60 * 60 * 24))

  console.log('='.repeat(60))
  console.log('📋 驗證結果')
  console.log('='.repeat(60))
  console.log('更新後的時間:', updated.account_created_at)
  console.log('帳號年齡:', accountAgeDays, '天')
  console.log('是否滿 365 天:', accountAgeDays >= 365 ? '✅ 是' : '❌ 否')
  console.log('='.repeat(60))
}

// 執行
const userId = process.argv[2]
const discordId = process.argv[3]

if (!userId || !discordId) {
  console.error('用法: node scripts/fix-single-user-account-age.js <USER_ID> <DISCORD_ID>')
  console.error('範例: node scripts/fix-single-user-account-age.js ccf1d51f-ba54-4ed7-b5ca-0963ae230dbf 333819610409467905')
  process.exit(1)
}

fixUserAccountAge(userId, discordId).then(() => process.exit(0)).catch(err => {
  console.error('❌ 執行失敗:', err)
  process.exit(1)
})
