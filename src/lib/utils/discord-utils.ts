/**
 * Discord 工具函數
 *
 * 功能：
 * - 解析 Discord Snowflake ID 獲取時間戳
 * - 計算帳號年齡
 */

/**
 * 從 Discord Snowflake ID 解析建立時間
 *
 * Discord Snowflake 格式（64-bit）：
 * - Bits 63-22: Milliseconds since Discord Epoch (2015-01-01)
 * - Bits 21-17: Internal worker ID
 * - Bits 16-12: Internal process ID
 * - Bits 11-0: Increment
 *
 * @param snowflake Discord Snowflake ID (18-19 位數字字串)
 * @returns Date 物件，表示該 ID 的建立時間
 */
export function parseSnowflakeTimestamp(snowflake: string): Date {
  // Discord Epoch: 2015-01-01T00:00:00.000Z
  const DISCORD_EPOCH = 1420070400000

  // 將 Snowflake 轉為 BigInt，右移 22 位取得毫秒數
  const milliseconds = Number(BigInt(snowflake) >> BigInt(22)) + DISCORD_EPOCH

  return new Date(milliseconds)
}

/**
 * 計算 Discord 帳號年齡（天數）
 *
 * @param snowflake Discord Snowflake ID
 * @returns 帳號年齡（天數）
 */
export function calculateAccountAgeDays(snowflake: string): number {
  const createdAt = parseSnowflakeTimestamp(snowflake)
  const now = new Date()
  const diffMs = now.getTime() - createdAt.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * 檢查 Discord 帳號是否滿足最小年齡要求
 *
 * @param snowflake Discord Snowflake ID
 * @param minAgeDays 最小年齡（天數），預設 365 天（1 年）
 * @returns { valid: boolean, accountAge: number, createdAt: Date }
 */
export function checkAccountAgeRequirement(
  snowflake: string,
  minAgeDays: number = 365
): {
  valid: boolean
  accountAge: number
  createdAt: Date
} {
  const createdAt = parseSnowflakeTimestamp(snowflake)
  const accountAge = calculateAccountAgeDays(snowflake)
  const valid = accountAge >= minAgeDays

  return {
    valid,
    accountAge,
    createdAt
  }
}
