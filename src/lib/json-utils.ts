/**
 * JSON 資料工具函數
 * 提供從 R2 CDN 載入 JSON 資料的功能
 *
 * 優化效果：
 * - 從 R2 CDN 載入，避免 Webpack chunk 版本不匹配問題
 * - 資料更新無需重新部署 App
 * - 減少 Vercel 建置大小
 */

// Cloudflare R2 Public URL（從環境變數讀取）
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL

// R2 資料目錄
const R2_DATA_PATH = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/data` : ''

/**
 * 根據物品 ID 判斷所在目錄
 * - 1xxxxxx → equipment/
 * - 2xxxxxx → consumable/
 * - 其他 → etc/
 */
function getItemFolder(itemId: number): string {
  const prefix = Math.floor(itemId / 1000000)
  if (prefix === 1) return 'equipment'
  if (prefix === 2) return 'consumable'
  return 'etc'
}

/**
 * 取得物品詳細資料的 CDN URL
 * @param itemId - 物品 ID
 * @returns CDN URL，如：https://cdn.chronostorysearch.com/data/items-organized/equipment/1472021.json
 */
export function getItemDataUrl(itemId: number): string {
  const folder = getItemFolder(itemId)
  return `${R2_DATA_PATH}/items-organized/${folder}/${itemId}.json`
}

/**
 * 取得怪物掉落資料的 CDN URL
 * @param mobId - 怪物 ID
 * @returns CDN URL，如：https://cdn.chronostorysearch.com/data/drops-by-monster/100100.json
 */
export function getMonsterDropsUrl(mobId: number): string {
  return `${R2_DATA_PATH}/drops-by-monster/${mobId}.json`
}

/**
 * 取得物品掉落來源的 CDN URL
 * @param itemId - 物品 ID
 * @returns CDN URL，如：https://cdn.chronostorysearch.com/data/drops-by-item/4000001.json
 */
export function getItemDropsUrl(itemId: number): string {
  return `${R2_DATA_PATH}/drops-by-item/${itemId}.json`
}
