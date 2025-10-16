// 掉落資料類型
export interface DropItem {
  mobId: number
  mobName: string
  itemId: number
  itemName: string
  chance: number // 實際機率 (0-1)
  minQty: number
  maxQty: number
}

// 搜尋建議項目類型
export interface SuggestionItem {
  name: string
  type: 'monster' | 'item'
  count: number // 該名稱在資料中出現的次數
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
