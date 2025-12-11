/**
 * 統一的數值 key 映射
 *
 * 用於不同資料格式之間的轉換：
 * - 簡化格式：str, dex, watk, matk...
 * - ItemsOrganized 格式：incSTR, incDEX, incPAD, incMAD...
 */

/**
 * 簡化格式 → ItemsOrganized 格式的映射
 */
export const STAT_TO_ORGANIZED = {
  str: 'incSTR',
  dex: 'incDEX',
  int: 'incINT',
  luk: 'incLUK',
  watk: 'incPAD',
  matk: 'incMAD',
  wdef: 'incPDD',
  mdef: 'incMDD',
  hp: 'incMHP',
  mp: 'incMMP',
  accuracy: 'incACC',
  avoidability: 'incEVA',
  speed: 'incSpeed',
  jump: 'incJump',
  attackSpeed: 'attackSpeed',
} as const

/**
 * ItemsOrganized 格式 → 簡化格式的映射
 */
export const ORGANIZED_TO_STAT = {
  incSTR: 'str',
  incDEX: 'dex',
  incINT: 'int',
  incLUK: 'luk',
  incPAD: 'watk',
  incMAD: 'matk',
  incPDD: 'wdef',
  incMDD: 'mdef',
  incMHP: 'hp',
  incMMP: 'mp',
  incACC: 'accuracy',
  incEVA: 'avoidability',
  incSpeed: 'speed',
  incJump: 'jump',
  attackSpeed: 'attackSpeed',
} as const

/** 簡化格式的 key 類型 */
export type StatKey = keyof typeof STAT_TO_ORGANIZED

/** ItemsOrganized 格式的 key 類型 */
export type OrganizedStatKey = keyof typeof ORGANIZED_TO_STAT

/**
 * 將 stat key 轉換為 ItemsOrganized 格式
 *
 * @param key - 簡化格式的 key（如 'str', 'watk'）
 * @returns ItemsOrganized 格式的 key（如 'incSTR', 'incPAD'）
 */
export function mapStatToOrganized(key: string): string {
  return STAT_TO_ORGANIZED[key as StatKey] ?? key
}

/**
 * 將 ItemsOrganized 格式的 key 轉換為簡化格式
 *
 * @param key - ItemsOrganized 格式的 key（如 'incSTR', 'incPAD'）
 * @returns 簡化格式的 key（如 'str', 'watk'）
 */
export function mapOrganizedToStat(key: string): string {
  return ORGANIZED_TO_STAT[key as OrganizedStatKey] ?? key
}
