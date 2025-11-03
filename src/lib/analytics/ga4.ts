/**
 * Google Analytics 4 工具函數
 *
 * 提供 GA4 事件追蹤的工具函數
 * 支援 TypeScript 型別檢查
 * 自動處理開發/生產環境差異
 *
 * 使用範例：
 * ```typescript
 * import { trackEvent, trackPageView } from '@/lib/analytics/ga4'
 * import { GA4_EVENTS } from '@/lib/analytics/events'
 *
 * trackEvent(GA4_EVENTS.SEARCH, { search_term: 'potion', search_type: 'item' })
 * ```
 */

import { apiLogger } from '@/lib/logger'

// ============================================================
// 全域型別定義
// ============================================================

declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      params?: Record<string, unknown>
    ) => void
    dataLayer: unknown[]
  }
}

// ============================================================
// 環境變數檢查
// ============================================================

const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID

/**
 * 檢查 GA4 是否已啟用
 * @returns 是否已設定 Measurement ID
 */
export function isGA4Enabled(): boolean {
  return Boolean(GA4_MEASUREMENT_ID)
}

/**
 * 檢查是否為生產環境
 * @returns 是否為生產環境
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

// ============================================================
// 核心追蹤函數
// ============================================================

/**
 * 追蹤自訂事件
 *
 * @param eventName - 事件名稱（建議使用 GA4_EVENTS 常數）
 * @param params - 事件參數
 *
 * @example
 * ```typescript
 * trackEvent(GA4_EVENTS.SEARCH, {
 *   search_term: 'red potion',
 *   search_type: 'item'
 * })
 * ```
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  // 檢查是否在客戶端環境
  if (typeof window === 'undefined') {
    return
  }

  // 檢查 GA4 是否已啟用
  if (!isGA4Enabled()) {
    if (!isProduction()) {
      apiLogger.debug('[GA4] Tracking disabled: NEXT_PUBLIC_GA4_MEASUREMENT_ID not set', {
        event: eventName,
        params
      })
    }
    return
  }

  // 檢查 gtag 函數是否存在
  if (typeof window.gtag !== 'function') {
    apiLogger.warn('[GA4] gtag function not available', {
      event: eventName
    })
    return
  }

  try {
    // 發送事件到 GA4
    window.gtag('event', eventName, params)

    // 開發環境下記錄到 console
    if (!isProduction()) {
      apiLogger.debug('[GA4] Event tracked', {
        event: eventName,
        params
      })
    }
  } catch (error) {
    apiLogger.error('[GA4] Failed to track event', {
      event: eventName,
      params,
      error
    })
  }
}

/**
 * 手動追蹤頁面瀏覽
 *
 * 注意：通常不需要手動呼叫，GA4 會自動追蹤
 * 僅在特殊情況下使用（如 SPA 路由切換）
 *
 * @param pagePath - 頁面路徑
 * @param pageTitle - 頁面標題（可選）
 *
 * @example
 * ```typescript
 * trackPageView('/market', 'Market Listings')
 * ```
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (!isGA4Enabled() || typeof window === 'undefined') {
    return
  }

  trackEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title
  })
}

/**
 * 追蹤使用者登入
 *
 * @param method - 登入方式（如 'discord'）
 */
export function trackLogin(method: string): void {
  trackEvent('login', { method })
}

/**
 * 追蹤使用者登出
 */
export function trackLogout(): void {
  trackEvent('logout')
}

/**
 * 追蹤搜尋行為
 *
 * @param searchTerm - 搜尋關鍵字
 * @param searchType - 搜尋類型（item/monster/all）
 */
export function trackSearch(
  searchTerm: string,
  searchType?: 'item' | 'monster' | 'all'
): void {
  trackEvent('search', {
    search_term: searchTerm,
    ...(searchType && { search_type: searchType })
  })
}

/**
 * 追蹤內容查看
 *
 * @param itemId - 物品/怪物 ID
 * @param itemName - 物品/怪物名稱
 * @param itemCategory - 類別（item/monster）
 * @param additionalParams - 額外參數
 */
