/**
 * Google Analytics 4 事件定義
 *
 * 本檔案定義所有 GA4 追蹤事件的型別和常數
 * 包含標準 GA4 事件和自訂事件
 *
 * 參考：https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 */

// ============================================================
// 標準 GA4 事件名稱
// ============================================================

export const GA4_EVENTS = {
  // 標準電子商務事件
  SEARCH: 'search',
  VIEW_ITEM: 'view_item',
  SELECT_ITEM: 'select_item',
  ADD_TO_WISHLIST: 'add_to_wishlist',
  SHARE: 'share',

  // 認證事件
  LOGIN: 'login',
  SIGN_UP: 'sign_up',

  // 自訂事件 - 內容互動
  VIEW_MONSTER: 'view_monster',
  VIEW_GACHA: 'view_gacha',
  USE_ADVANCED_FILTER: 'use_advanced_filter',
  VIEW_HISTORY: 'view_history',

  // 自訂事件 - 交易系統
  CREATE_LISTING: 'create_listing',
  VIEW_LISTING: 'view_listing',
  EXPRESS_INTEREST: 'express_interest',
  VIEW_MY_LISTINGS: 'view_my_listings',
  VIEW_RECEIVED_INTERESTS: 'view_received_interests',
  SEARCH_MARKET: 'search_market',
  EDIT_LISTING: 'edit_listing',
  DELETE_LISTING: 'delete_listing',

  // 自訂事件 - 管理功能
  ADMIN_UPDATE_SETTING: 'admin_update_setting',
  ADMIN_VIEW_STATISTICS: 'admin_view_statistics'
} as const

// ============================================================
// 事件參數型別定義
// ============================================================

/**
 * 搜尋事件參數
 */
export interface SearchEventParams {
  search_term: string
  search_type?: 'item' | 'monster' | 'all'
}

/**
 * 查看物品事件參數
 */
export interface ViewItemEventParams {
  item_id: string
  item_name: string
  item_category: string
  item_type?: string
  level?: number
}

/**
 * 查看怪物事件參數
 */
export interface ViewMonsterEventParams {
  monster_id: string
  monster_name: string
  level: number
  map?: string
}

/**
 * 選擇項目事件參數
 */
export interface SelectItemEventParams {
  item_id: string
  item_name: string
  item_category: string
}

/**
 * 加入最愛事件參數
 */
export interface AddToWishlistEventParams {
  item_id: string
  item_name: string
  item_category: 'monster' | 'item'
}

/**
 * 分享事件參數
 */
export interface ShareEventParams {
  method: string
  content_type: string
  item_id?: string
}

/**
 * 登入事件參數
 */
export interface LoginEventParams {
  method: 'discord'
}

/**
 * 註冊事件參數
 */
export interface SignUpEventParams {
  method: 'discord'
}

/**
 * 查看轉蛋機事件參數
 */
export interface ViewGachaEventParams {
  machine_id?: string
  machine_name?: string
}

/**
 * 使用進階篩選事件參數
 */
export interface UseAdvancedFilterEventParams {
  filter_count: number
  filter_types: string[]
}

/**
 * 建立刊登事件參數
 */
export interface CreateListingEventParams {
  trade_type: 'sell' | 'buy' | 'exchange'
  item_id: string
  item_name: string
  price?: number
  quantity?: number
}

/**
 * 查看刊登事件參數
 */
export interface ViewListingEventParams {
  listing_id: string
  trade_type: 'sell' | 'buy' | 'exchange'
  item_id: string
  item_name: string
}

/**
 * 表達購買意向事件參數
 */
export interface ExpressInterestEventParams {
  listing_id: string
  item_id: string
  item_name: string
  contact_method?: string
}

/**
 * 查看我的刊登事件參數
 */
export interface ViewMyListingsEventParams {
  listing_count: number
}

/**
 * 查看收到的意向事件參數
 */
export interface ViewReceivedInterestsEventParams {
  interest_count: number
}

/**
 * 搜尋市場事件參數
 */
export interface SearchMarketEventParams {
  search_term?: string
  trade_type?: 'sell' | 'buy' | 'exchange'
  filters?: string[]
}

/**
 * 編輯刊登事件參數
 */
export interface EditListingEventParams {
  listing_id: string
  changes: string[]
}

/**
 * 刪除刊登事件參數
 */
export interface DeleteListingEventParams {
  listing_id: string
  trade_type: 'sell' | 'buy' | 'exchange'
}

/**
 * 管理員更新設定事件參數
 */
export interface AdminUpdateSettingEventParams {
  setting_key: string
  new_value: string | number | boolean
}

/**
 * 管理員查看統計事件參數
 */
export interface AdminViewStatisticsEventParams {
  statistic_type: string
}

// ============================================================
// 聯合型別
// ============================================================

/**
 * 所有事件參數的聯合型別
 */
export type GA4EventParams =
  | SearchEventParams
  | ViewItemEventParams
  | ViewMonsterEventParams
  | SelectItemEventParams
  | AddToWishlistEventParams
  | ShareEventParams
  | LoginEventParams
  | SignUpEventParams
  | ViewGachaEventParams
  | UseAdvancedFilterEventParams
  | CreateListingEventParams
  | ViewListingEventParams
  | ExpressInterestEventParams
  | ViewMyListingsEventParams
  | ViewReceivedInterestsEventParams
  | SearchMarketEventParams
  | EditListingEventParams
  | DeleteListingEventParams
  | AdminUpdateSettingEventParams
  | AdminViewStatisticsEventParams
