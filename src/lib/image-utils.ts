/**
 * 圖片工具函數
 * 提供圖片路徑獲取功能，避免載入不存在的圖片產生 404 錯誤
 * 強制使用 Cloudflare R2 CDN 以降低 Vercel Edge Requests
 *
 * ✨ 優化功能：
 * - 直接返回 R2 CDN URL
 * - 依賴瀏覽器原生 HTTP 快取機制
 * - 減少應用層複雜度和記憶體佔用
 */

import imageManifest from '@/../data/available-images.json'
import { clientLogger } from './logger'

// Cloudflare R2 Public URL（從環境變數讀取）
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL

// 檢查 R2 URL 是否已設置
if (!R2_PUBLIC_URL) {
  const errorMsg = '環境變數 NEXT_PUBLIC_R2_PUBLIC_URL 未設置！圖片將無法載入'

  if (process.env.NODE_ENV === 'production') {
    // 生產環境：拋出錯誤
    throw new Error(errorMsg)
  } else {
    // 開發環境：使用 logger 記錄警告
    clientLogger.warn(errorMsg)
    clientLogger.warn('請在 .env.local 中設置：NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-a1c4c32d4c65452098ab977db77e349e.r2.dev')
  }
}

// 建立 Set 以加快查找速度
const availableItemImages = new Set(imageManifest.items)
const availableMonsterImages = new Set(imageManifest.monsters)
const availableMonsterGifs = new Set(
  (imageManifest as { 'monsters-gif'?: number[] })['monsters-gif'] || []
)
const availableMonsterDies = new Set(
  (imageManifest as { 'monsters-die'?: number[] })['monsters-die'] || []
)

// 圖片格式類型：png（靜態）, stand（待機GIF）, die（死亡GIF）
export type ImageFormat = 'png' | 'stand' | 'die'

// ==================== 圖片路徑工具函數 ====================

/**
 * 檢查物品圖片是否存在
 * @param itemId 物品 ID
 * @returns 圖片是否存在
 */
export function hasItemImage(itemId: number): boolean {
  return availableItemImages.has(itemId)
}

/**
 * 檢查怪物圖片是否存在
 * @param mobId 怪物 ID
 * @returns 圖片是否存在
 */
export function hasMonsterImage(mobId: number): boolean {
  return availableMonsterImages.has(mobId)
}

/**
 * 檢查怪物 GIF 動圖是否存在（待機動畫）
 * @param mobId 怪物 ID
 * @returns GIF 是否存在
 */
export function hasMonsterGif(mobId: number): boolean {
  return availableMonsterGifs.has(mobId)
}

/**
 * 檢查怪物死亡 GIF 是否存在
 * @param mobId 怪物 ID
 * @returns 死亡 GIF 是否存在
 */
export function hasMonsterDie(mobId: number): boolean {
  return availableMonsterDies.has(mobId)
}

/**
 * 取得物品圖片 URL
 * @param itemId 物品 ID
 * @param fallback 預設圖片路徑（可選）
 * @returns 圖片 URL（使用 R2 CDN，依賴瀏覽器 HTTP 快取）
 */
export function getItemImageUrl(
  itemId: number,
  fallback: string = '/images/items/default.svg'
): string {
  if (!hasItemImage(itemId)) {
    return fallback
  }

  // 強制使用 R2 CDN（不再 fallback 到本地路徑）
  if (!R2_PUBLIC_URL) {
    clientLogger.error(`無法載入物品圖片 ${itemId}：R2_PUBLIC_URL 未設置`)
    return fallback
  }

  return `${R2_PUBLIC_URL}/images/items/${itemId}.png`
}

/**
 * 取得怪物圖片 URL
 * @param mobId 怪物 ID
 * @param options 選項
 * @param options.format 圖片格式（png, stand, hit, die）
 * @param options.fallback 預設圖片路徑
 * @returns 圖片 URL（使用 R2 CDN，依賴瀏覽器 HTTP 快取）
 */
export function getMonsterImageUrl(
  mobId: number,
  options: {
    format?: ImageFormat
    fallback?: string
  } = {}
): string {
  const { format = 'png', fallback = '/images/monsters/default.svg' } = options

  // 檢查 PNG 是否存在
  if (!hasMonsterImage(mobId)) {
    return fallback
  }

  // 強制使用 R2 CDN
  if (!R2_PUBLIC_URL) {
    clientLogger.error(`無法載入怪物圖片 ${mobId}：R2_PUBLIC_URL 未設置`)
    return fallback
  }

  // 根據格式返回對應的圖片
  switch (format) {
    case 'stand':
      // 待機動畫（原本的 GIF）
      if (hasMonsterGif(mobId)) {
        return `${R2_PUBLIC_URL}/images/monsters-gif/${mobId}.gif`
      }
      break
    case 'die':
      // 死亡動畫
      if (hasMonsterDie(mobId)) {
        return `${R2_PUBLIC_URL}/images/monsters-die/${mobId}.gif`
      }
      break
  }

  // 預設返回 PNG
  return `${R2_PUBLIC_URL}/images/monsters/${mobId}.png`
}
