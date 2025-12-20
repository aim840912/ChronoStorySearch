/**
 * EXP 計算邏輯
 * 計算經驗統計和升級時間預估
 */

import type { ExpRecord, ExpStats } from '@/types/exp-tracker'

/**
 * 計算經驗統計
 * @param history 經驗歷史記錄
 * @returns 統計資訊
 */
export function calculateExpStats(history: ExpRecord[]): ExpStats {
  const defaultStats: ExpStats = {
    expPerMinute: 0,
    expPer10Minutes: 0,
    expPerHour: 0,
    timeToLevelUp: null,
  }

  if (history.length < 2) {
    return defaultStats
  }

  // 取得時間範圍
  const firstRecord = history[0]
  const lastRecord = history[history.length - 1]
  const timeRangeMs = lastRecord.timestamp - firstRecord.timestamp

  if (timeRangeMs <= 0) {
    return defaultStats
  }

  // 計算總經驗增長（只計算正向增長）
  let totalExpGain = 0
  for (let i = 1; i < history.length; i++) {
    const diff = history[i].exp - history[i - 1].exp
    if (diff > 0) {
      totalExpGain += diff
    }
  }

  // 轉換為分鐘
  const timeRangeMinutes = timeRangeMs / (1000 * 60)

  // 計算每分鐘經驗
  const expPerMinute =
    timeRangeMinutes > 0 ? totalExpGain / timeRangeMinutes : 0

  return {
    expPerMinute: Math.round(expPerMinute),
    expPer10Minutes: Math.round(expPerMinute * 10),
    expPerHour: Math.round(expPerMinute * 60),
    timeToLevelUp: null, // 需要額外資訊計算
  }
}

/**
 * 計算升級所需時間
 * @param currentExp 當前經驗值
 * @param expToNextLevel 升級所需經驗
 * @param expPerHour 每小時經驗
 * @returns 升級所需秒數，null 表示無法計算
 */
export function calculateTimeToLevelUp(
  currentExp: number,
  expToNextLevel: number,
  expPerHour: number
): number | null {
  if (expPerHour <= 0 || expToNextLevel <= currentExp) {
    return null
  }

  const remainingExp = expToNextLevel - currentExp
  const hoursNeeded = remainingExp / expPerHour
  return Math.round(hoursNeeded * 3600) // 轉換為秒
}

/**
 * 格式化時間為可讀字串
 * @param seconds 秒數
 * @returns 格式化的時間字串
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }

  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}d ${remainingHours}h ${mins}m`
  }

  return `${hours}h ${mins}m`
}

/**
 * 格式化經驗數值（加入千分位）
 * @param exp 經驗值
 * @returns 格式化的經驗字串
 */
export function formatExp(exp: number): string {
  return exp.toLocaleString()
}

/**
 * 將歷史記錄匯出為 CSV
 * @param history 經驗歷史記錄
 * @returns CSV 字串
 */
export function exportHistoryToCsv(history: ExpRecord[]): string {
  const headers = ['Timestamp', 'EXP', 'Confidence']
  const rows = history.map((record) => [
    new Date(record.timestamp).toISOString(),
    record.exp.toString(),
    record.confidence.toFixed(2),
  ])

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

  return csvContent
}

/**
 * 觸發 CSV 下載
 * @param history 經驗歷史記錄
 * @param filename 檔案名稱
 */
export function downloadCsv(history: ExpRecord[], filename?: string): void {
  const csvContent = exportHistoryToCsv(history)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const finalFilename = filename || `exp-history_${timestamp}.csv`

  const a = document.createElement('a')
  a.href = url
  a.download = finalFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
