/**
 * 多關鍵字匹配函數
 * 將搜尋詞按空格拆分，檢查所有關鍵字是否都存在於目標文字中
 * @param text - 要搜尋的目標文字
 * @param searchTerm - 搜尋詞（可包含多個空格分隔的關鍵字）
 * @returns 是否所有關鍵字都匹配
 * @example
 * matchesAllKeywords("Scroll for Wand for Magic ATT 10%", "magic 10") // true
 * matchesAllKeywords("Blue Mana Potion", "blue potion") // true
 * matchesAllKeywords("Orange Mushroom", "red mushroom") // false (缺少 "red")
 */
export function matchesAllKeywords(text: string, searchTerm: string): boolean {
  const keywords = searchTerm.toLowerCase().trim().split(/\s+/)
  const textLower = text.toLowerCase()

  return keywords.every(keyword => textLower.includes(keyword))
}
