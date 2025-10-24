// 掉落資料類型（完整版，包含掉落機率和數量）
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

// 掉落 Essential 資料類型（與 DropItem 相同，用於優化載入）
// Note: 由於 MonsterDropCard 和 ItemModal 都需要顯示掉落率，
// Essential 需包含完整資訊。優化主要來自 JSON 壓縮和按需載入策略。
export interface DropsEssential {
  mobId: number
  mobName: string
  chineseMobName?: string | null
  itemId: number
  itemName: string
  chineseItemName?: string | null
  chance: number
  minQty: number
  maxQty: number
}

// 物品來源資訊（掉落、轉蛋或兩者）
export interface ItemSource {
  fromDrops: boolean       // 是否有怪物掉落
  fromGacha: boolean       // 是否來自轉蛋機
  gachaMachines?: Array<{  // 轉蛋機列表（如有）
    machineId: number
    machineName: string
    chineseMachineName?: string
    probability: string
  }>
}

// 擴展物品資料（包含來源資訊）
export interface ExtendedUniqueItem {
  itemId: number
  itemName: string
  chineseItemName?: string | null
  monsterCount: number
  source: ItemSource
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

// 瀏覽歷史項目介面
export interface ViewHistoryItem {
  type: 'monster' | 'item'
  id: number
  name: string
  viewedAt: number
}

// 篩選模式類型
export type FilterMode = 'all' | 'favorite-monsters' | 'favorite-items'

// 搜尋類型篩選
export type SearchTypeFilter = 'all' | 'monster' | 'item' | 'gacha'

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
export type ItemStats = Record<string, number | undefined>

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

// 命中率計算器狀態
export interface AccuracyCalculatorState {
  mode: 'physical' | 'magic'
  playerLevel: number
  playerAccuracy: number
  playerInt: number
  playerLuk: number
  bonusAccuracy: number
  selectedMobId: number | null
}

// 怪物屬性資料類型（來自 mob-info.json）
export interface MonsterStats {
  mob_id: string
  mob_name: string | null
  released: number | null
  max_hp: number | null
  acc: number | null
  avoid: number | null
  level: number | null
  exp: number | null
  phys_def: number | null
  mag_def: number | null
  fire_weakness: number | null
  ice_weakness: number | null
  lightning_weakness: number | null
  holy_weakness: number | null
  poison_weakness: number | null
  immune_to_poison_status: number | null
  minimumPushDamage: number | null
}

// 經驗值效率資料類型
export interface ExpBar {
  minExpHpRatio: number | null       // 最小 HP/EXP 比率（統計用）
  maxExpHpRatio: number | null       // 最大 HP/EXP 比率（統計用）
  expEfficiency: number | null       // 經驗效率 (exp / max_hp)，數值越高越好
}

// 怪物地圖資訊（來自 mob-info.json）
export interface MobMapInfo {
  map_id: string
  map_name: string
  chinese_map_name: string
}

// 怪物完整資訊類型（mob-info.json 的頂層結構）
export interface MobInfo {
  mob: MonsterStats
  description: string
  expBar: ExpBar
  chineseMobName: string
  maps?: MobMapInfo[]  // 怪物出沒地圖列表（可選）
}

// mob-maps.json 相關類型
// 地圖中的怪物資料（來自 mob-maps.json）
export interface MobMapMonster {
  mob_id: string
  mob_name: string
  chineseMobName: string
}

// 單個地圖的資料（來自 mob-maps.json）
export interface MobMapEntry {
  map_id: string
  map_name: string
  chinese_map_name: string
  monsters: MobMapMonster[]
}

// mob-maps.json 頂層結構
export interface MobMapsData {
  metadata: {
    source: string
    generatedAt: string
    totalMaps: number
    totalMobMapEntries: number
    description: string
  }
  maps: MobMapEntry[]
}

// 地圖怪物資料庫相關類型
// 地圖中的怪物出現資訊
export interface MonsterSpawn {
  name: string            // 怪物名稱
  level: number | null    // 怪物等級
  baseXP: number | null   // 基礎經驗值
}

// 地圖資訊
export interface MapInfo {
  name: string            // 地圖名稱（英文）
  chineseName?: string    // 地圖中文名稱
  npcs: string[]          // NPC 列表
  monsters: MonsterSpawn[] // 怪物列表
  links: string[]         // 連結地圖代碼列表
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

// 屬性浮動值結構
export interface StatVariation {
  min: number | null
  max: number | null
}

export interface ItemEquipment {
  category: string
  requirements: ItemRequirements
  classes: ItemClasses
  stats: ItemEquipmentStats
  stat_variation?: Record<string, StatVariation>  // 明確定義浮動值型別
  stat_category_each_extra?: Record<string, unknown>
  stat_category_max_extra?: Record<string, unknown>
}

// Scroll (卷軸) 相關類型定義
export interface ScrollStats {
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

export interface ScrollInfo {
  category: string
  success_rate: number
  destroy_rate: number
  stats: ScrollStats
}

// Potion (藥水) 相關類型定義
export interface PotionStats {
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
}

export interface PotionInfo {
  duration: number | null
  stats: PotionStats
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
  scroll?: ScrollInfo
  potion?: PotionInfo
}

// Essential 資料類型（用於列表顯示、篩選，包含基本資訊、需求屬性和篩選欄位）
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
  // 篩選所需欄位
  equipment_category: string | null  // equipment.category
  equipment_classes: {               // equipment.classes
    beginner: boolean | null
    warrior: boolean | null
    magician: boolean | null
    bowman: boolean | null
    thief: boolean | null
    pirate: boolean | null
  } | null
  scroll_category: string | null     // scroll.category
}

// Detailed 資料類型（用於 Modal 詳細顯示，包含完整屬性）
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

// Enhanced JSON 格式的類型定義（用於 gacha-utils.ts 轉換）
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
  chineseName: string
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
  type?: string
  subType?: string | null
  equipment?: EnhancedEquipment
  scroll?: EnhancedScroll

