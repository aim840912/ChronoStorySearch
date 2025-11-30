/**
 * SWR 全域配置
 *
 * 功能：
 * - 統一設定 SWR 快取策略
 * - 減少 API 請求次數（階段 3 優化）
 * - 提升用戶體驗（stale-while-revalidate）
 *
 * 優化目標：
 * - 減少 40-50% API 請求（透過前端快取）
 * - 降低 Upstash Redis 使用量
 */

import type { SWRConfiguration } from 'swr'

/**
 * 自定義 Fetch 錯誤類別
 * 擴展標準 Error，包含 API 回應資訊
 */
class FetchError extends Error {
  info?: unknown
  status?: number

  constructor(message: string) {
    super(message)
    this.name = 'FetchError'
  }
}

/**
 * SWR 全域配置
 *
 * 策略說明：
 * - dedupingInterval: 去重時間窗口（5 秒內相同請求只發送一次）
 * - focusThrottleInterval: 聚焦節流（30 秒內聚焦不重新驗證）
 * - revalidateOnFocus: 聚焦時重新驗證（啟用，保持資料新鮮）
 * - revalidateOnReconnect: 重新連線時重新驗證（啟用）
 * - errorRetryCount: 錯誤重試次數（3 次）
 * - errorRetryInterval: 重試間隔（3 秒）
 *
 * 參考：https://swr.vercel.app/docs/options
 */
export const swrConfig: SWRConfiguration = {
  // 去重時間窗口：60 秒內相同請求只發送一次（優化：減少 API 調用）
  dedupingInterval: 60000,

  // 聚焦節流：60 秒內聚焦不重新驗證（避免頻繁重新驗證）
  focusThrottleInterval: 60000,

  // 聚焦時重新驗證：停用（優化：減少不必要的重新驗證，可透過 mutate 手動刷新）
  revalidateOnFocus: false,

  // 重新連線時重新驗證：啟用
  revalidateOnReconnect: true,

  // 錯誤重試次數：3 次
  errorRetryCount: 3,

  // 重試間隔：3 秒
  errorRetryInterval: 3000,

  // 統一的 fetcher 函數
  fetcher: async (url: string) => {
    const res = await fetch(url, {
      credentials: 'include', // 包含 cookies（認證所需）
    })

    // 處理錯誤回應
    if (!res.ok) {
      const error = new FetchError('API 請求失敗')
      error.status = res.status
      // 附加錯誤資訊
      try {
        const json = await res.json()
        error.info = json
      } catch {
        // 無法解析 JSON，使用預設錯誤
      }
      throw error
    }

    return res.json()
  },
}

/**
 * 不同場景的快取策略
 */
export const swrStrategies = {
  /**
   * 使用者資訊快取策略
   * - 使用者資訊變動少，可以較長時間快取
   * - dedupingInterval: 60 秒（1 分鐘內只請求一次）
   */
  userInfo: {
    dedupingInterval: 60000, // 60 秒
    revalidateOnFocus: false, // 不在聚焦時重新驗證
    revalidateOnReconnect: false, // 不在重新連線時重新驗證
  },

  /**
   * 市場搜尋快取策略
   * - 市場資料變動適中，使用預設策略
   * - dedupingInterval: 10 秒
   */
  marketSearch: {
    dedupingInterval: 10000, // 10 秒
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  },

  /**
   * 熱門商品快取策略
   * - 熱門商品變動較少，可以較長時間快取
   * - dedupingInterval: 30 秒
   */
  trending: {
    dedupingInterval: 30000, // 30 秒
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  },

  /**
   * 即時資料快取策略
   * - 資料需要即時性，較短快取時間
   * - dedupingInterval: 2 秒
   */
  realtime: {
    dedupingInterval: 2000, // 2 秒
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  },
} as const
