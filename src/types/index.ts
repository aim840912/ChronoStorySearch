// 掉落資料類型
export interface DropItem {
  mobId: number
  mobName: string
  chineseMobName?: string | null // 中文怪物名稱（可能為 null）
  itemId: number
  itemName: string
  chineseItemName?: string | null // 中文物品名稱（可能為 null）
  chance: number // 實際機率 (0-1)
  minQty: number
  maxQty: number
}

// 搜尋建議項目類型
export interface SuggestionItem {
  name: string
  type: 'monster' | 'item' | 'gacha'
  count: number // 該名稱在資料中出現的次數
  id?: number // 怪物或物品的 ID（用於顯示圖片）
  // 轉蛋機專用欄位（可選）
  machineId?: number
  machineName?: string
}

// 最愛怪物介面
export interface FavoriteMonster {
  mobId: number
  mobName: string
  addedAt: number
}

// 最愛物品介面
export interface FavoriteItem {
  itemId: number
  itemName: string
  addedAt: number
}

// 篩選模式類型
export type FilterMode = 'all' | 'favorite-monsters' | 'favorite-items'

// 清除模態框類型
export type ClearModalType = 'monsters' | 'items' | null

// 轉蛋機相關類型
// 物品可用性資訊
export interface ItemAvailability {
  cash: boolean // 是否為點裝
  tradeable: boolean // 是否可交易
  exclusive: boolean // 是否為獨家物品
  superior: boolean // 是否為高級物品
  bossDrop: boolean // 是否為 Boss 掉落
  shopPrice: number // 商店價格
  durability: boolean // 是否有耐久度
}

// 物品需求屬性
export interface ItemRequiredStats {
  level: number // 需求等級
  gender: string // 性別需求（"any", "male", "female"）
  jobTrees: string[] // 適用職業樹
  str: number // 需求力量
  dex: number // 需求敏捷
  int: number // 需求智力
  luk: number // 需求幸運
}

// 物品屬性（動態鍵值對）
export type ItemStats = Record<string, number>

// 物品版本資訊
export interface ItemVersion {
  version: number // 版本號
  subversion: number // 子版本號
  locale: number // 地區代碼
}

// 轉蛋物品（整合 API 資料）
export interface GachaItem {
  // 轉蛋機特有欄位（必須）
  chineseName: string // 中文名稱
  probability: string // 機率百分比（顯示用，如: "0.07%"）
  chance: number // 機率數值（內部用，如: 12500）
  itemId: number // 物品 ID

  // API 提供的欄位（可選 - 部分物品 API 整合失敗）
  name?: string // 英文名稱
  itemName?: string // 備用英文名稱（API 失敗時使用）
  description?: string // 物品描述
  category?: string // 主分類（如: "Armor", "One-Handed Weapon"）
  subcategory?: string // 子分類（如: "Cape", "Earrings"）
  overallCategory?: string // 總分類（通常是 "Equip"）
  availability?: ItemAvailability // 可用性資訊
  requiredStats?: ItemRequiredStats // 需求屬性
  stats?: ItemStats // 物品屬性
  version?: ItemVersion // 版本資訊
}

// 轉蛋機
export interface GachaMachine {
  machineId: number // 轉蛋機 ID
  machineName: string // 轉蛋機名稱
  chineseMachineName?: string // 中文轉蛋機名稱（可選）
  description: string // 轉蛋機描述
  totalItems: number // 總物品數量
  items: GachaItem[] // 物品列表
}

// 轉蛋搜尋結果
export interface GachaSearchResult {
  item: GachaItem
  machineId: number
  machineName: string
}

// 語言相關類型
export type Language = 'zh-TW' | 'en'

// 翻譯鍵值類型
export type TranslationKey = string

// 翻譯字典類型
export type Translations = Record<string, string>

// 主題相關類型
export type Theme = 'light' | 'dark' | 'system'

// 怪物屬性資料類型
export interface MonsterStats {
  mobId: number
  name: string | null
  chineseMobName: string | null
  level: number | null
  maxHP: number | null
  maxMP: number | null
  speed: number | null
  physicalDamage: number | null
  physicalDefense: number | null
  magicDamage: number | null
  magicDefense: number | null
  accuracy: number | null
  evasion: number | null
  exp: number | null
  minimumPushDamage: number | null
}

// 物品屬性資料類型
export interface ItemRequirements {
  req_level: number | null
  req_str: number | null
  req_dex: number | null
  req_int: number | null
  req_luk: number | null
  req_fam: number | null
}

export interface ItemClasses {
  beginner: boolean | null
  warrior: boolean | null
  magician: boolean | null
  bowman: boolean | null
  thief: boolean | null
  pirate: boolean | null
}

export interface ItemEquipmentStats {
  attack_speed: number | null
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

export interface ItemEquipment {
  category: string
  requirements: ItemRequirements
  classes: ItemClasses
  stats: ItemEquipmentStats
  stat_variation?: Record<string, unknown>
  stat_category_each_extra?: Record<string, unknown>
  stat_category_max_extra?: Record<string, unknown>
}

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
}

// 進階篩選相關類型
// 篩選邏輯運算子
export type FilterLogicOperator = 'AND' | 'OR'

// 資料類型篩選選項
export type DataTypeFilter = 'all' | 'monster' | 'item' | 'gacha'

// 物品類別群組
export type ItemCategoryGroup =
  | 'weapon'      // 武器
  | 'armor'       // 防具
  | 'accessory'   // 飾品
  | 'consume'     // 消耗品
  | 'etc'         // 其他/材料

// 進階篩選選項
export interface AdvancedFilterOptions {
  // 資料類型篩選
  dataType: DataTypeFilter

  // 物品類別篩選（多選）
  itemCategories: ItemCategoryGroup[]

  // 邏輯運算子
  logicOperator: FilterLogicOperator

  // 是否啟用進階篩選
  enabled: boolean
}