  // 舊格式欄位（向下兼容）
  name?: string
  description?: string
  category?: string
  subcategory?: string
  overallCategory?: string
  availability?: ItemAvailability
  requiredStats?: Partial<ItemRequiredStats>  // 使用 Partial 允許部分屬性
  stats?: ItemStats
  version?: ItemVersion
}

// 進階篩選相關類型
// 篩選邏輯運算子
export type FilterLogicOperator = 'AND' | 'OR'

// 資料類型篩選選項
export type DataTypeFilter = 'all' | 'monster' | 'item' | 'gacha'

// 物品分類分組類型
export type CategoryGroupType =
  | 'apparel'      // 穿著類
  | 'weapon'       // 武器防具類
  | 'accessory'    // 飾品類
  | 'consumable'   // 消耗品類

// 物品類別群組（基於 equipment.category）
export type ItemCategoryGroup =
  // 穿著類 (7)
  | 'hat'          // 帽子
  | 'top'          // 上衣
  | 'bottom'       // 褲子/下身
  | 'overall'      // 套服
  | 'shoes'        // 鞋子
  | 'gloves'       // 手套
  | 'cape'         // 披風
  // 武器防具類 (17)
  | 'oneHandedSword'   // 單手劍
  | 'twoHandedSword'   // 雙手劍
  | 'oneHandedAxe'     // 單手斧
  | 'twoHandedAxe'     // 雙手斧
  | 'oneHandedBW'      // 單手棍
  | 'twoHandedBW'      // 雙手棍
  | 'polearm'      // 矛
  | 'spear'        // 槍
  | 'dagger'       // 匕首
  | 'claw'         // 爪
  | 'bow'          // 弓
  | 'crossbow'     // 弩
  | 'wand'         // 魔杖
  | 'staff'        // 法杖
  | 'knuckle'      // 拳套
  | 'gun'          // 槍械
  | 'shield'       // 盾牌
  // 飾品類 (2)
  | 'earring'      // 耳環
  | 'accessory'    // 飾品
  // 消耗品類 (3)
  | 'scroll'       // 卷軸
  | 'potion'       // 藥水
  | 'projectile'   // 投擲物

// 職業類型
export type JobClass =
  | 'beginner'    // 初心者
  | 'warrior'     // 戰士
  | 'magician'    // 法師
  | 'bowman'      // 弓手
  | 'thief'       // 盜賊
  | 'pirate'      // 海盜

// 等級範圍
export interface LevelRange {
  min: number | null  // 最小等級
  max: number | null  // 最大等級
}

// 進階篩選選項
export interface AdvancedFilterOptions {
  // 資料類型篩選
  dataType: DataTypeFilter

  // 物品類別篩選（多選）
  itemCategories: ItemCategoryGroup[]

  // 職業篩選（多選）
  jobClasses: JobClass[]

  // 等級範圍篩選
  levelRange: LevelRange

  // 是否啟用進階篩選
  enabled: boolean
}
