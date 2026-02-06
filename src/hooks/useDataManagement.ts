'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type {
  DropsEssential,
  GachaMachine,
  GachaItem,
  EnhancedGachaItem,
  MobInfo,
  ItemAttributesEssential,
  MerchantMapData,
  MonsterIndex,
  ItemIndex,
  DropRelations,
  MonsterIndexItem,
  ItemIndexItem,
  QuizData,
} from '@/types'
import { clientLogger } from '@/lib/logger'
// 使用 chronostoryData 的索引檔案取代 drops-essential.json（節省 39% 載入大小）
import monsterIndexData from '@/../chronostoryData/monster-index.json'
import itemIndexData from '@/../chronostoryData/item-index.json'
import dropRelationsData from '@/../chronostoryData/drop-relations.json'
import mobInfoData from '@/../chronostoryData/mob-info.json'
import itemAttributesEssentialData from '@/../chronostoryData/item-attributes-essential.json'
import merchantDropsData from '@/../data/drops-100-percent.json'
import quizData from '@/../chronostoryData/csv-data/3rd/chronostory-quiz.json'

/**
 * Enhanced JSON 的轉蛋機格式
 */
interface EnhancedGachaMachineRaw {
  machineId: number
  machineName: string
  chineseMachineName?: string
  description: string
  totalItems: number
  items: EnhancedGachaItem[]
}

/**
 * 正規化 Enhanced JSON 格式的轉蛋機資料
 * 將 Enhanced JSON 的欄位映射到 GachaMachine 型別
 */
function normalizeGachaMachine(rawData: EnhancedGachaMachineRaw): GachaMachine {
  return {
    ...rawData,
    items: rawData.items.map((item) => ({
      // 先展開所有原始欄位
      ...item,

      // 然後覆蓋需要特殊處理的欄位（順序很重要！）
      // 轉蛋機特有欄位
      chineseName: item.chineseName,
      probability: item.probability,
      chance: item.chance,

      // 映射欄位以相容現有型別定義
      name: item.itemName || item.name,
      itemName: item.itemName,
      description: item.itemDescription || item.description || '',

      // 從 equipment.category 映射到 category（如果存在）
      category: item.equipment?.category || item.category,
      subcategory: item.subType || item.subcategory,
      overallCategory: item.type || item.overallCategory,
    } as GachaItem)),
  }
}

/**
 * 資料管理 Hook
 * 職責：
 * - 載入核心資料（drops essential - 僅搜尋索引）
 * - 提供轉蛋機按需載入功能
 * - 提供初始隨機資料
 *
 * 優化：
 * - drops 拆分為 Essential（預載入，用於搜尋）+ Detailed（按需載入，用於 Modal）
 * - item-attributes 和 mob-info 改為懶加載（使用 useLazyData Hook）
 * - gacha machines 改為延遲載入（使用者搜尋時才載入）
 * - 使用 Enhanced JSON 提供完整物品資料（equipment stats、stat variation 等）
 */
