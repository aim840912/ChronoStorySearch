/**
 * Webhook URL 驗證模組
 *
 * 防止 SSRF 攻擊 - 只允許有效的 Discord Webhook URLs
 */

const DISCORD_WEBHOOK_PATTERN = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/

/**
 * 驗證 Webhook URL 是否為有效的 Discord Webhook
 *
 * @param url - 要驗證的 URL
 * @returns true 如果是有效的 Discord Webhook URL 或為空值
 */
export function validateWebhookUrl(url: string): boolean {
  if (!url) return true  // 允許空值
  return DISCORD_WEBHOOK_PATTERN.test(url)
}

/**
 * 驗證 Webhook URL，如果無效則拋出錯誤
 *
 * @param url - 要驗證的 URL
 * @throws Error 如果 URL 無效
 */
export function validateWebhookUrlOrThrow(url: string | null | undefined): void {
  if (!url) return
  if (!validateWebhookUrl(url)) {
    throw new Error('無效的 Discord Webhook URL')
  }
}

/**
 * 驗證 Webhook URL 並透過測試呼叫確認其有效性
 *
 * 功能：
 * - 基本格式驗證
 * - 發送 GET 請求測試 Webhook 是否存在
 * - 不會在頻道中顯示訊息（GET 請求不會發送通知）
 *
 * @param url - 要驗證的 Discord Webhook URL
 * @returns Promise<{ valid: boolean; error?: string }> 驗證結果
 */
export async function validateWebhookUrlWithTest(url: string): Promise<{
  valid: boolean
  error?: string
}> {
  // 基本格式驗證
  if (!DISCORD_WEBHOOK_PATTERN.test(url)) {
    return { valid: false, error: '無效的 Discord Webhook URL 格式' }
  }

  try {
    // 發送測試 GET 請求（不會顯示在頻道中）
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'MapleStory-Trade-Bot/1.0' }
    })

    if (response.status === 404) {
      return { valid: false, error: 'Webhook 不存在或已被刪除' }
    }

    if (response.status === 401) {
      return { valid: false, error: 'Webhook URL 無效或權限不足' }
    }

    if (!response.ok) {
      return { valid: false, error: `Discord API 錯誤: ${response.status}` }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: '無法連接到 Discord API' }
  }
}
