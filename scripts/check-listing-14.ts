/**
 * 檢查 listing_id: 14 的完整資料
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkListing() {
  console.log('🔍 檢查 listing_id: 14 的資料\n')

  // 1. 檢查 listings 表
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', 14)
    .single()

  if (listingError) {
    console.error('❌ 查詢失敗：', listingError)
    return
  }

  console.log('📋 Listing 資料：')
  console.log(JSON.stringify(listing, null, 2))

  // 2. 檢查關聯的 item
  if (listing.item_id) {
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', listing.item_id)
      .single()

    console.log('\n🎮 關聯的 Item 資料：')
    if (itemError) {
      console.error('❌ Item 不存在：', itemError)
    } else {
      console.log(JSON.stringify(item, null, 2))
    }
  }

  // 3. 檢查關聯的 user
  if (listing.user_id) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, discord_username')
      .eq('id', listing.user_id)
      .single()

    console.log('\n👤 關聯的 User 資料：')
    if (userError) {
      console.error('❌ User 不存在：', userError)
    } else {
      console.log(JSON.stringify(user, null, 2))
    }
  }

  // 4. 模擬市場搜尋查詢（檢查為什麼沒有返回）
  console.log('\n🔎 模擬市場搜尋查詢（JOIN item + user）：')
  const { data: marketListings, error: marketError } = await supabase
    .from('listings')
    .select(`
      *,
      item:items(*),
      seller:users(id, username, discord_username, discord_avatar)
    `)
    .eq('id', 14)
    .eq('status', 'active')
    .is('deleted_at', null)
    .single()

  if (marketError) {
    console.error('❌ 市場查詢失敗：', marketError)
  } else {
    console.log('✅ 市場查詢成功：')
    console.log(JSON.stringify(marketListings, null, 2))
  }

  // 5. 檢查所有活躍刊登
  console.log('\n📊 檢查所有活躍刊登：')
  const { data: allListings, error: allError } = await supabase
    .from('listings')
    .select('id, user_id, item_id, status, deleted_at')
    .eq('status', 'active')
    .is('deleted_at', null)

  if (allError) {
    console.error('❌ 查詢失敗：', allError)
  } else {
    console.log(`✅ 找到 ${allListings.length} 個活躍刊登：`)
    console.table(allListings)
  }
}

checkListing()
