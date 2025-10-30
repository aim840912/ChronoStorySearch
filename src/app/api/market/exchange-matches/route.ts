import { NextRequest } from 'next/server'
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { requireTradingEnabled } from '@/lib/middleware/trading-middleware'
import { success } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { supabaseAdmin } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/logger'
import type { MyListing, CandidateListingRaw } from '@/types/listings'

/**
 * GET /api/market/exchange-matches - 交換匹配查詢
 *
 * 功能：
 * - 查詢與我的交換刊登互相匹配的其他刊登
 * - 智能匹配算法：我有 A 想要 B ↔ 對方有 B 想要 A
 * - 返回匹配列表和匹配分數
 * - JOIN users 和 discord_profiles 獲取賣家信譽
 *
 * 認證要求：🔒 需要認證
 * 參考文件：docs/architecture/交易系統/03-API設計.md
 * 決策記錄：docs/architecture/交易系統/09-設計決策記錄.md (DDR-004)
 */
async function handleGET(request: NextRequest, user: User) {
  const { searchParams } = new URL(request.url)
  const listing_id = searchParams.get('listing_id')

  // 驗證必填參數
  if (!listing_id) {
    throw new ValidationError('listing_id 是必填參數')
  }

  const listingIdNum = parseInt(listing_id, 10)
  if (isNaN(listingIdNum)) {
    throw new ValidationError('listing_id 必須是數字')
  }

  apiLogger.debug('查詢交換匹配', {
    user_id: user.id,
    listing_id: listingIdNum
  })

  // 1. 查詢我的刊登（驗證存在且為 exchange 類型，JOIN wanted_items）
  const { data: myListingRaw, error: myListingError } = await supabaseAdmin
    .from('listings')
    .select(`
      id,
      user_id,
      trade_type,
      item_id,
      quantity,
      status,
      listing_wanted_items (
        item_id,
        quantity
      )
    `)
    .eq('id', listingIdNum)
    .is('deleted_at', null)
    .single()

  if (myListingError || !myListingRaw) {
    apiLogger.warn('刊登不存在', { listing_id: listingIdNum, error: myListingError })
    throw new NotFoundError('刊登不存在')
  }

  // 型別斷言（Supabase TypeScript 最佳實踐）
  const myListing = myListingRaw as unknown as MyListing

  // 驗證是交換類型
  if (myListing.trade_type !== 'exchange') {
    throw new ValidationError('只有交換類型的刊登才能查詢匹配')
  }

  // 驗證有 wanted_items
  if (!myListing.listing_wanted_items || myListing.listing_wanted_items.length === 0) {
    throw new ValidationError('交換刊登缺少想要的物品')
  }

  // 提取我想要的物品 ID 列表
  const myWantedItemIds = myListing.listing_wanted_items.map((item) => item.item_id)

  // 2. 查詢候選匹配刊登
  // 第一步：找到所有有我想要物品的刊登（對方的 item_id 在我的 wanted_items 中）
  const { data: candidateListingsRaw, error: matchesError } = await supabaseAdmin
    .from('listings')
    .select(`
      id,
      user_id,
      trade_type,
      item_id,
      quantity,
      status,
      view_count,
      interest_count,
      created_at,
      listing_wanted_items (
        item_id,
        quantity
      ),
      users!inner (
        discord_username
      ),
      discord_profiles (
        reputation_score
      )
    `)
    .eq('trade_type', 'exchange')
    .eq('status', 'active')
    .is('deleted_at', null)
    .or('expires_at.is.null,expires_at.gt.now()')  // ✅ 過濾過期刊登
    .in('item_id', myWantedItemIds)  // 對方有我想要的物品
    .neq('user_id', myListing.user_id)  // 排除自己
    .order('created_at', { ascending: false })
    .limit(50)  // ✅ 限制最多 50 個匹配結果

  if (matchesError) {
    apiLogger.error('查詢匹配失敗', { error: matchesError, listing_id: listingIdNum })
    throw new ValidationError('查詢匹配失敗')
  }

  // 型別斷言（Supabase TypeScript 最佳實踐）
  const candidateListings = (candidateListingsRaw || []) as unknown as CandidateListingRaw[]

  // 第二步：在代碼中過濾 - 對方的 wanted_items 必須包含我的 item_id
  const validMatches = candidateListings.filter((candidate) => {
    const theirWantedItemIds = candidate.listing_wanted_items?.map((item) => item.item_id) || []
    return theirWantedItemIds.includes(myListing.item_id)
  })

  /**
   * 計算交換匹配分數 (0-100)
   *
   * 計算公式：
   * - 基礎分數: 40 分（雙向匹配成功）
   * - 物品匹配: 最高 30 分（我想要的物品中，對方擁有的比例）
   *   - 公式: Math.min(匹配物品數量 * 10, 30)
   * - 數量匹配: 最高 10 分（數量匹配度，避免數量差距過大）
   *   - 公式: 計算雙向數量比率的平均值 * 10
   *   - myQuantityRatio = Math.min(對方數量 / 我想要數量, 1)
   *   - theirQuantityRatio = Math.min(我的數量 / 對方想要數量, 1)
   *   - quantityScore = (myQuantityRatio + theirQuantityRatio) / 2 * 10
   * - 信譽加分: 最高 20 分（對方信譽分數 / 5）
   *   - 公式: Math.min(Math.round(對方信譽分數 / 5), 20)
   *
   * 範例：
   * - 完美匹配（100分）: 雙向匹配 + 對方有所有想要物品 + 數量完全匹配 + 信譽100分
   * - 普通匹配（60分）: 雙向匹配 + 對方有部分物品 + 數量基本匹配 + 信譽中等
   */
  const formattedMatches = validMatches.map((match) => {
    // 基礎分數 40 分（雙向匹配）
    let matchScore = 40

    // 匹配物品數量加分 (最高 30 分)
    const matchedItemsCount = myWantedItemIds.filter(id => id === match.item_id).length
    const itemMatchBonus = Math.min(matchedItemsCount * 10, 30)
    matchScore += itemMatchBonus

    // 數量匹配度 (最高 10 分)
    const myWantedItem = myListing.listing_wanted_items.find((item) => item.item_id === match.item_id)
    const myWantedQuantity = myWantedItem?.quantity || 1

    const theirWantedItem = match.listing_wanted_items?.find((item) => item.item_id === myListing.item_id)
    const theirWantedQuantity = theirWantedItem?.quantity || 1

    const myQuantityRatio = Math.min(match.quantity / myWantedQuantity, 1)
    const theirQuantityRatio = Math.min(myListing.quantity / theirWantedQuantity, 1)
    const quantityScore = Math.round((myQuantityRatio + theirQuantityRatio) / 2 * 10)
    matchScore += quantityScore

    // 信譽加分 (最高 20 分)
    const reputationScore = match.discord_profiles?.[0]?.reputation_score || 0
    const reputationBonus = Math.min(Math.round(reputationScore / 5), 20)
    matchScore += reputationBonus

    return {
      id: match.id,
      user_id: match.user_id,
      trade_type: match.trade_type,
      item_id: match.item_id,
      quantity: match.quantity,
      status: match.status,
      view_count: match.view_count,
      interest_count: match.interest_count,
      created_at: match.created_at,
      // 對方想要的物品列表
      wanted_items: match.listing_wanted_items?.map((item) => ({
        item_id: item.item_id,
        quantity: item.quantity
      })) || [],
      seller: {
        discord_username: match.users?.[0]?.discord_username || 'Unknown',
        reputation_score: reputationScore
      },
      match_score: Math.min(matchScore, 100) // 確保不超過 100
    }
  })

  // 按匹配分數排序
  formattedMatches.sort((a, b) => b.match_score - a.match_score)

  apiLogger.info('交換匹配查詢成功', {
    user_id: user.id,
    listing_id: listingIdNum,
    matches_count: formattedMatches.length
  })

  return success(
    {
      my_listing: {
        id: myListing.id,
        item_id: myListing.item_id,
        quantity: myListing.quantity,
        wanted_items: myListing.listing_wanted_items.map((item) => ({
          item_id: item.item_id,
          quantity: item.quantity
        }))
      },
      matches: formattedMatches
    },
    '查詢成功'
  )
}

// 🔒 需要認證 + 交易系統開關檢查
export const GET = requireTradingEnabled(
  withAuthAndError(handleGET, {
    module: 'ExchangeMatchAPI',
    enableAuditLog: false
  })
)
