/**
 * 物品裝備屬性相關類型
 */

/**
 * 裝備基礎數值類型（所有裝備/卷軸/藥水共用）
 *
 * 包含所有 MapleStory 裝備可能具有的基礎屬性
 * 所有欄位為 required，值可為 null
 */
export interface BaseEquipmentStats {
  str: number | null
  dex: number | null
  int: number | null
  luk: number | null
  watk: number | null
  matk: number | null
  wdef: number | null
  mdef: number | null
  hp: number | null
  mp: number | null
  accuracy: number | null
  avoidability: number | null
  speed: number | null
  jump: number | null
}

// 物品需求條件
export interface ItemRequirements {
  req_level: number | null
  req_str: number | null
  req_dex: number | null
  req_int: number | null
  req_luk: number | null
  req_fam: number | null
}

// 職業限制
export interface ItemClasses {
  beginner: boolean | null
  warrior: boolean | null
  magician: boolean | null
  bowman: boolean | null
  thief: boolean | null
  pirate: boolean | null
}

// 裝備屬性（繼承基礎屬性，新增攻速和升級次數）
export interface ItemEquipmentStats extends BaseEquipmentStats {
  attack_speed: number | null
  upgrades: number | null
}

// 屬性浮動值結構
export interface StatVariation {
  min: number | null
  max: number | null
}

// 裝備資訊
export interface ItemEquipment {
  category: string
  requirements: ItemRequirements
  classes: ItemClasses
  stats: ItemEquipmentStats
  stat_variation?: Record<string, StatVariation>
}

// Scroll (卷軸) 相關類型定義（使用基礎屬性的 Partial，因為卷軸只增加部分屬性）
export type ScrollStats = Partial<BaseEquipmentStats>

export interface ScrollInfo {
  category: string
  success_rate: number
  destroy_rate: number
  stats: ScrollStats
}

// Potion (藥水) 相關類型定義（使用基礎屬性的 Partial，新增攻速）
export type PotionStats = Partial<BaseEquipmentStats> & {
  attack_speed?: number | null
}

export interface PotionInfo {
  duration: number | null
  stats: PotionStats
}

// 物品屬性（完整版）
export interface ItemAttributes {
  item_id: string
  item_name: string
  item_type_id: number
  sale_price: number | null
  max_stack_count: number | null
  untradeable: boolean | null
  item_description: string | null
  type: string
  sub_type: string | null
  equipment?: ItemEquipment
  scroll?: ScrollInfo
  potion?: PotionInfo
}

// Essential 資料類型（用於列表顯示、篩選）
export interface ItemAttributesEssential {
  item_id: string
  item_name: string
  type: string
  sub_type: string | null
  req_level: number | null
  req_str: number
  req_dex: number
  req_int: number
  req_luk: number
  equipment_category: string | null
  equipment_classes: {
    beginner: boolean | null
    warrior: boolean | null
    magician: boolean | null
    bowman: boolean | null
    thief: boolean | null
    pirate: boolean | null
  } | null
  scroll_category: string | null
}

// Detailed 資料類型（用於 Modal 詳細顯示）
export interface ItemAttributesDetailed {
  item_type_id: number
  sale_price: number | null
  max_stack_count: number | null
  untradeable: boolean | null
  item_description: string | null
  equipment?: ItemEquipment
  scroll?: ScrollInfo
  potion?: PotionInfo
}

// ========== Enhanced JSON 格式的類型定義 ==========
// Enhanced JSON 使用 camelCase 命名，需要轉換為 snake_case

export interface EnhancedRequirements {
  reqLevel: number | null
  reqStr: number | null
  reqDex: number | null
  reqInt: number | null
  reqLuk: number | null
  reqFam: number | null
}

export interface EnhancedStats {
  attackSpeed: number | null
  str: number | null
  dex: number | null
  int: number | null
  luk: number | null
  watk: number | null
  matk: number | null
  accuracy: number | null
  avoidability: number | null
  speed: number | null
  jump: number | null
  hp: number | null
  mp: number | null
  wdef: number | null
  mdef: number | null
  upgrades: number | null
}

