/**
 * 行為模式檢測器（⚠️ 當前已禁用，保留以備未來需要）
 *
 * ⚠️ 重要提示：此模組已在「階段 6：Redis 使用優化」中全面禁用
 *
 * **禁用原因**：
 * - 每次請求需要 6 個 Redis 命令（高頻檢測 3 個 + 掃描檢測 3 個）
 * - 預估影響：每日增加 ~4,000 Redis 命令（假設 1,000 請求/天）
 * - Rate Limiting（滑動窗口）已提供充足的防護
 *
 * **當前狀態**：
 * - 所有 API 端點配置 `enableBehaviorDetection: false`
 * - 詳見：
 *   - src/app/api/market/trending/route.ts (第 92 行)
 *   - src/app/api/market/search/route.ts (第 391 行)
 *   - src/app/api/listings/route.ts (第 366, 378 行)
 *
 * **如需重新啟用**：
 * 1. 評估 Redis 免費額度影響（10,000 命令/天上限）
 * 2. 修改 API 端點配置：`enableBehaviorDetection: true`
 * 3. 監控 Upstash Dashboard 確認不超標
 *
 * **替代方案**：
 * - 保持使用 Rate Limiting（滑動窗口）
 * - 僅在最高風險端點啟用 Behavior Detection
 *
 * @see docs/architecture/交易系統/08-實作路線圖.md（階段 6）
 * @deprecated 當前已禁用，優先使用 Rate Limiting
 *
 * ---
 *
 * 功能：
 * 1. 高頻訪問檢測：檢測 1 小時內超過閾值次請求
 * 2. 掃描行為檢測：檢測 1 分鐘內訪問超過閾值個不同端點
 *
 * 設計理念：
 * - 使用 Redis 記錄訪問模式
 * - 自動過期機制（避免資料累積）
 * - 容錯設計（失敗時假定無異常）
 */

import { redis } from '@/lib/redis/client'
import { apiLogger } from '@/lib/logger'
import { BehaviorDetectionResult } from './types'
import { BEHAVIOR_THRESHOLDS } from './constants'

/**
 * 高頻訪問檢測
 *
 * 檢測某個 IP 在指定時間窗口內是否超過訪問閾值
 *
 * @param ip - IP 地址
 * @param endpoint - API 端點路徑
 * @param threshold - 閾值（預設 50 次）
 * @param window - 時間窗口（秒，預設 3600 = 1 小時）
 * @returns 行為檢測結果
 *
 * @example
 * ```typescript
 * const result = await detectHighFrequency('192.168.1.1', '/api/market/trending')
 * if (result.isAbnormal) {
 *   // 檢測到高頻訪問
 *   throw new RateLimitError('檢測到異常訪問頻率')
 * }
 * ```
 */
export async function detectHighFrequency(
  ip: string,
  endpoint: string,
  threshold: number = BEHAVIOR_THRESHOLDS.HIGH_FREQUENCY.threshold,
  window: number = BEHAVIOR_THRESHOLDS.HIGH_FREQUENCY.window
): Promise<BehaviorDetectionResult> {
  const key = `hf:${ip}:${endpoint}`

  try {
    // 計數器遞增
    const count = await redis.incr(key)

    // 第一次訪問：設定過期時間
    if (count === 1) {
      await redis.expire(key, window)
    }

    // 檢查是否超過閾值
    if (count > threshold) {
      apiLogger.warn('高頻訪問檢測', {
        ip,
        endpoint,
        count,
        threshold,
        window,
      })

      return {
        isAbnormal: true,
        type: 'high_frequency',
        count,
        threshold,
        details: `${count} 次請求 / ${window} 秒（閾值: ${threshold}）`,
      }
    }

    // 正常訪問
    return {
      isAbnormal: false,
      type: 'none',
      count,
      threshold,
    }
  } catch (error) {
    apiLogger.error('高頻訪問檢測失敗', { error, ip, endpoint })

    // 容錯：假定無異常
    return {
      isAbnormal: false,
      type: 'none',
    }
  }
}

/**
 * 掃描行為檢測
 *
 * 檢測某個 IP 在短時間內是否訪問過多不同端點（可能是掃描工具）
 *
 * @param ip - IP 地址
 * @param path - 當前訪問路徑
 * @param threshold - 閾值（預設 20 個不同端點）
 * @param window - 時間窗口（秒，預設 60 = 1 分鐘）
 * @returns 行為檢測結果
 *
 * @example
 * ```typescript
 * const result = await detectScanning('192.168.1.1', '/api/test-endpoint-1')
 * if (result.isAbnormal) {
 *   // 檢測到掃描行為
 *   throw new RateLimitError('檢測到掃描行為')
 * }
 * ```
 */
export async function detectScanning(
  ip: string,
  path: string,
  threshold: number = BEHAVIOR_THRESHOLDS.SCANNING.threshold,
  window: number = BEHAVIOR_THRESHOLDS.SCANNING.window
): Promise<BehaviorDetectionResult> {
  const key = `scan:${ip}`

  try {
    // 將路徑加入 Set（Redis SADD）
    await redis.sadd(key, path)

    // 設定過期時間
    await redis.expire(key, window)

    // 查詢 Set 大小（Redis SCARD）
    const uniquePaths = await redis.scard(key)

    // 檢查是否超過閾值
    if (uniquePaths > threshold) {
      apiLogger.warn('掃描行為檢測', {
        ip,
        uniquePaths,
        threshold,
        window,
        latestPath: path,
      })

      return {
        isAbnormal: true,
        type: 'scanning',
        count: uniquePaths,
        threshold,
        details: `${uniquePaths} 個不同端點 / ${window} 秒（閾值: ${threshold}）`,
      }
    }

    // 正常訪問
    return {
      isAbnormal: false,
      type: 'none',
      count: uniquePaths,
      threshold,
    }
  } catch (error) {
    apiLogger.error('掃描行為檢測失敗', { error, ip, path })

    // 容錯：假定無異常
    return {
      isAbnormal: false,
      type: 'none',
    }
  }
}

/**
 * 綜合行為檢測（同時執行高頻和掃描檢測）
 *
 * @param ip - IP 地址
 * @param path - 當前訪問路徑
 * @returns 綜合檢測結果（任一異常即返回 true）
 */
export async function detectAbnormalBehavior(
  ip: string,
  path: string
): Promise<BehaviorDetectionResult> {
  try {
    // 並行執行兩種檢測（提升效能）
    const [highFreqResult, scanResult] = await Promise.all([
      detectHighFrequency(ip, path),
      detectScanning(ip, path),
    ])

    // 任一檢測異常即返回
    if (highFreqResult.isAbnormal) {
      return highFreqResult
    }

    if (scanResult.isAbnormal) {
      return scanResult
    }

    // 均正常
    return {
      isAbnormal: false,
      type: 'none',
    }
  } catch (error) {
    apiLogger.error('綜合行為檢測失敗', { error, ip, path })

    // 容錯：假定無異常
    return {
      isAbnormal: false,
      type: 'none',
    }
  }
}
