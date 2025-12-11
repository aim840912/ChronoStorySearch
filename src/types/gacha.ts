/**
 * 轉蛋機相關類型
 */

import type { ItemEquipment } from './item-equipment'

// 物品可用性資訊
export interface ItemAvailability {
  cash: boolean
  tradeable: boolean
  exclusive: boolean
  superior: boolean
  bossDrop: boolean
  shopPrice: number
  durability: boolean
}

// 物品需求屬性
export interface ItemRequiredStats {
  level: number
  gender: string
  jobTrees: string[]
  str: number
  dex: number
  int: number
  luk: number
}

// 物品屬性（動態鍵值對）
export type GachaItemStats = Record<string, number | undefined>

// 物品版本資訊
export interface ItemVersion {
  version: number
  subversion: number
  locale: number
}

// 轉蛋物品（整合 API 資料）
export interface GachaItem {
  // 轉蛋機特有欄位（必須）
  chineseName: string
  probability: string
  chance: number
  itemId: number

  // API 提供的欄位（可選）
  name?: string
  itemName?: string
  description?: string
  category?: string
  subcategory?: string
  overallCategory?: string
  availability?: ItemAvailability
  requiredStats?: ItemRequiredStats
  stats?: GachaItemStats
  version?: ItemVersion
  equipment?: ItemEquipment
}

// 轉蛋機
export interface GachaMachine {
  machineId: number
  machineName: string
  chineseMachineName?: string
  description: string
  totalItems: number
  items: GachaItem[]
}

// 轉蛋搜尋結果
export interface GachaSearchResult {
  item: GachaItem
  machineId: number
  machineName: string
}

// 隨機裝備屬性（用於抽獎機的隨機屬性計算）
// 所有欄位為可選且為純數字（非 null）
export interface RandomEquipmentStats {
  str?: number
  dex?: number
  int?: number
  luk?: number
  watk?: number
  matk?: number
  wdef?: number
  mdef?: number
  hp?: number
  mp?: number
  accuracy?: number
  avoidability?: number
  speed?: number
  jump?: number
  attack_speed?: number
  upgrades?: number
}

// 抽獎結果（包含隨機屬性）
export interface GachaResult extends GachaItem {
  drawId: number
  randomStats?: RandomEquipmentStats
  savedAt?: number
  enhanceCount?: number
}
