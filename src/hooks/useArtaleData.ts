'use client'

import { useMemo, useCallback } from 'react'
import { clientLogger } from '@/lib/logger'

// 載入本地 Artale 資料（類似 useDataManagement 的方式）
import monsterIndexData from '@/../artaleData/monster-index.json'
import itemIndexData from '@/../artaleData/item-index.json'
import dropRelationsData from '@/../artaleData/drop-relations.json'
import mobInfoData from '@/../artaleData/mob-info.json'
import areaData from '@/../artaleData/area.json'
import mapData from '@/../artaleData/map.json'

// ==================== 區域資料型別 ====================

/**
 * 區域資料（area.json）
 * 0 = 未開放, 1 = 開放
 */
type ArtaleAreaData = Record<string, 0 | 1>

/**
 * 怪物地圖對應（map.json）
 * 格式：{ "怪物名": { "區域：地圖名": 0 } }
 */
type ArtaleMapData = Record<string, Record<string, number>>

// ==================== 資料型別定義 ====================

/**
 * Artale 怪物索引項目
 */
export interface ArtaleMonsterIndexItem {
  mobId: string           // 使用怪物名稱作為 ID
  mobName: string         // 中文名稱
  chineseMobName: string  // 中文名稱（同 mobName）
  isBoss: boolean
  dropCount: number
  inGame: boolean
  level: number
  tag: string
}

/**
 * Artale 怪物索引
 */
interface ArtaleMonsterIndex {
  totalMonsters: number
  lastUpdated: string
  monsters: ArtaleMonsterIndexItem[]
}

/**
 * Artale 物品索引項目
 */
export interface ArtaleItemIndexItem {
  itemId: string          // 物品 ID（可能是數字字串或名稱）
  itemName: string        // 中文名稱
  chineseItemName: string // 中文名稱（同 itemName）
  monsterCount: number
}

/**
 * Artale 物品索引
 */
interface ArtaleItemIndex {
  totalItems: number
  lastUpdated: string
  items: ArtaleItemIndexItem[]
}

/**
 * Artale 掉落關係
 */
interface ArtaleDropRelations {
  lastUpdated: string
  mobToItems: Record<string, string[]>  // 怪物名稱 -> 物品名稱陣列
}

/**
 * Artale 怪物詳細資訊
 */
export interface ArtaleMobInfo {
  mob: {
    id: string
    name: string
    chineseName: string
    level: number
    hp: number | string
    atk: number
    def: number
    matk: number
    mdef: number
    exp: string
    imageId: string
    tag: string
    InGame: boolean
  }
}

/**
 * Artale 掉落資料（與 DropsEssential 類似，但無機率）
 */
export interface ArtaleDropsEssential {
  mobId: string           // 怪物名稱作為 ID
  mobName: string         // 怪物中文名稱
  chineseMobName: string  // 怪物中文名稱
  itemId: string          // 物品 ID 或名稱
  itemName: string        // 物品中文名稱
  chineseItemName: string // 物品中文名稱
  inGame: boolean
  // Artale 沒有機率資訊
  chance: number          // 始終為 0（Artale 無此資訊）
  minQty: number          // 始終為 1
  maxQty: number          // 始終為 1
}

// ==================== Hook 回傳型別 ====================

export interface UseArtaleDataReturn {
  // 狀態
  isLoading: boolean

  // 資料
  allDrops: ArtaleDropsEssential[]

  // 索引 Map
  monsterIndexMap: Map<string, ArtaleMonsterIndexItem>
  itemIndexMap: Map<string, ArtaleItemIndexItem>
  mobInfoMap: Map<string, ArtaleMobInfo>
  mobLevelMap: Map<string, number>

  // 方法
  searchByName: (query: string) => ArtaleDropsEssential[]
  getMonsterByName: (name: string) => ArtaleMonsterIndexItem | undefined
  getDropsByMonster: (mobName: string) => string[]

  // 區域篩選（Phase 15 新增）
  availableAreas: string[]
  getMobNamesByAreas: (selectedAreas: Set<string>) => Set<string>
}

/**
 * Artale 資料管理 Hook
 *
 * 職責：
 * - 從本地 JSON 載入 Artale 遊戲資料
 * - 提供搜尋和查詢功能
 * - 與 useDataManagement 類似的介面設計
 */
