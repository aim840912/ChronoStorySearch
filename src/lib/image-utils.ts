/**
 * 圖片工具函數
 * 提供圖片路徑獲取功能，避免載入不存在的圖片產生 404 錯誤
 */

import imageManifest from '@/../data/available-images.json'

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
 * @returns 圖片 URL
 */
export function getItemImageUrl(
  itemId: number,
  fallback: string = '/images/items/default.svg'
): string {
  if (itemId === 0) return fallback
  return hasItemImage(itemId) ? `/images/items/${itemId}.png` : fallback
}

/**
 * 取得怪物圖片 URL
 * @param mobId 怪物 ID
 * @param fallback 預設圖片路徑（可選）
 * @returns 圖片 URL
 */
export function getMonsterImageUrl(
  mobId: number,
  fallback: string = '/images/monsters/default.svg'
): string {
  return hasMonsterImage(mobId) ? `/images/monsters/${mobId}.png` : fallback
}
