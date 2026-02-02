/**
 * 進階篩選相關類型
 */

// 篩選邏輯運算子
export type FilterLogicOperator = 'AND' | 'OR'

// 資料類型篩選選項
export type DataTypeFilter = 'all' | 'monster' | 'item' | 'gacha'

// 物品分類分組類型
export type CategoryGroupType =
  | 'apparel'      // 穿著類（含耳環、飾品）
  | 'weapon'       // 武器防具類
  | 'consumable'   // 消耗品類

// 主屬性類型
export type StatType = 'str' | 'dex' | 'int' | 'luk'

// 物品類別群組（基於 equipment.category）
export type ItemCategoryGroup =
  // 穿著類 (9) - 含耳環、飾品
  | 'hat'          // 帽子
  | 'top'          // 上衣
  | 'bottom'       // 褲子/下身
  | 'overall'      // 套服
  | 'shoes'        // 鞋子
  | 'gloves'       // 手套
  | 'cape'         // 披風
  | 'earring'      // 耳環
  | 'accessory'    // 飾品
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

// 元素屬性類型
export type ElementType =
  | 'fire'        // 火
  | 'ice'         // 冰
  | 'lightning'   // 雷
  | 'holy'        // 神聖
  | 'poison'      // 毒

// 等級範圍
export interface LevelRange {
  min: number | null
  max: number | null
}

// 攻擊速度範圍 (2=最快, 9=最慢)
export interface AttackSpeedRange {
  min: number | null  // 最快（數值小）
  max: number | null  // 最慢（數值大）
}

// 進階篩選選項
export interface AdvancedFilterOptions {
  // 資料類型篩選
  dataType: DataTypeFilter

  // 物品類別篩選（多選）
  itemCategories: ItemCategoryGroup[]

  // 職業篩選（多選）
  jobClasses: JobClass[]

  // 屬性弱點篩選（多選，僅適用於怪物）
  elementWeaknesses: ElementType[]

  // 怪物類型篩選（簡單布林，選中時只顯示符合的）
  isBoss: boolean      // true=只顯示Boss, false=不篩選
  isUndead: boolean    // true=只顯示不死系, false=不篩選
  healable: boolean    // true=只顯示可被治癒攻擊的怪物, false=不篩選
  poisonable: boolean  // true=只顯示可中毒的怪物, false=不篩選
  burnable: boolean    // true=只顯示可燃燒的怪物, false=不篩選
  freezable: boolean   // true=只顯示可冰凍的怪物, false=不篩選

  // 等級範圍篩選
  levelRange: LevelRange

  // 攻擊速度範圍篩選（僅適用於武器）
  attackSpeedRange: AttackSpeedRange

  // 主屬性篩選（多選，篩選增加該屬性的裝備）
  statBoosts: StatType[]

  // 是否啟用進階篩選
  enabled: boolean
}

// 篩選歷史紀錄
export interface FilterHistoryRecord {
  id: string                         // 唯一 ID (timestamp + random)
  filter: AdvancedFilterOptions      // 儲存的篩選條件
  createdAt: number                  // 建立時間戳（毫秒）
}
