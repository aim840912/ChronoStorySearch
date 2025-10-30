/**
 * 交易系統型別守衛
 */

import type {
  Listing,
  MyListing,
  CandidateListing,
  WantedItem
} from '@/types/listings'

export function isListing(data: unknown): data is Listing {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.item_id === 'number' &&
    typeof obj.status === 'string' &&
    ['sell', 'buy', 'exchange'].includes(obj.trade_type as string) &&
    ['active', 'sold', 'cancelled'].includes(obj.status as string)
  )
}

export function isWantedItem(data: unknown): data is WantedItem {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>

  return (
    typeof obj.item_id === 'number' &&
    typeof obj.quantity === 'number'
  )
}

export function isMyListing(data: unknown): data is MyListing {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>

  return (
    typeof obj.id === 'number' &&
    typeof obj.user_id === 'string' &&
    Array.isArray(obj.listing_wanted_items) &&
    obj.listing_wanted_items.every(isWantedItem)
  )
}

export function isCandidateListing(data: unknown): data is CandidateListing {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>

  return (
    typeof obj.id === 'number' &&
    typeof obj.user_id === 'string' &&
    typeof obj.item_id === 'number' &&
    typeof obj.view_count === 'number' &&
    typeof obj.interest_count === 'number' &&
    typeof obj.created_at === 'string' &&
    (obj.listing_wanted_items === undefined ||
      (Array.isArray(obj.listing_wanted_items) &&
        obj.listing_wanted_items.every(isWantedItem)))
  )
}

export function assertMyListing(
  data: unknown
): asserts data is MyListing {
  if (!isMyListing(data)) {
    throw new TypeError('資料不符合 MyListing 格式')
  }
}

export function assertCandidateListings(
  data: unknown
): asserts data is CandidateListing[] {
  if (!Array.isArray(data)) {
    throw new TypeError('資料必須為陣列')
  }

  if (!data.every(isCandidateListing)) {
    throw new TypeError('陣列元素不符合 CandidateListing 格式')
  }
}
