/**
 * OCR 常數定義
 * 自動偵測 EXP 區域使用的掃描參數和正則表達式
 */

// 掃描參數（擴大範圍以提高偵測率）
export const BOTTOM_SCAN_RATIO = 0.12   // 掃描底部 12%
export const CENTER_SCAN_RATIO = 0.70   // 掃描中間 70% 寬度
export const SCALE = 3                  // 放大倍率
export const MIN_CONFIDENCE = 10        // 最低信心度閾值（降低以適應遊戲字體）
export const MAX_DETECT_TIME = 30000    // 最大偵測時間（30 秒），防止無限掃描

// 基準解析度的掃描參數（以 640px 寬為基準）
export const BASE_WIDTH = 640
export const BASE_REGION_HEIGHT = 35     // 條帶高度
export const BASE_SCAN_STRIDE = 12       // 掃描間隔
export const BASE_EXP_REGION_WIDTH = 150 // EXP 標籤區域寬度
export const BASE_X_STEP = 50            // X 方向掃描步進

// OCR 關鍵字容錯（常見誤讀變體，包含全形和相似字元）
export const EXP_KEYWORDS = [
  'EXP', 'EXR', 'FXP', 'EXB', 'EXF', 'FXR', 'EKP', 'EXD', 'EX9',
  'EYP', 'EAP', 'ENP', 'EVP', // 常見 OCR 誤讀
  'E×P', // 乘號代替 X
]

// 經驗值數字格式 - 專門匹配 EXP 後面的數字
export const EXP_AFTER_PATTERN = /(?:EXP|EXR|FXP|EXB|EXF|FXR|EKP)\s*[:\s]*(\d{1,3}(?:,\d{3})+|\d{4,})/i
// 備用：匹配任意大數字（4位以上或帶逗號）
export const ANY_NUMBER_PATTERN = /\d{1,3}(?:,\d{3})+|\d{4,}/g
// 備用策略：「大數字 + 百分比」模式（MapleStory EXP 特徵）
// 支援格式：983,500 (73.77% 或 983,500 73.77%
export const EXP_PATTERN_FALLBACK = /(\d{1,3}(?:,\d{3})+|\d{4,})\s*[\s\/]*\s*[([]?\s*(\d{1,3}\.\d{1,2})\s*%/

// 預處理模式配置
export interface PreprocessMode {
  name: string
  threshold: number
  invert: boolean
  useRaw: boolean
}

export const LABEL_PREPROCESSING_MODES: PreprocessMode[] = [
  { name: 'raw', threshold: 0, invert: false, useRaw: true },
  { name: 'binary-128', threshold: 128, invert: false, useRaw: false },
  { name: 'binary-128-inv', threshold: 128, invert: true, useRaw: false },
]

export const NUMBER_PREPROCESSING_MODES: PreprocessMode[] = [
  { name: 'raw', threshold: 0, invert: false, useRaw: true },
  { name: 'binary-128', threshold: 128, invert: false, useRaw: false },
  { name: 'binary-128-inv', threshold: 128, invert: true, useRaw: false },
  { name: 'binary-80', threshold: 80, invert: false, useRaw: false },
  { name: 'binary-180', threshold: 180, invert: false, useRaw: false },
  { name: 'binary-80-inv', threshold: 80, invert: true, useRaw: false },
]
