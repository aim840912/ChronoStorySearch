/**
 * 系統功能開關配置模組
 *
 * 功能：
 * - 從資料庫讀取系統設定
 * - 快取機制減少資料庫查詢
 * - 支援動態開關，無需重啟服務
 *
 * @module system-config
 */

import { supabaseAdmin } from '@/lib/supabase/server'
import { dbLogger } from '@/lib/logger'

// =====================================================
// 類型定義
// =====================================================

export interface SystemSettings {
  trading_system_enabled: boolean
  maintenance_mode: boolean
  maintenance_message: string
  max_active_listings_per_user: number
  listing_expiration_days: number
}

interface CachedSettings {
  data: SystemSettings
  timestamp: number
}

// =====================================================
// 快取配置
// =====================================================

// 快取時間：10 秒（平衡即時性與效能）
const CACHE_TTL = 10 * 1000

// 記憶體快取
let cachedSettings: CachedSettings | null = null

// =====================================================
// 核心函數
// =====================================================

/**
 * 從資料庫獲取系統設定
 *
 * @returns 系統設定物件
 * @throws 資料庫查詢失敗時拋出錯誤
 */
async function fetchSettingsFromDatabase(): Promise<SystemSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')

    if (error) {
      dbLogger.error('查詢系統設定失敗', { error: error.message })
      throw new Error('查詢系統設定失敗')
    }

    // 將陣列轉換為物件
    const settings: Record<string, unknown> = {}
    data.forEach((row) => {
      settings[row.key] = row.value
    })

    return {
      trading_system_enabled: settings.trading_system_enabled === true,
      maintenance_mode: settings.maintenance_mode === true,
      maintenance_message: (typeof settings.maintenance_message === 'string' ? settings.maintenance_message : null) || '系統維護中，請稍後再試',
      max_active_listings_per_user: typeof settings.max_active_listings_per_user === 'number' ? settings.max_active_listings_per_user : 5,
      listing_expiration_days: typeof settings.listing_expiration_days === 'number' ? settings.listing_expiration_days : 30
    }
  } catch (error) {
    dbLogger.error('獲取系統設定時發生錯誤', { error })
    throw error
  }
}

/**
 * 獲取系統設定（帶快取）
 *
 * 快取策略：
 * - 快取時間：10 秒
 * - 超過快取時間後重新從資料庫讀取
 * - 首次呼叫會直接查詢資料庫
 *
 * @returns 系統設定物件
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  const now = Date.now()

  // 檢查快取是否有效
  if (cachedSettings && (now - cachedSettings.timestamp < CACHE_TTL)) {
    return cachedSettings.data
  }

  // 快取失效或不存在，重新查詢資料庫
  const settings = await fetchSettingsFromDatabase()

  // 更新快取
  cachedSettings = {
    data: settings,
    timestamp: now
  }

  return settings
}

/**
 * 清除快取
 *
 * 使用情境：
 * - 管理員更新設定後呼叫
 * - 確保下次查詢能獲取最新設定
 */
export function clearSettingsCache(): void {
  cachedSettings = null
  dbLogger.info('系統設定快取已清除')
}

// =====================================================
// 便捷函數
// =====================================================

/**
 * 檢查交易系統是否啟用
 *
 * @returns true = 啟用, false = 關閉
 */
export async function isTradingEnabled(): Promise<boolean> {
  const settings = await getSystemSettings()
  return settings.trading_system_enabled
}

/**
 * 檢查是否處於維護模式
 *
 * @returns true = 維護中, false = 正常運作
 */
export async function isMaintenanceMode(): Promise<boolean> {
  const settings = await getSystemSettings()
  return settings.maintenance_mode
}

/**
 * 獲取維護訊息
 *
 * @returns 維護訊息文字
 */
export async function getMaintenanceMessage(): Promise<string> {
  const settings = await getSystemSettings()
  return settings.maintenance_message
}
