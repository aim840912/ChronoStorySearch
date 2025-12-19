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

// 按物品 ID 分類的掉落資料中的怪物項目（來自 drops-by-item/*.json）
export interface DropsByItemMonster {
  mobId: number
  mobName: string
  chineseMobName: string | null
  isBoss: boolean
  inGame: boolean
  chance: number
  displayChance: string
  minQty: number
  maxQty: number
}

// 按物品 ID 分類的掉落資料結構（來自 drops-by-item/*.json）
export interface DropsByItemData {
  itemId: number
  itemName: string
  chineseItemName: string | null
  totalMonsters: number
  monsters: DropsByItemMonster[]
}

// 怪物索引項目（來自 monster-index.json）
export interface MonsterIndexItem {
  mobId: number
  mobName: string
  chineseMobName: string | null
  isBoss: boolean
  dropCount: number
}

// 怪物索引資料結構
export interface MonsterIndex {
  totalMonsters: number
  lastUpdated: string
  monsters: MonsterIndexItem[]
}

// 物品索引項目（來自 item-index.json）
export interface ItemIndexItem {
  itemId: number
  itemName: string
  chineseItemName: string | null
  monsterCount: number
}

// 物品索引資料結構
export interface ItemIndex {
  totalItems: number
  lastUpdated: string
  items: ItemIndexItem[]
}

// 掉落關係資料結構（來自 drop-relations.json）
export interface DropRelations {
  lastUpdated: string
  mobToItems: Record<string, number[]>
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
  type: 'monster' | 'item' | 'gacha' | 'merchant' | 'quiz'
  count: number
  id?: number
  machineId?: number
  machineName?: string
  mapId?: string           // 商人地圖 ID
  mapName?: string         // 商人地圖英文名稱
  chineseMapName?: string  // 商人地圖中文名稱
  // Quiz 專用欄位
  questionEn?: string      // 英文題目
  questionZh?: string      // 中文題目
  answerEn?: string        // 英文答案
  answerZh?: string        // 中文答案
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
export type SearchTypeFilter = 'all' | 'monster' | 'item' | 'gacha' | 'merchant' | 'quiz'

// Quiz 題目選項類型
export interface QuizOption {
  en: string
  zh: string
  isCorrect: boolean
}

// Quiz 題目類型
export interface QuizQuestion {
  questionEn: string
  questionZh: string
  options: QuizOption[]
  answer: { en: string; zh: string } | null
}

// Quiz 資料結構（來自 chronostory-quiz.json）
export interface QuizData {
  metadata: {
    source: string
    url: string
    editor: string
    thanks: string
    totalQuestions: number
    generatedAt: string
  }
  questions: QuizQuestion[]
}

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
