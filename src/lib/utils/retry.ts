/**
 * 通用重試工具 - 支援指數退避和線性退避
 *
 * 使用情境：
 * - API 調用失敗時自動重試
 * - 處理暫時性錯誤（網路問題、Rate Limit）
 * - 區分可重試和不可重試的錯誤
 */

export class RetryableError extends Error {
  constructor(
    message: string,
    public shouldRetry: boolean = true
  ) {
    super(message)
    this.name = 'RetryableError'
  }
}

export interface RetryOptions {
  /** 最大重試次數（預設 3 次） */
  retries?: number
  /** 退避策略：線性或指數（預設 exponential） */
  backoff?: 'linear' | 'exponential'
  /** 初始延遲時間（毫秒，預設 1000ms） */
  initialDelay?: number
  /** 最大延遲時間（毫秒，預設 10000ms） */
  maxDelay?: number
}

/**
 * 執行可重試的函數
 *
 * @param fn - 要執行的非同步函數
 * @param options - 重試選項
 * @returns 函數執行結果
 * @throws 最後一次嘗試的錯誤
 *
 * @example
 * ```ts
 * const result = await retry(async () => {
 *   const response = await fetch('https://api.example.com/data')
 *   if (!response.ok) {
 *     throw new RetryableError('API 錯誤', response.status >= 500)
 *   }
 *   return response.json()
 * }, { retries: 3, backoff: 'exponential' })
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    backoff = 'exponential',
    initialDelay = 1000,
    maxDelay = 10000
  } = options

  let lastError: Error

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // 如果是 RetryableError 且標記為不可重試，立即拋出
      if (error instanceof RetryableError && !error.shouldRetry) {
        throw error
      }

      // 最後一次嘗試後不再重試
      if (attempt === retries) {
        break
      }

      // 計算延遲時間
      const delay = backoff === 'exponential'
        ? Math.min(initialDelay * Math.pow(2, attempt), maxDelay)
        : Math.min(initialDelay * (attempt + 1), maxDelay)

      // 延遲後重試
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}
