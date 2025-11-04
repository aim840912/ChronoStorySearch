/**
 * 環境 URL 配置工具
 *
 * 用於統一管理不同部署環境的 URL 配置
 * 支援：本地開發、Vercel 預覽部署、Vercel 生產部署
 */

/**
 * 取得當前部署環境的 Base URL
 *
 * 優先順序：
 * 1. 客戶端：使用 window.location.origin
 * 2. 伺服器端 - NEXT_PUBLIC_SITE_URL（生產環境手動設定）
 * 3. 伺服器端 - VERCEL_URL（Vercel 自動設定的當前部署 URL）
 * 4. 降級：localhost:3000（本地開發環境）
 *
 * @returns 完整的 Base URL (含 protocol)
 *
 * @example
 * // 客戶端
 * getBaseUrl() // => "https://chrono-story-search.vercel.app"
 *
 * // 伺服器端（預覽部署）
 * getBaseUrl() // => "https://chrono-story-search-git-feature-xxx.vercel.app"
 *
 * // 伺服器端（本地開發）
 * getBaseUrl() // => "http://localhost:3000"
 */
export function getBaseUrl(): string {
  // 客戶端：直接使用 window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // 伺服器端：檢查環境變數

  // 1. 優先使用 NEXT_PUBLIC_SITE_URL（如果有設定）
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  // 2. 使用 VERCEL_URL（Vercel 自動提供的當前部署 URL）
  // 這在預覽部署時會是預覽 URL，在生產部署時會是生產 URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // 3. 降級：本地開發環境
  return 'http://localhost:3000'
}

/**
 * 取得 OAuth 回調的完整 URL
 *
 * @param callbackPath - 回調路徑（預設為 '/api/auth/callback'）
 * @returns 完整的回調 URL
 *
 * @example
 * getOAuthCallbackUrl()
 * // => "https://chrono-story-search.vercel.app/api/auth/callback"
 *
 * getOAuthCallbackUrl('/api/auth/discord/callback')
 * // => "https://chrono-story-search.vercel.app/api/auth/discord/callback"
 */
export function getOAuthCallbackUrl(callbackPath: string = '/api/auth/callback'): string {
  const baseUrl = getBaseUrl()

  // 確保 callbackPath 以 / 開頭
  const path = callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`

  return `${baseUrl}${path}`
}

/**
 * 取得當前部署環境類型
 *
 * @returns 'production' | 'preview' | 'development'
 *
 * @example
 * getEnvironment() // => "preview"（在 Vercel 預覽部署中）
 * getEnvironment() // => "production"（在生產環境中）
 * getEnvironment() // => "development"（在本地開發中）
 */
export function getEnvironment(): 'production' | 'preview' | 'development' {
  // Vercel 會自動設定 VERCEL_ENV
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV as 'production' | 'preview' | 'development'
  }

  // 如果沒有 VERCEL_ENV，檢查 NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    return 'production'
  }

  return 'development'
}

/**
 * 檢查是否為生產環境
 *
 * @returns boolean
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production'
}

/**
 * 檢查是否為預覽環境
 *
 * @returns boolean
 */
export function isPreview(): boolean {
  return getEnvironment() === 'preview'
}

/**
 * 檢查是否為開發環境
 *
 * @returns boolean
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development'
}
