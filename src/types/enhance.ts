import type { ItemEquipmentStats, ScrollStats, DropItem, RandomEquipmentStats } from './index'

/**
 * 可強化的裝備
 */
export interface EnhanceableEquipment {
  itemId: number
  drawId?: number // 唯一抽取ID（來自轉蛋，用於識別同一裝備的不同抽取）
  itemName: string
  chineseName: string
  category: string
  originalStats: ItemEquipmentStats
  currentStats: ItemEquipmentStats
  remainingUpgrades: number
  enhanceCount: number // 已強化次數
  isDestroyed: boolean
  randomStats?: RandomEquipmentStats // 隨機屬性（來自轉蛋或怪物掉落）
}

/**
 * 怪物掉落的裝備（擴展 EnhanceableEquipment，加入掉落來源資訊）
 */
export interface DroppedEquipment extends EnhanceableEquipment {
  dropSource: 'monster'
  monsterId: number
  monsterName: string
  dropTimestamp: number
}

/**
 * 怪物資訊（簡化版，用於 UI 顯示）
 */
export interface MonsterInfo {
  id: number
  name: string
  chineseName: string
  level: number
  drops: DropItem[]
}

/**
 * 卷軸資訊（用於強化）
 */
export interface EnhanceScroll {
  itemId: number
  itemName: string
  chineseName: string
  category: string
  successRate: number
  destroyRate: number // 毀滅率（詛咒卷）
  stats: ScrollStats
}

/**
 * 強化結果類型
 */
export type EnhanceResultType = 'success' | 'failed' | 'destroyed'

/**
 * 強化結果
 */
export interface EnhanceResult {
  type: EnhanceResultType
  equipment: EnhanceableEquipment
  scroll: EnhanceScroll
  addedStats?: Partial<ItemEquipmentStats> // 成功時加成的屬性
  timestamp: number
}

/**
 * 強化歷史記錄
 */
export interface EnhanceHistory {
  id: string
  equipmentName: string
  equipmentChineseName: string
  scrollName: string
  scrollChineseName: string
  result: EnhanceResultType
  timestamp: number
}

/**
 * 詛咒卷規則配置
 */
export const CURSED_SCROLL_RULES: Record<number, number> = {
  10: 50,  // 10% 成功率 → 50% 毀滅率
  15: 50,  // 15% 成功率 → 50% 毀滅率
  60: 0,   // 60% 成功率 → 0% 毀滅率
  100: 0   // 100% 成功率 → 0% 毀滅率
}