export function useArtaleData(): UseArtaleDataReturn {
  // 載入怪物索引
  const monsterIndex = monsterIndexData as ArtaleMonsterIndex

  // 載入物品索引
  const itemIndex = itemIndexData as ArtaleItemIndex

  // 載入掉落關係
  const dropRelations = dropRelationsData as ArtaleDropRelations

  // 載入怪物詳細資訊
  const mobInfo = mobInfoData as ArtaleMobInfo[]

  // 建立怪物索引 Map
  const monsterIndexMap = useMemo(() => {
    const map = new Map<string, ArtaleMonsterIndexItem>()
    monsterIndex.monsters.forEach(m => map.set(m.mobId, m))
    clientLogger.info(`[Artale] 建立怪物索引 Map: ${map.size} 隻怪物`)
    return map
  }, [monsterIndex.monsters])

  // 建立物品索引 Map（以名稱為 key，因為 Artale 主要使用名稱）
  const itemIndexMap = useMemo(() => {
    const map = new Map<string, ArtaleItemIndexItem>()
    itemIndex.items.forEach(i => map.set(i.itemName, i))
    clientLogger.info(`[Artale] 建立物品索引 Map: ${map.size} 項物品`)
    return map
  }, [itemIndex.items])

  // 建立怪物詳細資訊 Map
  const mobInfoMap = useMemo(() => {
    const map = new Map<string, ArtaleMobInfo>()
    mobInfo.forEach(info => map.set(info.mob.id, info))
    return map
  }, [mobInfo])

  // 建立怪物等級 Map
  const mobLevelMap = useMemo(() => {
    const map = new Map<string, number>()
    monsterIndex.monsters.forEach(m => map.set(m.mobId, m.level))
    return map
  }, [monsterIndex.monsters])

  // 重建 allDrops（與 useDataManagement 相同邏輯）
  const allDrops = useMemo<ArtaleDropsEssential[]>(() => {
    const drops: ArtaleDropsEssential[] = []

    Object.entries(dropRelations.mobToItems).forEach(([mobName, itemNames]) => {
      const monster = monsterIndexMap.get(mobName)
      if (!monster) return

      // 如果沒有掉落物品，仍然建立一筆虛擬記錄（讓怪物可以被搜尋）
      if (itemNames.length === 0) {
        drops.push({
          mobId: mobName,
          mobName,
          chineseMobName: mobName,
          itemId: '',
          itemName: '',
          chineseItemName: '',
          inGame: monster.inGame,
          chance: 0,
          minQty: 0,
          maxQty: 0,
        })
        return
      }

      itemNames.forEach(itemName => {
        const item = itemIndexMap.get(itemName)

        drops.push({
          mobId: mobName,
          mobName,
          chineseMobName: mobName,
          itemId: item?.itemId || itemName,
          itemName,
          chineseItemName: itemName,
          inGame: monster.inGame,
          chance: 0,  // Artale 無機率資訊
          minQty: 1,
          maxQty: 1,
        })
      })
    })

    clientLogger.info(`[Artale] 重建 ${drops.length} 筆掉落資料`)
    return drops
  }, [dropRelations.mobToItems, monsterIndexMap, itemIndexMap])

  // 搜尋功能
  const searchByName = useCallback((query: string): ArtaleDropsEssential[] => {
    if (!query.trim()) return []

    const lowerQuery = query.toLowerCase()

    return allDrops.filter(drop =>
      drop.mobName.toLowerCase().includes(lowerQuery) ||
      drop.itemName.toLowerCase().includes(lowerQuery)
    )
  }, [allDrops])

  // 根據名稱取得怪物
  const getMonsterByName = useCallback((name: string): ArtaleMonsterIndexItem | undefined => {
    return monsterIndexMap.get(name)
  }, [monsterIndexMap])

  // 取得怪物的掉落物列表
  const getDropsByMonster = useCallback((mobName: string): string[] => {
    return dropRelations.mobToItems[mobName] || []
  }, [dropRelations.mobToItems])

  // ==================== 區域篩選功能（Phase 15） ====================

  /**
   * 區域別名映射
   * 將使用者友善的區域名稱映射到 map.json 中的實際地圖前綴
   * 例如：「時間神殿」在 map.json 中實際是「時間之路」和「神殿深處」
   */
  const AREA_ALIASES: Record<string, string[]> = {
    '時間神殿': ['時間之路', '神殿深處'],
    '納希沙漠': ['炎熱之路', '日落之路', '納希競技大會'],
    '上海灘': ['東方神州', '少林寺'],
    '西門町': ['福爾摩沙'],
    '台北101': ['福爾摩沙'],  // 台北101 也屬於福爾摩沙區域
    '日本': ['昭和村', '江戶村', '日本'],  // 菇菇神社區域（昭和村、江戶村）+ 未來東京
  }

  // 處理後的可用區域列表（只包含開放的區域）
  const availableAreas = useMemo(() => {
    const areas = areaData as ArtaleAreaData
    return Object.entries(areas)
      .filter(([, enabled]) => enabled === 1)
      .map(([name]) => name)
  }, [])

  // 根據選中區域取得怪物名稱 Set
  const getMobNamesByAreas = useCallback((selectedAreas: Set<string>): Set<string> => {
    if (selectedAreas.size === 0) return new Set()  // 空選擇 = 全部（由呼叫端處理）

    // 展開區域別名：將選中的區域轉換為所有可能的地圖前綴
    const expandedPrefixes = new Set<string>()
    selectedAreas.forEach(area => {
      // 加入原始區域名稱
      expandedPrefixes.add(area)
      // 如果有別名，也加入別名
      const aliases = AREA_ALIASES[area]
      if (aliases) {
        aliases.forEach(alias => expandedPrefixes.add(alias))
      }
    })

    const maps = mapData as ArtaleMapData
    const result = new Set<string>()

    Object.entries(maps).forEach(([mobName, mobMaps]) => {
      const mapNames = Object.keys(mobMaps)
      // 檢查怪物是否出現在任一選中區域的地圖
      const inSelectedArea = mapNames.some(mapName => {
        // 地圖名稱格式：「區域：地圖名」（如「天空之城：天空階梯 II」）
        const areaPrefix = mapName.split('：')[0]
        return expandedPrefixes.has(areaPrefix)
      })
      if (inSelectedArea) {
        result.add(mobName)
      }
    })

    return result
  }, [])

  return {
    isLoading: false,  // 本地資料載入是同步的
    allDrops,
    monsterIndexMap,
    itemIndexMap,
    mobInfoMap,
    mobLevelMap,
    searchByName,
    getMonsterByName,
    getDropsByMonster,
    // 區域篩選（Phase 15）
    availableAreas,
    getMobNamesByAreas,
  }
}
