/**
 * 圖片工具函數
 * 提供圖片路徑獲取功能，避免載入不存在的圖片產生 404 錯誤
 * 強制使用 Cloudflare R2 CDN 以降低 Vercel Edge Requests
 *
 * ✨ 優化功能：
 * - 直接返回 R2 CDN URL
 * - 依賴瀏覽器原生 HTTP 快取機制
 * - 減少應用層複雜度和記憶體佔用
 * - 支援 Cache Busting（透過 r2-versions.json 管理版本號）
 */

import imageManifest from '@/../data/available-images.json'
import r2Versions from '@/../data/r2-versions.json'
import { clientLogger } from './logger'

// 版本資料類型
type R2Versions = typeof r2Versions

/**
 * 取得圖片版本查詢參數
 * @param category 圖片類別（items, monsters, monsters-gif, monsters-die, monsters-hit）
 * @param id 圖片 ID
 * @returns 版本查詢字串（如 ?v=2）或空字串
 */
function getImageVersionQuery(
  category: keyof R2Versions['images'],
  id: number
): string {
  const version = (r2Versions.images[category] as Record<string, string>)?.[
    String(id)
  ]
  return version ? `?v=${version}` : ''
}

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
const availableMonsterHits = new Set(
  (imageManifest as { 'monsters-hit'?: number[] })['monsters-hit'] || []
)

// 圖片格式類型：png（靜態）, stand（待機GIF）, hit（受擊GIF）, die（死亡GIF）
export type ImageFormat = 'png' | 'stand' | 'hit' | 'die'

// 卷軸成功率圖示支援的百分比
const SCROLL_SUCCESS_RATES = [10, 15, 30, 60, 70, 100] as const

/**
 * 從物品名稱解析卷軸成功率
 * @param itemName 物品名稱（如 "Scroll for Helmet for Defense 60%"）
 * @returns 成功率數字或 null
 */
function extractScrollSuccessRate(itemName: string): number | null {
  const match = itemName.match(/(\d+)%/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * 檢查物品是否為卷軸
 * 卷軸 ID 範圍: 2040000 - 2049999
 */
export function isScrollItem(itemId: number): boolean {
  return itemId >= 2040000 && itemId < 2050000
}

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
 * 檢查怪物受擊 GIF 是否存在
 * @param mobId 怪物 ID
 * @returns 受擊 GIF 是否存在
 */
export function hasMonsterHit(mobId: number): boolean {
  return availableMonsterHits.has(mobId)
}

/**
 * 取得物品圖片 URL
 * @param itemId 物品 ID
 * @param options 選項
 * @param options.fallback 預設圖片路徑
 * @param options.itemName 物品名稱（用於卷軸成功率解析）
 * @returns 圖片 URL（使用 R2 CDN，依賴瀏覽器 HTTP 快取）
 */
export function getItemImageUrl(
  itemId: number,
  options: {
    fallback?: string
    itemName?: string
  } = {}
): string {
  const { fallback = '/images/items/default.svg', itemName } = options

  // 強制使用 R2 CDN（不再 fallback 到本地路徑）
  if (!R2_PUBLIC_URL) {
    clientLogger.error(`無法載入物品圖片 ${itemId}：R2_PUBLIC_URL 未設置`)
    return fallback
  }

  // 卷軸特殊處理：根據成功率顯示對應圖示
  if (isScrollItem(itemId) && itemName) {
    const successRate = extractScrollSuccessRate(itemName)
    if (successRate && SCROLL_SUCCESS_RATES.includes(successRate as typeof SCROLL_SUCCESS_RATES[number])) {
      return `${R2_PUBLIC_URL}/images/scrolls/${successRate}.png`
    }
  }

  if (!hasItemImage(itemId)) {
    return fallback
  }

  // 加入版本查詢參數（Cache Busting）
  const versionQuery = getImageVersionQuery('items', itemId)
  return `${R2_PUBLIC_URL}/images/items/${itemId}.png${versionQuery}`
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

  // 根據格式返回對應的圖片（加入版本查詢參數）
  switch (format) {
    case 'stand':
      // 待機動畫（原本的 GIF）
      if (hasMonsterGif(mobId)) {
        const versionQuery = getImageVersionQuery('monsters-gif', mobId)
        return `${R2_PUBLIC_URL}/images/monsters-gif/${mobId}.gif${versionQuery}`
      }
      break
    case 'hit':
      // 受擊動畫
      if (hasMonsterHit(mobId)) {
        const versionQuery = getImageVersionQuery('monsters-hit', mobId)
        return `${R2_PUBLIC_URL}/images/monsters-hit/${mobId}.gif${versionQuery}`
      }
      break
    case 'die':
      // 死亡動畫
      if (hasMonsterDie(mobId)) {
        const versionQuery = getImageVersionQuery('monsters-die', mobId)
        return `${R2_PUBLIC_URL}/images/monsters-die/${mobId}.gif${versionQuery}`
      }
      break
  }

  // 預設返回 PNG（加入版本查詢參數）
  const versionQuery = getImageVersionQuery('monsters', mobId)
  return `${R2_PUBLIC_URL}/images/monsters/${mobId}.png${versionQuery}`
}
