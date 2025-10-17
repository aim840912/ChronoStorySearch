import type { Language } from '@/types'

/**
 * 智能顯示名稱函數
 * 根據語言設定顯示對應名稱，若中文名稱為 null 則自動 fallback 到英文
 *
 * @param englishName - 英文名稱（必定存在）
 * @param chineseName - 中文名稱（可能為 null 或 undefined）
 * @param language - 當前語言設定
 * @returns 顯示用的名稱
 *
 * @example
 * // 有中文名稱
 * getDisplayName("Snail", "嫩寶", "zh-TW") // => "嫩寶"
 * getDisplayName("Snail", "嫩寶", "en") // => "Snail"
 *
 * // 無中文名稱（fallback）
 * getDisplayName("Amherst Crate", null, "zh-TW") // => "Amherst Crate"
 * getDisplayName("Amherst Crate", null, "en") // => "Amherst Crate"
 */
export function getDisplayName(
  englishName: string,
  chineseName: string | null | undefined,
  language: Language
): string {
  // 如果選擇中文且有中文名稱，顯示中文
  if (language === 'zh-TW' && chineseName) {
    return chineseName
  }

  // 其他情況（英文模式 或 中文名稱為 null）顯示英文
  return englishName
}

/**
 * 獲取怪物顯示名稱
 */
export function getMonsterDisplayName(
  mobName: string,
  chineseMobName: string | null | undefined,
  language: Language
): string {
  return getDisplayName(mobName, chineseMobName, language)
}

/**
 * 獲取物品顯示名稱
 */
export function getItemDisplayName(
  itemName: string,
  chineseItemName: string | null | undefined,
  language: Language
): string {
  return getDisplayName(itemName, chineseItemName, language)
}
