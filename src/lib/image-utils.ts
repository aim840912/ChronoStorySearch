/**
 * 圖片工具函數
 * 提供圖片路徑獲取功能，避免載入不存在的圖片產生 404 錯誤
 * 支援 Cloudflare R2 CDN 以降低 Vercel Edge Requests
 */

import imageManifest from '@/../data/available-images.json'

// Cloudflare R2 Public URL（從環境變數讀取）
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL

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
 * @returns 圖片 URL（優先使用 R2 CDN）
 */
export function getItemImageUrl(
  itemId: number,
  fallback: string = '/images/items/default.svg'
): string {
  if (!hasItemImage(itemId)) {
    return fallback
  }

  // 如果設定了 R2 Public URL，使用 R2 CDN
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/images/items/${itemId}.png`
  }

  // 否則使用本地路徑（向後兼容）
  return `/images/items/${itemId}.png`
}

/**
 * 取得怪物圖片 URL
 * @param mobId 怪物 ID
 * @param fallback 預設圖片路徑（可選）
 * @returns 圖片 URL（優先使用 R2 CDN）
 */
export function getMonsterImageUrl(
  mobId: number,
  fallback: string = '/images/monsters/default.svg'
): string {
  if (!hasMonsterImage(mobId)) {
    return fallback
  }

  // 如果設定了 R2 Public URL，使用 R2 CDN
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/images/monsters/${mobId}.png`
  }

  // 否則使用本地路徑（向後兼容）
  return `/images/monsters/${mobId}.png`
}
