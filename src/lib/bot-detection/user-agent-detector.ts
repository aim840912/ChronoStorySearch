/**
 * User-Agent Bot 檢測器
 *
 * 實作四層檢測邏輯：
 * 1. 缺少 User-Agent → 100% Bot（高置信度拒絕）
 * 2. SEO 爬蟲白名單 → 允許通過（保留 SEO 友好）
 * 3. Bot 黑名單匹配 → 拒絕（高置信度 Bot）
 * 4. 瀏覽器指紋檢查 → 驗證是否為真實瀏覽器
 */

import { BOT_USER_AGENTS, SEO_CRAWLERS_WHITELIST } from './constants'
import { BotDetectionResult } from './types'

/**
 * 檢測 User-Agent 是否為 Bot
 *
 * @param userAgent - HTTP User-Agent header
 * @returns Bot 檢測結果
 *
 * @example
 * ```typescript
 * // 正常瀏覽器
 * detectBotByUserAgent('Mozilla/5.0 Chrome/91.0')
 * // => { isBot: false, confidence: 'high', shouldBlock: false }
 *
 * // curl 請求
 * detectBotByUserAgent('curl/7.68.0')
 * // => { isBot: true, reason: 'blacklist:curl', confidence: 'high', shouldBlock: true }
 *
 * // GoogleBot
 * detectBotByUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')
 * // => { isBot: true, reason: 'seo_crawler', confidence: 'high', shouldBlock: false }
 * ```
 */
export function detectBotByUserAgent(
  userAgent: string | null
): BotDetectionResult {
  // 第 1 層：無 User-Agent → 100% Bot
  if (!userAgent) {
    return {
      isBot: true,
      reason: 'missing_user_agent',
      confidence: 'high',
      shouldBlock: true,
    }
  }

  const ua = userAgent.toLowerCase()

  // 第 2 層：SEO 爬蟲白名單 → 允許
  for (const crawler of SEO_CRAWLERS_WHITELIST) {
    if (ua.includes(crawler)) {
      return {
        isBot: true,
        reason: `seo_crawler:${crawler}`,
        confidence: 'high',
        shouldBlock: false,
      }
    }
  }

  // 第 3 層：黑名單檢查 → 拒絕
  for (const botPattern of BOT_USER_AGENTS) {
    if (ua.includes(botPattern)) {
      return {
        isBot: true,
        reason: `blacklist:${botPattern}`,
        confidence: 'high',
        shouldBlock: true,
      }
    }
  }

  // 第 4 層：瀏覽器指紋檢查
  const browserPatterns = [
    'mozilla',
    'chrome',
    'safari',
    'firefox',
    'edge',
    'opera',
  ]

  const hasBrowserPattern = browserPatterns.some((pattern) =>
    ua.includes(pattern)
  )

  if (!hasBrowserPattern) {
    return {
      isBot: true,
      reason: 'no_browser_pattern',
      confidence: 'medium',
      shouldBlock: true,
    }
  }

  // 通過所有檢查 → 判定為真實瀏覽器
  return {
    isBot: false,
    confidence: 'high',
    shouldBlock: false,
  }
}

/**
 * 取得 IP 地址（從 Next.js Request Headers）
 *
 * @param headers - Next.js Request Headers
 * @returns IP 地址（如果無法取得則返回 'unknown'）
 */
export function getClientIP(headers: Headers): string {
  // Vercel 部署環境使用 x-forwarded-for
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for 可能包含多個 IP（格式：client, proxy1, proxy2）
    return forwardedFor.split(',')[0].trim()
  }

  // 備用方案：x-real-ip
  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }

  // 無法取得 IP
  return 'unknown'
}
