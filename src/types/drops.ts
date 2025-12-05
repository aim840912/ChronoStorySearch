/**
 * 掉落資料與物品相關類型
 */

// 掉落資料類型（完整版，包含掉落機率和數量）
export interface DropItem {
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

// 掉落 Essential 資料類型（與 DropItem 相同，用於優化載入）
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
  fromDrops: boolean
  fromGacha: boolean
  gachaMachines?: Array<{
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
  type: 'monster' | 'item' | 'gacha' | 'merchant'
  count: number
  id?: number
  machineId?: number
  machineName?: string
  mapId?: string           // 商人地圖 ID
  mapName?: string         // 商人地圖英文名稱
  chineseMapName?: string  // 商人地圖中文名稱
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
export type FilterMode = 'all' | 'favorite-monsters' | 'favorite-items' | 'market-listings'

// 搜尋類型篩選
export type SearchTypeFilter = 'all' | 'monster' | 'item' | 'gacha' | 'merchant'

// 清除模態框類型
export type ClearModalType = 'monsters' | 'items' | null

// 語言相關類型
export type Language = 'zh-TW' | 'en'

// 翻譯鍵值類型
export type TranslationKey = string

// 翻譯字典類型
export type Translations = Record<string, string>

// 主題相關類型
export type Theme = 'light' | 'dark'

// 商人 100% 掉落物品類型
export interface MerchantDropItem {
  itemName: string
  chineseItemName: string
  itemType: string
  category: string
  stat: string
}

// 商人地圖資料類型
export interface MerchantMapData {
  mapId: string
  mapName: string
  chineseMapName: string
  region: string
  drops: MerchantDropItem[]
}
