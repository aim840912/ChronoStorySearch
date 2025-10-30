/**
 * IP 配額管理模組 - 使用 Redis 原子操作防止 Race Condition
 */

import { redis } from '@/lib/redis/client'
import { apiLogger } from '@/lib/logger'

/**
 * 檢查並遞增 IP 配額（原子操作）
 *
 * @param ip - 使用者 IP
 * @param quotaKey - Redis key
 * @param maxQuota - 最大配額
 * @param ttlSeconds - 過期時間（秒）
 * @returns { allowed: boolean, remaining: number }
 */
export async function checkAndIncrementIpQuota(
  ip: string,
  quotaKey: string,
  maxQuota: number,
  ttlSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    // 使用 Lua script 確保 INCR + EXPIRE 的原子性
    // 防止在 INCR 後、EXPIRE 前程序崩潰導致 key 永不過期
    const luaScript = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      local max_quota = tonumber(ARGV[2])
      if current > max_quota then
        return {0, 0, current}
      else
        return {1, max_quota - current, current}
      end
    `

    const result = (await redis.eval(
      luaScript,
      [quotaKey],
      [ttlSeconds.toString(), maxQuota.toString()]
    )) as [number, number, number]

    const [allowedNum, remaining, currentCount] = result
    const allowed = allowedNum === 1

    if (!allowed) {
      apiLogger.warn('IP 配額已達上限', {
        ip,
        quotaKey,
        currentCount,
        maxQuota
      })
      return { allowed: false, remaining: 0 }
    }

    apiLogger.debug('IP 配額檢查通過', {
      ip,
      quotaKey,
      currentCount,
      remaining
    })

    return {
      allowed: true,
      remaining
    }
  } catch (error) {
    apiLogger.error('IP 配額檢查失敗', {
      error,
      ip,
      quotaKey
    })
    // 錯誤時預設允許通過（避免 Redis 故障影響正常使用）
    return { allowed: true, remaining: maxQuota }
  }
}

/**
 * 獲取當前 IP 配額使用情況
 *
 * @param quotaKey - Redis key
 * @param maxQuota - 最大配額
 * @returns { used: number, remaining: number }
 */
export async function getIpQuotaStatus(
  quotaKey: string,
  maxQuota: number
): Promise<{ used: number; remaining: number }> {
  try {
    const count = await redis.get(quotaKey)
    const used = count ? parseInt(count as string, 10) : 0
    return {
      used,
      remaining: Math.max(0, maxQuota - used)
    }
  } catch (error) {
    apiLogger.error('獲取 IP 配額狀態失敗', {
      error,
      quotaKey
    })
    return { used: 0, remaining: maxQuota }
  }
}
