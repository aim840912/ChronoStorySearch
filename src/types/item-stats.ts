/**
 * 物品屬性系統 - TypeScript 類型定義
 *
 * 用於交易系統中記錄物品的實際屬性（素質）
 * 包含攻擊、防禦、HP/MP、基礎屬性等
 */

/**
 * 物品屬性定義
 *
 * 支援的屬性包括：
 * - 攻擊屬性（watk, matk）
 * - 防禦屬性（wdef, mdef）
 * - 基礎屬性（str, dex, int, luk）
 * - 生命/魔力（hp, mp）
 * - 命中/迴避（acc, avoid）
 * - 移動/跳躍（speed, jump）
 * - 升級資訊（slots, scrolled）
 */
export interface ItemStats {
  // ==================== 攻擊屬性 ====================

  /**
   * 實際物理攻擊力
   * @example 92 （屠龍者的實際攻擊）
   */
  watk?: number

  /**
   * 最大物理攻擊力
   * @example 97 （屠龍者的最大攻擊）
   */
  watk_max?: number

  /**
   * 實際魔法攻擊力
   * @example 18 （魔杖的實際魔攻）
   */
  matk?: number

  /**
   * 最大魔法攻擊力
   * @example 20 （魔杖的最大魔攻）
   */
  matk_max?: number

  // ==================== 防禦屬性 ====================

  /** 實際物理防禦 */
  wdef?: number

  /** 最大物理防禦 */
  wdef_max?: number

  /** 實際魔法防禦 */
  mdef?: number

  /** 最大魔法防禦 */
  mdef_max?: number

  // ==================== 基礎屬性 ====================

  /** 實際力量 */
  str?: number

  /** 最大力量 */
  str_max?: number

  /** 實際敏捷 */
  dex?: number

  /** 最大敏捷 */
  dex_max?: number

  /** 實際智力 */
  int?: number

  /** 最大智力 */
  int_max?: number

  /** 實際幸運 */
  luk?: number

  /** 最大幸運 */
  luk_max?: number

  // ==================== 生命/魔力 ====================

  /** 實際 HP */
  hp?: number

  /** 最大 HP */
  hp_max?: number

  /** 實際 MP */
  mp?: number

  /** 最大 MP */
  mp_max?: number

  // ==================== 命中/迴避 ====================

  /** 實際命中率 */
  acc?: number

  /** 最大命中率 */
  acc_max?: number

  /** 實際迴避率 */
  avoid?: number

  /** 最大迴避率 */
  avoid_max?: number

  // ==================== 移動/跳躍 ====================

  /** 實際移動速度 */
  speed?: number

  /** 最大移動速度 */
  speed_max?: number

  /** 實際跳躍力 */
  jump?: number

  /** 最大跳躍力 */
  jump_max?: number

  // ==================== 升級資訊 ====================

  /**
   * 可升級次數（總可升級次數）
   * @example 7 （一般裝備的可升級次數）
   */
  slots?: number

  /**
   * 已使用卷軸次數
   * @example 2 （已使用 2 個卷軸）
   */
  scrolled?: number

  // ==================== 備註 ====================

  /**
   * 自由備註
   * @example "已打 10% 攻擊卷 x2"
   * @maxLength 500
   */
  notes?: string
}

/**
 * 物品素質等級
 *
 * 根據實際值/最大值的平均比例計算：
 * - S: >= 95% （完美）
 * - A: >= 85% （極品）
 * - B: >= 70% （優秀）
 * - C: >= 50% （中等）
 * - D: >= 30% （普通）
 * - F: < 30%  （極差）
 */
export type StatsGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'

/**
 * 素質等級資訊
 */
export interface StatsGradeInfo {
  /** 等級 */
  grade: StatsGrade

  /** 分數（0-100） */
  score: number

  /** 中文名稱 */
  label_zh: string

  /** 英文名稱 */
  label_en: string

  /** 顏色（Tailwind class） */
  color: string
}

/**
 * 素質等級對應表
 */
export const STATS_GRADE_INFO: Record<StatsGrade, StatsGradeInfo> = {
  S: {
    grade: 'S',
    score: 95,
    label_zh: '完美',
    label_en: 'Perfect',
    color: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20',
  },
  A: {
    grade: 'A',
    score: 85,
    label_zh: '極品',
    label_en: 'Excellent',
    color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  },
  B: {
    grade: 'B',
    score: 70,
    label_zh: '優秀',
    label_en: 'Good',
    color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
  },
  C: {
    grade: 'C',
    score: 50,
    label_zh: '中等',
    label_en: 'Average',
    color: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20',
  },
  D: {
    grade: 'D',
    score: 30,
    label_zh: '普通',
    label_en: 'Below Average',
    color: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  },
  F: {
    grade: 'F',
    score: 0,
    label_zh: '極差',
    label_en: 'Poor',
    color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  },
}

/**
 * 屬性鍵值對應（用於遍歷）
 */
export const STAT_KEYS = [
  'watk',
  'matk',
  'wdef',
  'mdef',
  'str',
  'dex',
  'int',
  'luk',
  'hp',
  'mp',
  'acc',
  'avoid',
  'speed',
  'jump',
] as const

/**
 * 屬性顯示名稱（中文）
 */
export const STAT_LABELS_ZH: Record<string, string> = {
  watk: '物理攻擊',
  matk: '魔法攻擊',
  wdef: '物理防禦',
  mdef: '魔法防禦',
  str: '力量',
  dex: '敏捷',
  int: '智力',
  luk: '幸運',
  hp: 'HP',
  mp: 'MP',
  acc: '命中率',
  avoid: '迴避率',
  speed: '移動速度',
  jump: '跳躍力',
  slots: '可升級次數',
  scrolled: '已使用次數',
  notes: '備註',
}

/**
 * 屬性顯示名稱（英文）
 */
export const STAT_LABELS_EN: Record<string, string> = {
  watk: 'Weapon ATK',
  matk: 'Magic ATK',
  wdef: 'Weapon DEF',
  mdef: 'Magic DEF',
  str: 'STR',
  dex: 'DEX',
  int: 'INT',
  luk: 'LUK',
  hp: 'HP',
  mp: 'MP',
  acc: 'Accuracy',
  avoid: 'Avoidability',
  speed: 'Speed',
  jump: 'Jump',
  slots: 'Upgrade Slots',
  scrolled: 'Scrolled',
  notes: 'Notes',
}

/**
 * 完整刊登資訊（擴充現有 Listing）
 *
 * 注意：這個介面擴充了 src/app/api/listings/route.ts 中的 Listing 類型
 */
export interface ListingWithStats {
  // 基本刊登資訊（繼承自 Listing）
  id: string
  user_id: string
  item_id: number
  quantity: number
  price?: number
  trade_type: 'sell' | 'exchange'
  wanted_item_id?: number
  wanted_quantity?: number
  contact_method: string
  webhook_url?: string
  status: 'active' | 'sold' | 'cancelled'
  view_count: number
  interest_count: number
  created_at: string
  updated_at: string
  deleted_at?: string | null

  // 新增：物品屬性資訊
  item_stats: ItemStats | null
  stats_grade: StatsGrade | null
  stats_score: number | null
}
