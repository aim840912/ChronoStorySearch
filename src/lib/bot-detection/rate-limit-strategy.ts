/**
 * Rate Limit 策略配置
 *
 * 根據 API 風險等級選擇適當的限流算法：
 * - 低風險：固定窗口（2 命令/請求，節省 Redis 使用）
 * - 高風險：滑動窗口（1 命令/請求，更精確限流）
 *
 * 優化目標：
 * - 節省 30-40% Redis commands
 * - 保持高風險 API 的精確防護
 * - 低風險 API 使用更高效的固定窗口
 *
 * @see https://github.com/aim840912/ChronoStorySearch/docs/optimization/OPTIMIZATION_HISTORY.md
 */

export type RateLimitStrategy = 'fixed' | 'sliding'

export interface RateLimitPolicy {
  /** 限流策略類型 */
  strategy: RateLimitStrategy
  /** 每個窗口的最大請求數 */
  limit: number
  /** 窗口大小（秒） */
  window: number
  /** 選擇此策略的原因（用於文檔和監控） */
  reason?: string
}

/**
 * API 端點的 Rate Limit 策略映射
 *
 * 分級原則：
 * - 低風險：查詢類 API，無副作用，使用固定窗口
 * - 中風險：認證用戶的查詢，信任度較高，使用固定窗口
 * - 高風險：寫入操作、敏感操作，使用滑動窗口
 */
export const RATE_LIMIT_POLICIES: Record<string, RateLimitPolicy> = {
  // ====================================================
  // 低風險：公開查詢 API（固定窗口）
  // ====================================================

  '/api/market/trending': {
    strategy: 'fixed',
    limit: 20,
    window: 3600, // 1 小時
    reason: '公開查詢 API，熱門商品列表，無副作用'
  },

  '/api/system/status': {
    strategy: 'fixed',
    limit: 40,
    window: 3600,
    reason: '系統狀態查詢，公開端點，無副作用'
  },

  // ====================================================
  // 中風險：認證用戶查詢（固定窗口）
  // ====================================================

  '/api/auth/me': {
    strategy: 'fixed',
    limit: 100,
    window: 3600,
    reason: '認證用戶資訊，已有前端快取，查詢頻率低'
  },

  '/api/market/search': {
    strategy: 'fixed',
    limit: 30,
    window: 3600,
    reason: '認證用戶搜尋，信任度較高，已有 Redis 快取'
  },

  '/api/listings:GET': {
    strategy: 'fixed',
    limit: 100,
    window: 3600,
    reason: '認證用戶查詢自己的刊登，信任度較高'
  },

  // ====================================================
  // 高風險：寫入操作（滑動窗口）
  // ====================================================

  '/api/listings:POST': {
    strategy: 'sliding',
    limit: 100,
    window: 3600,
    reason: '建立刊登，需要精確限流防止濫用'
  },

  '/api/listings:PUT': {
    strategy: 'sliding',
    limit: 100,
    window: 3600,
    reason: '更新刊登，需要精確限流'
  },

  '/api/listings:DELETE': {
    strategy: 'sliding',
    limit: 100,
    window: 3600,
    reason: '刪除刊登，需要精確限流'
  },

  '/api/interests:POST': {
    strategy: 'sliding',
    limit: 100,
    window: 3600,
    reason: '表達興趣，需要精確限流防止騷擾'
  },

  // ====================================================
  // 高風險：認證流程（滑動窗口）
  // ====================================================

  '/api/auth/discord': {
    strategy: 'sliding',
    limit: 5,
    window: 60, // 1 分鐘
    reason: 'OAuth 啟動，防止 state token 濫用'
  },

  '/api/auth/discord/callback': {
    strategy: 'sliding',
    limit: 10,
    window: 60,
    reason: 'OAuth 回調，防止重放攻擊'
  },

  // ====================================================
  // 高風險：敏感操作（滑動窗口）
  // ====================================================

  '/api/listings/[id]/contact': {
    strategy: 'sliding',
    limit: 20,
    window: 3600,
    reason: '查看聯絡方式，敏感資訊，需要精確限流'
  },
}

/**
 * 獲取端點的 Rate Limit 策略
 *
 * @param endpoint - API 端點路徑（例如：/api/market/search）
 * @param method - HTTP 方法（例如：GET, POST）
 * @returns Rate Limit 策略配置
 *
 * @example
 * ```typescript
 * // 優先匹配「端點:方法」
 * getRateLimitPolicy('/api/listings', 'POST')
 * // → { strategy: 'sliding', limit: 100, window: 3600 }
 *
 * // 其次匹配「端點」
 * getRateLimitPolicy('/api/listings', 'GET')
 * // → { strategy: 'fixed', limit: 100, window: 3600 }
 *
 * // 預設使用固定窗口
 * getRateLimitPolicy('/api/unknown')
 * // → { strategy: 'fixed', limit: 40, window: 3600 }
 * ```
 */
export function getRateLimitPolicy(
  endpoint: string,
  method?: string
): RateLimitPolicy {
  // 1. 優先匹配「端點:方法」（精確匹配）
  if (method) {
    const key = `${endpoint}:${method}`
    if (RATE_LIMIT_POLICIES[key]) {
      return RATE_LIMIT_POLICIES[key]
    }
  }

  // 2. 其次匹配「端點」（通用匹配）
  if (RATE_LIMIT_POLICIES[endpoint]) {
    return RATE_LIMIT_POLICIES[endpoint]
  }

  // 3. 預設使用固定窗口（低風險假設）
  return {
    strategy: 'fixed',
    limit: 40,
    window: 3600,
    reason: '預設策略：未明確定義的端點使用固定窗口'
  }
}

/**
 * 獲取所有使用滑動窗口的端點
 * （用於監控和文檔）
 */
export function getSlidingWindowEndpoints(): string[] {
  return Object.entries(RATE_LIMIT_POLICIES)
    .filter(([, policy]) => policy.strategy === 'sliding')
    .map(([endpoint]) => endpoint)
}

/**
 * 獲取所有使用固定窗口的端點
 * （用於監控和文檔）
 */
export function getFixedWindowEndpoints(): string[] {
  return Object.entries(RATE_LIMIT_POLICIES)
    .filter(([, policy]) => policy.strategy === 'fixed')
    .map(([endpoint]) => endpoint)
}
