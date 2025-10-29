/**
 * Bot Detection 類型定義
 */

/**
 * Bot 檢測結果
 */
export interface BotDetectionResult {
  /** 是否為 Bot */
  isBot: boolean

  /** 檢測原因 */
  reason?: string

  /** 置信度 */
  confidence: 'high' | 'medium' | 'low'

  /** 是否應該阻擋（SEO 爬蟲為 false） */
  shouldBlock?: boolean
}

/**
 * Rate Limit 檢測結果
 */
export interface RateLimitResult {
  /** 是否允許請求 */
  allowed: boolean

  /** 剩餘請求數 */
  remaining: number

  /** 重置時間（Unix timestamp，毫秒） */
  resetAt: number
}

/**
 * Rate Limit 配置
 */
export interface RateLimitConfig {
  /** 最大請求數 */
  limit: number

  /** 時間窗口（秒） */
  window: number

  /** 識別符（IP 或 user_id） */
  identifier: string

  /** API 端點路徑 */
  endpoint: string
}

/**
 * 行為檢測結果
 */
export interface BehaviorDetectionResult {
  /** 是否檢測到異常行為 */
  isAbnormal: boolean

  /** 檢測類型 */
  type: 'high_frequency' | 'scanning' | 'none'

  /** 當前計數 */
  count?: number

  /** 閾值 */
  threshold?: number

  /** 詳細資訊 */
  details?: string
}

/**
 * Bot Detection 中間件選項
 */
export interface BotDetectionOptions {
  /** 是否啟用 Rate Limiting */
  enableRateLimit?: boolean

  /** 是否啟用行為檢測 */
  enableBehaviorDetection?: boolean

  /** Rate Limit 配置 */
  rateLimit?: {
    limit: number
    window: number
  }

  /** 行為檢測配置 */
  behavior?: {
    enableHighFrequency?: boolean
    enableScanning?: boolean
  }
}
