'use client'

import { useMemo } from 'react'
import type { DropsEssential, GachaMachine, SuggestionItem, SearchTypeFilter, MerchantMapData, QuizQuestion, ItemIndexItem } from '@/types'
import { matchesAllKeywords } from '@/lib/search-utils'

interface UseSearchLogicParams {
  allDrops: DropsEssential[]  // 改為 Essential（只需要基本資訊用於搜尋索引）
  gachaMachines: GachaMachine[]
  merchantMaps: MerchantMapData[]  // 商人 100% 掉落資料
  quizQuestions: QuizQuestion[]    // Quiz 題庫資料
  itemIndexMap?: Map<number, ItemIndexItem>  // 物品索引（補充沒有掉落的物品）
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
  quizQuestions,
  itemIndexMap,
  debouncedSearchTerm,
  searchType,
}: UseSearchLogicParams) {
  // 預建名稱索引 - 只在資料載入時計算一次
  const nameIndex = useMemo(() => {
    const monsterMap = new Map<string, SuggestionItem>()
    const itemMap = new Map<string, SuggestionItem>()
    const gachaMap = new Map<string, SuggestionItem>()
    const merchantMap = new Map<string, SuggestionItem>()
    const quizMap = new Map<string, SuggestionItem>()

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
          inGame: drop.inGame, // 是否已在遊戲中
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
              inGame: drop.inGame, // 是否已在遊戲中
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

    // 補充 item-index 中沒有在 allDrops 的物品（如 Unwelcome Guest 武器）
    // 這些物品沒有怪物掉落，但應該可以被搜尋到
    if (itemIndexMap) {
      itemIndexMap.forEach((indexItem) => {
        const itemNameLower = indexItem.itemName.toLowerCase()
        // 只補充不存在於 itemMap 的物品（避免重複）
        if (!itemMap.has(itemNameLower)) {
          itemMap.set(itemNameLower, {
            name: indexItem.itemName,
            type: 'item',
            count: 1,
            id: indexItem.itemId,
          })
        }

        // 補充中文名稱索引（如果存在且與英文不同）
        if (indexItem.chineseItemName) {
          const chineseNameLower = indexItem.chineseItemName.toLowerCase()
          if (chineseNameLower !== itemNameLower && !itemMap.has(chineseNameLower)) {
            itemMap.set(chineseNameLower, {
              name: indexItem.chineseItemName,
              type: 'item',
              count: 1,
              id: indexItem.itemId,
            })
          }
        }
      })
    }

    // 建立轉蛋機物品索引
    gachaMachines.forEach((machine) => {
      machine.items.forEach((item) => {
        // 使用英文名稱作為主要索引（確保每個物品都有索引）
        const englishName = item.name || item.itemName || ''
        const englishNameLower = englishName.toLowerCase()

        // 為英文名稱建立索引（跳過空名稱）
        if (englishNameLower) {
          const existingEnglish = gachaMap.get(englishNameLower)
          if (existingEnglish) {
            existingEnglish.count++
          } else {
            gachaMap.set(englishNameLower, {
              name: englishName,
              type: 'gacha',
              count: 1,
              id: item.itemId, // 物品 ID（用於打開 ItemModal）
              machineId: machine.machineId,
              machineName: machine.machineName,
            })
          }
        }

        // 為中文名稱建立索引（如果存在且與英文名稱不同）
        if (item.chineseName && typeof item.chineseName === 'string') {
          const chineseNameLower = item.chineseName.toLowerCase()
          if (chineseNameLower !== englishNameLower) {
            const existingChinese = gachaMap.get(chineseNameLower)
            if (existingChinese) {
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

    // 建立 Quiz 索引（目前只用英文）
    quizQuestions.forEach((question, index) => {
      // 建立題目的搜尋索引（用英文題目的前 40 字作為顯示名稱）
      const displayName = question.questionEn.length > 40
        ? question.questionEn.slice(0, 40) + '...'
        : question.questionEn

      // 為這個題目建立索引項目
      const quizItem: SuggestionItem = {
        name: displayName,
        type: 'quiz',
        count: 1,
        id: index,
        questionEn: question.questionEn,
        answerEn: question.answer?.en || '',
      }

      // 使用唯一鍵（題目索引）存入 Map
      quizMap.set(`quiz-${index}`, quizItem)
    })

    return { monsterMap, itemMap, gachaMap, merchantMap, quizMap }
  }, [allDrops, gachaMachines, merchantMaps, quizQuestions, itemIndexMap])

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
    } else if (searchType === 'quiz') {
      // 只從 Quiz 索引中搜尋（只用英文搜尋）
      nameIndex.quizMap.forEach((suggestion) => {
        // 只用英文欄位搜尋（中文資料保留但暫不用於搜尋）
        const searchableText = [
          suggestion.questionEn,
          suggestion.answerEn,
        ].filter(Boolean).join(' ')

        if (matchesAllKeywords(searchableText, debouncedSearchTerm)) {
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
      // 加入 Quiz 索引搜尋（只用英文搜尋）
      nameIndex.quizMap.forEach((suggestion) => {
        const searchableText = [
          suggestion.questionEn,
          suggestion.answerEn,
        ].filter(Boolean).join(' ')

        if (matchesAllKeywords(searchableText, debouncedSearchTerm)) {
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