export interface EnhancedStatVariation {
  [key: string]: {
    min: number | null
    max: number | null
  }
}

export interface EnhancedEquipment {
  category: string
  requirements: EnhancedRequirements
  classes: ItemClasses
  stats: EnhancedStats
  statVariation?: EnhancedStatVariation
}

export interface EnhancedScroll {
  category: string
  successRate: number
  destroyRate: number
  stats: ScrollStats
}

export interface EnhancedGachaItem {
  // 轉蛋機基本欄位
  chineseName?: string | null
  probability: string
  chance: number
  itemId: string | number

  // Enhanced JSON 特有欄位（camelCase）
  itemName?: string
  itemTypeId?: number
  salePrice?: number | null
  maxStackCount?: number | null
  untradeable?: boolean | null
  itemDescription?: string | null
  type?: string | null
  subType?: string | null
  equipment?: EnhancedEquipment
  scroll?: EnhancedScroll

  // 舊格式欄位（向下兼容）
  name?: string
  description?: string
  category?: string
  subcategory?: string
  overallCategory?: string
  availability?: {
    cash: boolean
    tradeable: boolean
    exclusive: boolean
    superior: boolean
    bossDrop: boolean
    shopPrice: number
    durability: boolean
  }
  requiredStats?: Partial<{
    level: number
    gender: string
    jobTrees: string[]
    str: number
    dex: number
    int: number
    luk: number
  }>
  stats?: Record<string, number | undefined>
  version?: {
    version: number
    subversion: number
    locale: number
  }
}

// ========== Items-Organized JSON 格式（chronostoryData/items-organized/） ==========

/**
 * 物品描述資訊
 */
export interface ItemsOrganizedDescription {
  id: number
  name: string
  description: string
  chineseItemName?: string
  chineseNameSource?: string
}

/**
 * 物品元資料（根據物品類型可能有不同欄位）
 */
export interface ItemsOrganizedMetaInfo {
  only: boolean
  cash: boolean
  mob?: number
  slotMax?: number
  price?: number
  setCompleteCount?: number
  // 消耗品效果（預處理的效果描述陣列）
  effects?: string[]
  // 裝備相關
  reqLevel?: number
  reqSTR?: number
  reqDEX?: number
  reqINT?: number
  reqLUK?: number
  reqJob?: number
  reqLevelEquip?: number
  tuc?: number  // Total Upgrade Count（可升級次數）
  // 裝備屬性
  incSTR?: number
  incDEX?: number
  incINT?: number
  incLUK?: number
  incPAD?: number  // Physical Attack
  incMAD?: number  // Magic Attack
  incPDD?: number  // Physical Defense
  incMDD?: number  // Magic Defense
  incACC?: number  // Accuracy
  incEVA?: number  // Avoidability
  incMHP?: number  // Max HP
  incMMP?: number  // Max MP
  incSpeed?: number
  incJump?: number
  attackSpeed?: number
}

/**
 * 物品類型資訊
 */
export interface ItemsOrganizedTypeInfo {
  overallCategory: string  // Equip, Use, Etc
  category: string         // Armor, Weapon, Consumable, Armor Scroll, etc.
  subCategory: string      // Hat, Sword, Potion, Gloves, etc.
}

/**
 * 隨機屬性範圍
 */
export interface ItemsOrganizedRandomStat {
  base: number
  min: number
  max: number
}

/**
 * chronostoryData/items-organized/ 的物品資料格式
 */
export interface ItemsOrganizedData {
  id: number
  description: ItemsOrganizedDescription
  metaInfo: ItemsOrganizedMetaInfo
  typeInfo: ItemsOrganizedTypeInfo
  randomStats?: Record<string, ItemsOrganizedRandomStat>
  isGachapon?: boolean
}
