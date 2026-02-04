/**
 * 怪物與地圖相關類型
 */

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

// 怪物屬性資料類型（來自 chronostoryData/mob-info.json）
export interface MonsterStats {
  id: string                      // was mob_id
  name: string | null             // was mob_name
  InGame: boolean                 // was released (number → boolean)
  maxHP: number | null            // was max_hp
  accuracy: number | null         // was acc
  evasion: number | null          // was avoid
  level: number | null
  exp: number | null
  physicalDefense: number | null  // was phys_def
  magicDefense: number | null     // was mag_def
  fire_weakness: number | null
  ice_weakness: number | null
  lightning_weakness: number | null
  holy_weakness: number | null
  poison_weakness: number | null
  minimumPushDamage: number | null
  isBoss: boolean
  isUndead: boolean
  // 狀態免疫欄位（來自 CSV 同步）
  immuneToHeal: boolean
  immuneToPoison: boolean
  immuneToBurn: boolean
  immuneToFreeze: boolean
}

// 怪物完整資訊類型（mob-info.json 的頂層結構）
export interface MobInfo {
  mob: MonsterStats
  chineseMobName: string
}

// 地圖中的怪物出現資訊
export interface MonsterSpawn {
  name: string
  level: number | null
  baseXP: number | null
}

// 地圖資訊
export interface MapInfo {
  name: string
  chineseName?: string
  npcs: string[]
  monsters: MonsterSpawn[]
  links: string[]
}

// 怪物出沒地點（反向索引用）
export interface MonsterSpawnLocation {
  region: string          // 區域名稱 (Maple Island, Kerning City...)
  section: string         // 區段名稱 (Victoria Road - xxx)
  map: string             // 地圖名稱
  hidden: boolean         // 是否為隱藏地圖
}

// 怪物出沒地點索引
export type MonsterSpawnsMap = Record<string, MonsterSpawnLocation[]>
