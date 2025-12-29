/**
 * OCR 文字正規化工具
 * 解決 OCR 辨識遊戲字體時產生的非標準字元問題
 */

/**
 * 正規化 OCR 文字（全形轉半形、相似字元轉換）
 */
export function normalizeOcrText(text: string): string {
  return text
    // 全形英文字母轉半形 (Ａ-Ｚ → A-Z)
    .replace(/[Ａ-Ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[ａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    // 全形數字轉半形 (０-９ → 0-9)
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    // 常見相似字元替換
    .replace(/[×✕✖Ｘ]/g, 'X')
    .replace(/[—–－]/g, '-')
    .replace(/[，]/g, ',')
    .replace(/[．]/g, '.')
    .replace(/[％]/g, '%')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    // 移除零寬字元和不可見字元
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
}

/**
 * 檢查文字是否包含 EXP 關鍵字（含誤讀容錯）
 */
export function containsExpKeyword(text: string, keywords: string[]): boolean {
  const normalizedUpper = normalizeOcrText(text).toUpperCase()
  return keywords.some(kw => normalizedUpper.includes(kw))
}

/**
 * 從文字中提取最大的數字（用於經驗值識別）
 */
export function extractLargestNumber(text: string, pattern: RegExp): string | null {
  const matches = text.match(pattern)
  if (!matches || matches.length === 0) return null

  return matches.reduce((max, num) => {
    const numValue = parseInt(num.replace(/,/g, ''), 10)
    const maxValue = parseInt(max.replace(/,/g, ''), 10)
    return numValue > maxValue ? num : max
  })
}
