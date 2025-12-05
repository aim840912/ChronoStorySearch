'use client'

import { useMemo } from 'react'
import type { DropsEssential, GachaMachine, SuggestionItem, SearchTypeFilter, MerchantMapData } from '@/types'
import { matchesAllKeywords } from '@/lib/search-utils'

interface UseSearchLogicParams {
  allDrops: DropsEssential[]  // 改為 Essential（只需要基本資訊用於搜尋索引）
  gachaMachines: GachaMachine[]
  merchantMaps: MerchantMapData[]  // 商人 100% 掉落資料
  debouncedSearchTerm: string
  searchType: SearchTypeFilter
}

/**
 * 搜尋邏輯 Hook
 * 職責：
 * - 建立名稱索引（monsters, items, gacha）
 * - 計算搜尋建議列表
 * - 優化搜尋效能
 */
export function useSearchLogic({
  allDrops,
  gachaMachines,
  merchantMaps,
  debouncedSearchTerm,
  searchType,
}: UseSearchLogicParams) {
  // 預建名稱索引 - 只在資料載入時計算一次
  const nameIndex = useMemo(() => {
    const monsterMap = new Map<string, SuggestionItem>()
    const itemMap = new Map<string, SuggestionItem>()
    const gachaMap = new Map<string, SuggestionItem>()
    const merchantMap = new Map<string, SuggestionItem>()

    // 建立怪物和物品索引
    allDrops.forEach((drop) => {
      // 建立怪物英文名稱索引
      const mobNameLower = drop.mobName.toLowerCase()
      const existingMonster = monsterMap.get(mobNameLower)
      if (existingMonster) {
        existingMonster.count++
      } else {
        monsterMap.set(mobNameLower, {
          name: drop.mobName, // 保留原始大小寫
          type: 'monster',
          count: 1,
          id: drop.mobId, // 記錄怪物 ID
        })
      }

      // 建立怪物中文名稱索引（如果存在且與英文不同）
      if (drop.chineseMobName) {
        const chineseMobNameLower = drop.chineseMobName.toLowerCase()
        if (chineseMobNameLower !== mobNameLower) {
          const existingChineseMob = monsterMap.get(chineseMobNameLower)
          if (existingChineseMob) {
            existingChineseMob.count++
          } else {
            monsterMap.set(chineseMobNameLower, {
              name: drop.chineseMobName, // 保留原始大小寫
              type: 'monster',
              count: 1,
              id: drop.mobId, // 記錄怪物 ID
            })
          }
        }
      }

      // 建立物品英文名稱索引（跳過 null）
      if (drop.itemName) {
        const itemNameLower = drop.itemName.toLowerCase()
        const existingItem = itemMap.get(itemNameLower)
        if (existingItem) {
          existingItem.count++
        } else {
          itemMap.set(itemNameLower, {
            name: drop.itemName, // 保留原始大小寫
            type: 'item',
            count: 1,
            id: drop.itemId, // 記錄物品 ID
          })
        }

        // 建立物品中文名稱索引（如果存在且與英文不同）
        if (drop.chineseItemName) {
          const chineseItemNameLower = drop.chineseItemName.toLowerCase()
          if (chineseItemNameLower !== itemNameLower) {
            const existingChineseItem = itemMap.get(chineseItemNameLower)
            if (existingChineseItem) {
              existingChineseItem.count++
            } else {
              itemMap.set(chineseItemNameLower, {
                name: drop.chineseItemName, // 保留原始大小寫
                type: 'item',
                count: 1,
                id: drop.itemId, // 記錄物品 ID
              })
            }
          }
        }
      }
    })

    // 建立轉蛋機物品索引
    gachaMachines.forEach((machine) => {
      machine.items.forEach((item) => {
        // 為中文名稱建立索引
        const chineseNameLower = item.chineseName.toLowerCase()
        const existingChinese = gachaMap.get(chineseNameLower)
        if (existingChinese) {
          // 如果已存在，增加計數（可能同一物品在多台轉蛋機出現）
          existingChinese.count++
        } else {
          gachaMap.set(chineseNameLower, {
            name: item.chineseName, // 保留原始大小寫
            type: 'gacha',
            count: 1,
            id: item.itemId, // 物品 ID（用於打開 ItemModal）
            machineId: machine.machineId,
            machineName: machine.machineName,
          })
        }

        // 為英文名稱建立索引（如果與中文名稱不同）
        // 使用 name 或 itemName（備援機制，處理 API 整合失敗的物品）
        const englishName = item.name || item.itemName
        if (englishName && typeof englishName === 'string') {
          const englishNameLower = englishName.toLowerCase()
          if (englishNameLower !== chineseNameLower) {
            const existingEnglish = gachaMap.get(englishNameLower)
            if (existingEnglish) {
              existingEnglish.count++
            } else {
              gachaMap.set(englishNameLower, {
                name: englishName, // 使用英文名稱
                type: 'gacha',
                count: 1,
                id: item.itemId, // 物品 ID（用於打開 ItemModal）
                machineId: machine.machineId,
                machineName: machine.machineName,
              })
            }
          }
        }
      })
    })

    // 建立商人地圖索引（100% 掉落物品）
    // 搜尋方式：以物品名稱建立索引，對應到地圖
    merchantMaps.forEach((mapData) => {
      mapData.drops.forEach((item) => {
        // 為英文物品名稱建立索引
        const itemNameLower = item.itemName.toLowerCase()
        const existingEnglish = merchantMap.get(itemNameLower)
        if (!existingEnglish) {
          merchantMap.set(itemNameLower, {
            name: item.itemName,
            type: 'merchant',
            count: 1,
            mapId: mapData.mapId,
            mapName: mapData.mapName,
            chineseMapName: mapData.chineseMapName,
          })
        }

        // 為中文物品名稱建立索引（如果存在且與英文不同）
        if (item.chineseItemName) {
          const chineseNameLower = item.chineseItemName.toLowerCase()
          if (chineseNameLower !== itemNameLower) {
            const existingChinese = merchantMap.get(chineseNameLower)
            if (!existingChinese) {
              merchantMap.set(chineseNameLower, {
                name: item.chineseItemName,
                type: 'merchant',
                count: 1,
                mapId: mapData.mapId,
                mapName: mapData.mapName,
                chineseMapName: mapData.chineseMapName,
              })
            }
          }
        }
      })
    })

    return { monsterMap, itemMap, gachaMap, merchantMap }
  }, [allDrops, gachaMachines, merchantMaps])

  // 計算搜尋建議列表（使用索引優化效能，支援多關鍵字搜尋和類型過濾）
  const suggestions = useMemo(() => {
    if (debouncedSearchTerm.trim() === '' || nameIndex.monsterMap.size === 0) {
      return []
    }

    const results: SuggestionItem[] = []
    const firstKeyword = debouncedSearchTerm.toLowerCase().trim().split(/\s+/)[0]

    // 根據 searchType 決定搜尋範圍
    if (searchType === 'monster') {
      // 只從怪物索引中搜尋
      nameIndex.monsterMap.forEach((suggestion) => {
        if (matchesAllKeywords(suggestion.name, debouncedSearchTerm)) {
          results.push(suggestion)
        }
      })
    } else if (searchType === 'item') {
      // 只從物品和轉蛋索引中搜尋
      nameIndex.itemMap.forEach((suggestion) => {
        if (matchesAllKeywords(suggestion.name, debouncedSearchTerm)) {
          results.push(suggestion)
        }
      })
      nameIndex.gachaMap.forEach((suggestion) => {
        if (matchesAllKeywords(suggestion.name, debouncedSearchTerm)) {
          results.push(suggestion)
        }
      })
    } else if (searchType === 'gacha') {
      // 只從轉蛋索引中搜尋
      nameIndex.gachaMap.forEach((suggestion) => {
        if (matchesAllKeywords(suggestion.name, debouncedSearchTerm)) {
          results.push(suggestion)
        }
      })
    } else if (searchType === 'merchant') {
      // 只從商人索引中搜尋
      nameIndex.merchantMap.forEach((suggestion) => {
        if (matchesAllKeywords(suggestion.name, debouncedSearchTerm)) {
          results.push(suggestion)
        }
      })
    } else {
      // 'all': 從所有索引中搜尋（原有邏輯）
      nameIndex.monsterMap.forEach((suggestion) => {
        if (matchesAllKeywords(suggestion.name, debouncedSearchTerm)) {
          results.push(suggestion)
        }
      })
      nameIndex.itemMap.forEach((suggestion) => {
        if (matchesAllKeywords(suggestion.name, debouncedSearchTerm)) {
          results.push(suggestion)
        }
      })
      nameIndex.gachaMap.forEach((suggestion) => {
        if (matchesAllKeywords(suggestion.name, debouncedSearchTerm)) {
          results.push(suggestion)
        }
      })
      // 加入商人索引搜尋
      nameIndex.merchantMap.forEach((suggestion) => {
        if (matchesAllKeywords(suggestion.name, debouncedSearchTerm)) {
          results.push(suggestion)
        }
      })
    }

    // 排序：優先第一個關鍵字在開頭匹配，其次按出現次數
    results.sort((a, b) => {
      const aNameLower = a.name.toLowerCase()
      const bNameLower = b.name.toLowerCase()
      const aStartsWith = aNameLower.startsWith(firstKeyword)
      const bStartsWith = bNameLower.startsWith(firstKeyword)

      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return b.count - a.count // 出現次數多的排前面
    })

    // 限制結果數量最多 10 個
    return results.slice(0, 10)
  }, [debouncedSearchTerm, nameIndex, searchType])

  return {
    nameIndex,
    suggestions,
  }
}
