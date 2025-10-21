/**
 * 圖片工具函數
 * 提供圖片路徑獲取功能，避免載入不存在的圖片產生 404 錯誤
 * 強制使用 Cloudflare R2 CDN 以降低 Vercel Edge Requests
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
 * 取得物品圖片 URL
 * @param itemId 物品 ID
 * @param fallback 預設圖片路徑（可選）
 * @returns 圖片 URL（強制使用 R2 CDN）
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
 * @param fallback 預設圖片路徑（可選）
 * @returns 圖片 URL（強制使用 R2 CDN）
 */
export function getMonsterImageUrl(
  mobId: number,
  fallback: string = '/images/monsters/default.svg'
): string {
  if (!hasMonsterImage(mobId)) {
    return fallback
  }

  // 強制使用 R2 CDN（不再 fallback 到本地路徑）
  if (!R2_PUBLIC_URL) {
    clientLogger.error(`無法載入怪物圖片 ${mobId}：R2_PUBLIC_URL 未設置`)
    return fallback
  }

  return `${R2_PUBLIC_URL}/images/monsters/${mobId}.png`
}