export function useDataManagement() {
  // 資料狀態
  const [allDrops, setAllDrops] = useState<DropsEssential[]>([])
  const [gachaMachines, setGachaMachines] = useState<GachaMachine[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 從索引檔案重建 allDrops（節省 39% 載入大小）
  useEffect(() => {
    async function loadDropsFromIndexes() {
      try {
        setIsLoading(true)
        clientLogger.info('開始從索引檔案載入資料（節省 39% 載入大小）...')

        // 模擬短暫載入延遲以維持用戶體驗
        await new Promise(resolve => setTimeout(resolve, 300))

        // 建立怪物和物品的快速查詢 Map
        const monsterIndex = monsterIndexData as MonsterIndex
        const itemIndex = itemIndexData as ItemIndex
        const dropRelations = dropRelationsData as DropRelations

        const monsterMap = new Map<number, MonsterIndexItem>()
        monsterIndex.monsters.forEach(m => monsterMap.set(m.mobId, m))

        const itemMap = new Map<number, ItemIndexItem>()
        itemIndex.items.forEach(i => itemMap.set(i.itemId, i))

        // 從 drop-relations 重建 allDrops（不含 chance/qty，這些在 Modal 按需載入）
        const reconstructedDrops: DropsEssential[] = []

        Object.entries(dropRelations.mobToItems).forEach(([mobIdStr, itemIds]) => {
          const mobId = parseInt(mobIdStr, 10)
          const monster = monsterMap.get(mobId)
          if (!monster) return

          // 如果沒有掉落物品，仍然建立一筆虛擬記錄（讓怪物可以被搜尋）
          if ((itemIds as number[]).length === 0) {
            reconstructedDrops.push({
              mobId: monster.mobId,
              mobName: monster.mobName,
              chineseMobName: monster.chineseMobName,
              itemId: -1,  // 虛擬物品 ID
              itemName: '',
              chineseItemName: null,
              chance: 0,
              minQty: 0,
              maxQty: 0,
              inGame: monster.inGame,
            })
            return
          }

          itemIds.forEach((itemId: number) => {
            const item = itemMap.get(itemId)
            // 如果物品不在索引中，使用預設值
            const itemName = item?.itemName ?? (itemId === 0 ? 'Meso' : `Item ${itemId}`)
            const chineseItemName = item?.chineseItemName ?? null

            reconstructedDrops.push({
              mobId: monster.mobId,
              mobName: monster.mobName,
              chineseMobName: monster.chineseMobName,
              itemId,
              itemName,
              chineseItemName,
              // 詳細掉落資訊在 Modal 按需載入
              chance: 0,
              minQty: 1,
              maxQty: 1,
              // 怪物上線狀態
              inGame: monster.inGame,
            })
          })
        })

        setAllDrops(reconstructedDrops)
        clientLogger.info(`成功從索引重建 ${reconstructedDrops.length} 筆掉落資料`)
        clientLogger.info(`怪物: ${monsterIndex.totalMonsters}, 物品: ${itemIndex.totalItems}`)
      } catch (error) {
        clientLogger.error('載入索引資料失敗', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDropsFromIndexes()
  }, [])

  // 延遲載入轉蛋機資料 - 使用者搜尋時才載入
  // 優化：使用動態 import 而非 API 呼叫，完全消除 Edge Requests
  const loadGachaMachines = useCallback(async () => {
    // 如果已經載入過，直接返回
    if (gachaMachines.length > 0) return

    try {
      clientLogger.info('開始懶加載轉蛋機資料（Enhanced JSON）...')

      // 使用動態 import 載入所有轉蛋機資料（Enhanced 版本，包含完整物品資料）
      const [m1, m2, m3, m4, m5, m6, m7, m8] = await Promise.all([
        import('@/../chronostoryData/gacha/machine-1-enhanced.json'),
        import('@/../chronostoryData/gacha/machine-2-enhanced.json'),
        import('@/../chronostoryData/gacha/machine-3-enhanced.json'),
        import('@/../chronostoryData/gacha/machine-4-enhanced.json'),
        import('@/../chronostoryData/gacha/machine-5-enhanced.json'),
        import('@/../chronostoryData/gacha/machine-6-enhanced.json'),
        import('@/../chronostoryData/gacha/machine-7-enhanced.json'),
        import('@/../chronostoryData/gacha/machine-8-enhanced.json'),
      ])

      // 正規化資料格式以符合 GachaMachine 型別
      const machines: GachaMachine[] = [
        normalizeGachaMachine(m1.default),
        normalizeGachaMachine(m2.default),
        normalizeGachaMachine(m3.default),
        normalizeGachaMachine(m4.default),
        normalizeGachaMachine(m5.default),
        normalizeGachaMachine(m6.default),
        normalizeGachaMachine(m7.default),
        normalizeGachaMachine(m8.default),
      ]

      setGachaMachines(machines)
      clientLogger.info(`成功載入 ${machines.length} 台轉蛋機（Enhanced 資料）`)
    } catch (error) {
      clientLogger.error('載入轉蛋機資料失敗', error)
    }
  }, [gachaMachines.length])

  // 隨機選擇 10 筆資料（初始顯示用）- Fisher-Yates shuffle
  const initialRandomDrops = useMemo(() => {
    if (allDrops.length === 0) return []

    // 複製陣列避免修改原始資料
    const shuffled = [...allDrops]

    // Fisher-Yates shuffle 演算法（只 shuffle 前 10 個）
    const sampleSize = Math.min(10, allDrops.length)
    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = i + Math.floor(Math.random() * (shuffled.length - i))
      ;[shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]]
    }

    return shuffled.slice(0, sampleSize)
  }, [allDrops])

  // 隨機選擇 15 個轉蛋物品（初始顯示用）- Fisher-Yates shuffle
  const initialRandomGachaItems = useMemo(() => {
    if (gachaMachines.length === 0) return []

    // 收集所有轉蛋物品
    const allGachaItems: Array<{
      itemId: number
      name: string
      chineseName?: string
      machineId: number
      machineName: string
      chineseMachineName?: string
      probability: string
    }> = []

    gachaMachines.forEach((machine) => {
      machine.items.forEach((item) => {
        allGachaItems.push({
          itemId: item.itemId,
          name: item.name || item.itemName || '',
          chineseName: item.chineseName,
          machineId: machine.machineId,
          machineName: machine.machineName,
          chineseMachineName: machine.chineseMachineName,
          probability: item.probability
        })
      })
    })

    // Fisher-Yates shuffle 演算法（只 shuffle 前 15 個）
    const shuffled = [...allGachaItems]
    const sampleSize = Math.min(15, allGachaItems.length)

    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = i + Math.floor(Math.random() * (shuffled.length - i))
      ;[shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]]
    }

    return shuffled.slice(0, sampleSize)
  }, [gachaMachines])

  // 建立怪物等級 Map (mobId -> level)
  const mobLevelMap = useMemo(() => {
    const levelMap = new Map<number, number | null>()
    const mobInfoArray = mobInfoData as MobInfo[]

    mobInfoArray.forEach((info) => {
      const mobId = parseInt(info.mob.id, 10)
      if (!isNaN(mobId)) {
        levelMap.set(mobId, info.mob.level)
      }
    })

    return levelMap
  }, [])

  // 建立怪物上線狀態 Map (mobId -> InGame)
  const mobInGameMap = useMemo(() => {
    const inGameMap = new Map<number, boolean>()
    const mobInfoArray = mobInfoData as MobInfo[]

    mobInfoArray.forEach((info) => {
      const mobId = parseInt(info.mob.id, 10)
      if (!isNaN(mobId)) {
        inGameMap.set(mobId, info.mob.InGame)
      }
    })

    return inGameMap
  }, [])

  // 建立怪物資訊 Map (mobId -> MobInfo)
  const mobInfoMap = useMemo(() => {
    const infoMap = new Map<number, MobInfo>()
    const mobInfoArray = mobInfoData as MobInfo[]

    mobInfoArray.forEach((info) => {
      const mobId = parseInt(info.mob.id, 10)
      if (!isNaN(mobId)) {
        infoMap.set(mobId, info)
      }
    })

    clientLogger.info(`建立怪物資訊 Map: ${infoMap.size} 隻怪物`)
    return infoMap
  }, [])

  // 建立物品屬性 Map (itemId -> ItemAttributesEssential)
  // 使用 Essential 資料（僅包含篩選所需的基本資訊和需求屬性）
  const itemAttributesMap = useMemo(() => {
    const attrMap = new Map<number, ItemAttributesEssential>()
    const itemAttributesArray = itemAttributesEssentialData as ItemAttributesEssential[]

    itemAttributesArray.forEach((attr) => {
      const itemId = parseInt(attr.item_id, 10)
      if (!isNaN(itemId)) {
        attrMap.set(itemId, attr)
      }
    })

    clientLogger.info(`建立 Essential 物品屬性 Map: ${attrMap.size} 項`)
    return attrMap
  }, [])

  // 商人地圖資料（100% 掉落）
  const merchantMaps = useMemo(() => {
    return merchantDropsData as MerchantMapData[]
  }, [])

  // Quiz 題庫資料
  const quizQuestions = useMemo(() => {
    const data = quizData as QuizData
    clientLogger.info(`載入 Quiz 題庫: ${data.questions.length} 題`)
    return data.questions
  }, [])

  // 建立商人物品索引 (itemName -> 販售該物品的地圖列表)
  // 用於 ItemModal 顯示商人販售資訊
  const merchantItemIndex = useMemo(() => {
    const index = new Map<string, Array<{
      mapId: string
      mapName: string
      chineseMapName: string
      region: string
    }>>()

    const maps = merchantDropsData as MerchantMapData[]
    maps.forEach((mapData) => {
      mapData.drops.forEach((item) => {
        // 用英文名稱作為 key（小寫）
        const keyEn = item.itemName.toLowerCase()
        if (!index.has(keyEn)) {
          index.set(keyEn, [])
        }
        // 避免重複新增同一個地圖
        const existing = index.get(keyEn)!
        if (!existing.some(m => m.mapId === mapData.mapId)) {
          existing.push({
            mapId: mapData.mapId,
            mapName: mapData.mapName,
            chineseMapName: mapData.chineseMapName,
            region: mapData.region,
          })
        }

        // 同時用中文名稱作為 key
        const keyZh = item.chineseItemName.toLowerCase()
        if (!index.has(keyZh)) {
          index.set(keyZh, [])
        }
        const existingZh = index.get(keyZh)!
        if (!existingZh.some(m => m.mapId === mapData.mapId)) {
          existingZh.push({
            mapId: mapData.mapId,
            mapName: mapData.mapName,
            chineseMapName: mapData.chineseMapName,
            region: mapData.region,
          })
        }
      })
    })

    clientLogger.info(`建立商人物品索引: ${index.size} 個物品名稱`)
    return index
  }, [])

  // 怪物索引 Map（從 chronostoryData 載入）
  const monsterIndexMap = useMemo(() => {
    const monsterIndex = monsterIndexData as MonsterIndex
    const map = new Map<number, MonsterIndexItem>()
    monsterIndex.monsters.forEach(m => map.set(m.mobId, m))
    return map
  }, [])

  // 物品索引 Map（從 chronostoryData 載入）
  const itemIndexMap = useMemo(() => {
    const itemIndex = itemIndexData as ItemIndex
    const map = new Map<number, ItemIndexItem>()
    itemIndex.items.forEach(i => map.set(i.itemId, i))
    return map
  }, [])

  return {
    // 資料
    allDrops,
    gachaMachines,
    merchantMaps,
    merchantItemIndex,
    quizQuestions,
    isLoading,

    // 初始隨機資料
    initialRandomDrops,
    initialRandomGachaItems,

    // 怪物與物品屬性資料
    mobLevelMap,
    mobInGameMap,
    mobInfoMap,
    itemAttributesMap,

    // 索引資料（來自 chronostoryData）
    monsterIndexMap,
    itemIndexMap,

    // 按需載入函數
    loadGachaMachines,
  }
}