export function trackViewItem(
  itemId: string,
  itemName: string,
  itemCategory: string,
  additionalParams?: Record<string, unknown>
): void {
  trackEvent('view_item', {
    item_id: itemId,
    item_name: itemName,
    item_category: itemCategory,
    ...additionalParams
  })
}

/**
 * 追蹤分享行為
 *
 * @param method - 分享方式（如 'clipboard', 'social'）
 * @param contentType - 內容類型
 * @param itemId - 項目 ID（可選）
 */
export function trackShare(
  method: string,
  contentType: string,
  itemId?: string
): void {
  trackEvent('share', {
    method,
    content_type: contentType,
    ...(itemId && { item_id: itemId })
  })
}

// ============================================================
// 電子商務事件（市場系統）
// ============================================================

/**
 * 追蹤建立刊登
 *
 * @param params - 刊登參數
 */
export function trackCreateListing(params: {
  tradeType: 'sell' | 'buy' | 'exchange'
  itemId: string
  itemName: string
  price?: number
  quantity?: number
}): void {
  trackEvent('create_listing', {
    trade_type: params.tradeType,
    item_id: params.itemId,
    item_name: params.itemName,
    ...(params.price !== undefined && { price: params.price }),
    ...(params.quantity !== undefined && { quantity: params.quantity })
  })
}

/**
 * 追蹤查看刊登詳情
 *
 * @param params - 刊登參數
 */
export function trackViewListing(params: {
  listingId: string
  tradeType: 'sell' | 'buy' | 'exchange'
  itemId: string
  itemName: string
}): void {
  trackEvent('view_listing', {
    listing_id: params.listingId,
    trade_type: params.tradeType,
    item_id: params.itemId,
    item_name: params.itemName
  })
}

/**
 * 追蹤表達購買意向
 *
 * @param params - 意向參數
 */
export function trackExpressInterest(params: {
  listingId: string
  tradeType: 'sell' | 'buy' | 'exchange'
  itemId: string
  itemName: string
  hasMessage?: boolean
}): void {
  trackEvent('express_interest', {
    listing_id: params.listingId,
    trade_type: params.tradeType,
    item_id: params.itemId,
    item_name: params.itemName,
    ...(params.hasMessage !== undefined && { has_message: params.hasMessage })
  })
}

/**
 * 追蹤編輯刊登
 *
 * @param params - 編輯參數
 */
export function trackEditListing(params: {
  listingId: string
  tradeType: 'sell' | 'buy' | 'exchange'
  itemId: string
  itemName: string
  changes: string[]
}): void {
  trackEvent('edit_listing', {
    listing_id: params.listingId,
    trade_type: params.tradeType,
    item_id: params.itemId,
    item_name: params.itemName,
    changes: params.changes
  })
}

/**
 * 追蹤刪除刊登
 *
 * @param params - 刪除參數
 */
export function trackDeleteListing(params: {
  listingId: string
  tradeType: 'sell' | 'buy' | 'exchange'
  itemId: string
  itemName: string
}): void {
  trackEvent('delete_listing', {
    listing_id: params.listingId,
    trade_type: params.tradeType,
    item_id: params.itemId,
    item_name: params.itemName
  })
}

// ============================================================
// 工具函數
// ============================================================

/**
 * 取得 GA4 Measurement ID
 * @returns Measurement ID 或 undefined
 */
export function getMeasurementId(): string | undefined {
  return GA4_MEASUREMENT_ID
}

/**
 * 設定使用者屬性
 *
 * @param properties - 使用者屬性
 *
 * @example
 * ```typescript
 * setUserProperties({
 *   user_id: '12345',
 *   user_role: 'premium'
 * })
 * ```
 */
export function setUserProperties(
  properties: Record<string, string | number | boolean>
): void {
  if (!isGA4Enabled() || typeof window === 'undefined') {
    return
  }

  if (typeof window.gtag !== 'function') {
    return
  }

  try {
    window.gtag('config', GA4_MEASUREMENT_ID!, {
      user_properties: properties
    })

    if (!isProduction()) {
      apiLogger.debug('[GA4] User properties set', properties)
    }
  } catch (error) {
    apiLogger.error('[GA4] Failed to set user properties', {
      properties,
      error
    })
  }
}
