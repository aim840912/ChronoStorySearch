/**
 * 統一的 Cookie 配置
 *
 * 目的：
 * - 確保登入(callback)和登出(logout) API 使用完全相同的 cookie 配置
 * - 避免因 cookie 屬性不匹配導致清除失敗
 *
 * 重要原則（2025-11-04）：
 * - domain 屬性不設置，讓瀏覽器自動處理
 * - path 固定為 '/'
 * - secure 在生產環境為 true
 * - sameSite 固定為 'lax'
 * - httpOnly 固定為 true（安全性）
 */

export const SESSION_COOKIE_NAME = 'maplestory_session'

/**
 * 獲取 Cookie 配置
 *
 * @param maxAge Cookie 有效期（秒），設為 0 表示立即過期（用於清除）
 * @returns Cookie 配置物件
 */
export function getCookieConfig(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
    // 明確不設置 domain，讓瀏覽器自動處理
    // 這樣可以避免在 Vercel 部署環境中的 domain 匹配問題
  }
}

/**
 * 獲取 Session Cookie 配置（用於登入時設置）
 *
 * @param maxAge Session 有效期（秒），預設 30 天
 */
export function getSessionCookieConfig(maxAge: number = 30 * 24 * 60 * 60) {
  return getCookieConfig(maxAge)
}

/**
 * 獲取清除 Cookie 的配置（用於登出時清除）
 *
 * 使用 maxAge: 0 和 expires: new Date(0) 確保清除
 */
export function getClearCookieConfig() {
  return {
    ...getCookieConfig(0),
    expires: new Date(0), // 設置為過去的時間
  }
}
