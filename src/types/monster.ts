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
  minExpHpRatio: number | null
  maxExpHpRatio: number | null
  expEfficiency: number | null
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
  maps?: MobMapInfo[]
}

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
