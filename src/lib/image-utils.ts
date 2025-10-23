/**
 * 圖片工具函數
 * 提供圖片路徑獲取功能，避免載入不存在的圖片產生 404 錯誤
 * 強制使用 Cloudflare R2 CDN 以降低 Vercel Edge Requests
 *
 * ✨ 優化功能：
 * - 應用層記憶體快取：同一 session 內圖片只下載一次
 * - Blob URL 快取：減少網路請求，提升效能
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

// ==================== 圖片快取系統 ====================

/**
 * 圖片快取 Map：儲存已載入的圖片 Blob URL
 * Key: 完整的圖片 URL
 * Value: Blob URL 或載入中的 Promise
 */
const imageCache = new Map<string, string | Promise<string>>()

/**
 * 快取統計（開發模式使用）
 */
const cacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
}

/**
 * 預載入圖片並快取為 Blob URL
 * @param url 圖片 URL
 * @returns Blob URL 或原始 URL（如果載入失敗）
 */
async function preloadAndCacheImage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)

    // 將 Blob URL 存入快取
    imageCache.set(url, blobUrl)

    if (process.env.NODE_ENV === 'development') {
      clientLogger.info(`圖片已快取: ${url.split('/').pop()}`)
    }

    return blobUrl
  } catch (error) {
    cacheStats.errors++
    clientLogger.warn(`圖片預載入失敗: ${url}`, error)

    // 載入失敗時，快取原始 URL（避免重複嘗試）
    imageCache.set(url, url)
    return url
  }
}

/**
 * 獲取圖片 URL（帶快取）
 * @param url 原始圖片 URL
 * @returns Blob URL 或原始 URL
 */
export function getCachedImageUrl(url: string): string {
  // 檢查快取
  const cached = imageCache.get(url)

  if (cached) {
    if (typeof cached === 'string') {
      // 已經載入完成
      cacheStats.hits++
      return cached
    }
    // 正在載入中，返回原始 URL（載入完成後會自動更新）
    return url
  }

  // 快取未命中，開始預載入
  cacheStats.misses++
  const loadingPromise = preloadAndCacheImage(url)
  imageCache.set(url, loadingPromise)

  // 返回原始 URL（不阻塞渲染）
  return url
}

/**
 * 批次預載入圖片
 * @param urls 圖片 URL 陣列
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const uncachedUrls = urls.filter(url => !imageCache.has(url))

  if (uncachedUrls.length === 0) return

  if (process.env.NODE_ENV === 'development') {
    clientLogger.info(`批次預載入 ${uncachedUrls.length} 張圖片`)
  }

  // 批次載入（限制並發數為 6，避免阻塞）
  const CONCURRENT_LIMIT = 6
  for (let i = 0; i < uncachedUrls.length; i += CONCURRENT_LIMIT) {
    const batch = uncachedUrls.slice(i, i + CONCURRENT_LIMIT)
    await Promise.allSettled(batch.map(url => preloadAndCacheImage(url)))
  }
}

/**
 * 清除圖片快取（釋放記憶體）
 */
export function clearImageCache(): void {
  // 釋放所有 Blob URL
  imageCache.forEach((value) => {
    if (typeof value === 'string' && value.startsWith('blob:')) {
      URL.revokeObjectURL(value)
    }
  })

  imageCache.clear()

  if (process.env.NODE_ENV === 'development') {
    clientLogger.info('圖片快取已清除')
  }
}

/**
 * 獲取快取統計（開發模式）
 */
export function getImageCacheStats() {
  return {
    ...cacheStats,
    cacheSize: imageCache.size,
    hitRate: cacheStats.hits + cacheStats.misses > 0
      ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) + '%'
      : '0%',
  }
}

// 開發模式：將快取統計暴露到 window
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__IMAGE_CACHE_STATS__ = getImageCacheStats
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
 * 取得物品圖片 URL（帶快取）
 * @param itemId 物品 ID
 * @param fallback 預設圖片路徑（可選）
 * @param useCache 是否使用快取（預設 true）
 * @returns 圖片 URL（強制使用 R2 CDN，帶記憶體快取）
 */
export function getItemImageUrl(
  itemId: number,
  fallback: string = '/images/items/default.svg',
  useCache: boolean = true
): string {
  if (!hasItemImage(itemId)) {
    return fallback
  }

  // 強制使用 R2 CDN（不再 fallback 到本地路徑）
  if (!R2_PUBLIC_URL) {
    clientLogger.error(`無法載入物品圖片 ${itemId}：R2_PUBLIC_URL 未設置`)
    return fallback
  }

  const url = `${R2_PUBLIC_URL}/images/items/${itemId}.png`

  // 使用快取系統（僅在瀏覽器環境）
  if (useCache && typeof window !== 'undefined') {
    return getCachedImageUrl(url)
  }

  return url
}

/**
 * 取得怪物圖片 URL（帶快取）
 * @param mobId 怪物 ID
 * @param fallback 預設圖片路徑（可選）
 * @param useCache 是否使用快取（預設 true）
 * @returns 圖片 URL（強制使用 R2 CDN，帶記憶體快取）
 */
export function getMonsterImageUrl(
  mobId: number,
  fallback: string = '/images/monsters/default.svg',
  useCache: boolean = true
): string {
  if (!hasMonsterImage(mobId)) {
    return fallback
  }

  // 強制使用 R2 CDN（不再 fallback 到本地路徑）
  if (!R2_PUBLIC_URL) {
    clientLogger.error(`無法載入怪物圖片 ${mobId}：R2_PUBLIC_URL 未設置`)
    return fallback
  }

  const url = `${R2_PUBLIC_URL}/images/monsters/${mobId}.png`

  // 使用快取系統（僅在瀏覽器環境）
  if (useCache && typeof window !== 'undefined') {
    return getCachedImageUrl(url)
  }

  return url
}
