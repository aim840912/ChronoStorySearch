'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { DropItem, SuggestionItem, FilterMode, GachaMachine } from '@/types'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFavoriteMonsters } from '@/hooks/useFavoriteMonsters'
import { useFavoriteItems } from '@/hooks/useFavoriteItems'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { useModalManager } from '@/hooks/useModalManager'
import { useSearchWithSuggestions } from '@/hooks/useSearchWithSuggestions'
import { SearchBar } from '@/components/SearchBar'
import { FilterButtons } from '@/components/FilterButtons'
import { StatsDisplay } from '@/components/StatsDisplay'
import { DropCard } from '@/components/DropCard'
import { MonsterCard } from '@/components/MonsterCard'
import { ItemCard } from '@/components/ItemCard'
import { MonsterModal } from '@/components/MonsterModal'
import { ItemModal } from '@/components/ItemModal'
import { BugReportModal } from '@/components/BugReportModal'
import { ClearConfirmModal } from '@/components/ClearConfirmModal'
import { GachaMachineModal } from '@/components/GachaMachineModal'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Toast } from '@/components/Toast'
import { clientLogger } from '@/lib/logger'
import dropsData from '@/../public/data/drops.json'
import monsterStatsData from '@/../public/data/monster-stats.json'
import type { MonsterStats } from '@/types'

/**
 * 多關鍵字匹配函數
 * 將搜尋詞按空格拆分，檢查所有關鍵字是否都存在於目標文字中
 * @param text - 要搜尋的目標文字
 * @param searchTerm - 搜尋詞（可包含多個空格分隔的關鍵字）
 * @returns 是否所有關鍵字都匹配
 * @example
 * matchesAllKeywords("Scroll for Wand for Magic ATT 10%", "magic 10") // true
 * matchesAllKeywords("Blue Mana Potion", "blue potion") // true
 * matchesAllKeywords("Orange Mushroom", "red mushroom") // false (缺少 "red")
 */
function matchesAllKeywords(text: string, searchTerm: string): boolean {
  const keywords = searchTerm.toLowerCase().trim().split(/\s+/)
  const textLower = text.toLowerCase()

  return keywords.every(keyword => textLower.includes(keyword))
}

export default function Home() {
  const searchParams = useSearchParams()
  const { t, language } = useLanguage()

  // 資料狀態
  const [allDrops, setAllDrops] = useState<DropItem[]>([])
  const [gachaMachines, setGachaMachines] = useState<GachaMachine[]>([])
  const [filteredDrops, setFilteredDrops] = useState<DropItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 篩選模式：全部 or 最愛怪物 or 最愛物品
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  // 使用自定義 hooks
  const toast = useToast()
  const modals = useModalManager()
  const search = useSearchWithSuggestions()

  // Debounced 搜尋詞 - 延遲 500ms 以減少計算頻率
  const debouncedSearchTerm = useDebouncedValue(search.searchTerm, 500)

  // 最愛怪物管理
  const {
    favorites: favoriteMonsters,
    toggleFavorite,
    isFavorite,
    favoriteCount,
    clearAll: clearAllMonsters,
  } = useFavoriteMonsters()

  // 最愛物品管理
  const {
    favorites: favoriteItems,
    toggleFavorite: toggleItemFavorite,
    isFavorite: isItemFavorite,
    favoriteCount: favoriteItemCount,
    clearAll: clearAllItems,
  } = useFavoriteItems()

  // 載入資料（暫時使用本地 JSON）
  useEffect(() => {
    async function loadDrops() {
      try {
        setIsLoading(true)
        clientLogger.info('開始載入掉落資料（本地 JSON）...')

        // 模擬短暫載入延遲以維持用戶體驗
        await new Promise(resolve => setTimeout(resolve, 300))

        // 直接使用 imported JSON 資料
        setAllDrops(dropsData as DropItem[])
        clientLogger.info(`成功載入 ${dropsData.length} 筆掉落資料`)
      } catch (error) {
        clientLogger.error('載入掉落資料失敗', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDrops()
  }, [])

  // 載入轉蛋機資料
  useEffect(() => {
    async function loadGachaMachines() {
      try {
        clientLogger.info('開始載入轉蛋機資料...')
        const machineIds = [1, 2, 3, 4, 5, 6, 7]
        const machines = await Promise.all(
          machineIds.map(async (id) => {
            const response = await fetch(`/data/gacha/machine-${id}.json`)
            if (!response.ok) {
              throw new Error(`Failed to load machine ${id}`)
            }
            return response.json() as Promise<GachaMachine>
          })
        )
        setGachaMachines(machines)
        clientLogger.info(`成功載入 ${machines.length} 台轉蛋機`)
      } catch (error) {
        clientLogger.error('載入轉蛋機資料失敗', error)
      }
    }

    loadGachaMachines()
  }, [])

  // 處理 URL 參數 - 搜尋詞和自動開啟對應的 modal
  useEffect(() => {
    // 處理搜尋關鍵字參數
    const searchQuery = searchParams.get('q')
    if (searchQuery) {
      search.setSearchTerm(decodeURIComponent(searchQuery))
      clientLogger.info(`從 URL 參數載入搜尋詞: ${decodeURIComponent(searchQuery)}`)
    }

    if (allDrops.length === 0) return // 等待資料載入完成

    const monsterIdParam = searchParams.get('monster')
    const itemIdParam = searchParams.get('item')

    if (monsterIdParam) {
      const monsterId = parseInt(monsterIdParam, 10)
      if (!isNaN(monsterId)) {
        // 從 allDrops 中查找怪物名稱
        const monster = allDrops.find((drop) => drop.mobId === monsterId)
        if (monster) {
          // 使用顯示名稱（根據當前語言，有中文名稱且語言為中文時顯示中文，否則顯示英文）
          const displayName = (language === 'zh-TW' && monster.chineseMobName) ? monster.chineseMobName : monster.mobName
          modals.setSelectedMonsterId(monsterId)
          modals.setSelectedMonsterName(displayName)
          modals.setIsMonsterModalOpen(true)
          clientLogger.info(`從 URL 參數開啟怪物 modal: ${displayName} (${monsterId})`)
        }
      }
    } else if (itemIdParam) {
      const itemId = parseInt(itemIdParam, 10)
      if (!isNaN(itemId) || itemIdParam === '0') {
        const parsedItemId = itemIdParam === '0' ? 0 : itemId
        // 從 allDrops 中查找物品名稱
        const item = allDrops.find((drop) => drop.itemId === parsedItemId)
        if (item) {
          // 使用顯示名稱（根據當前語言，有中文名稱且語言為中文時顯示中文，否則顯示英文）
          const displayName = (language === 'zh-TW' && item.chineseItemName) ? item.chineseItemName : item.itemName
          modals.setSelectedItemId(parsedItemId)
          modals.setSelectedItemName(displayName)
          modals.setIsItemModalOpen(true)
          clientLogger.info(`從 URL 參數開啟物品 modal: ${displayName} (${parsedItemId})`)
        }
      }
    }
  }, [allDrops, searchParams, language, search, modals])

  // 隨機選擇 100 筆資料（初始顯示用）- Fisher-Yates shuffle
  const initialRandomDrops = useMemo(() => {
    if (allDrops.length === 0) return []

    // 複製陣列避免修改原始資料
    const shuffled = [...allDrops]

    // Fisher-Yates shuffle 演算法（只 shuffle 前 100 個）
    const sampleSize = Math.min(100, allDrops.length)
    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = i + Math.floor(Math.random() * (shuffled.length - i))
      ;[shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]]
    }

    return shuffled.slice(0, sampleSize)
  }, [allDrops])

  // 建立怪物血量快速查詢 Map (mobId -> maxHP)
  const monsterHPMap = useMemo(() => {
    const hpMap = new Map<number, number | null>()
    const stats = monsterStatsData as MonsterStats[]

    stats.forEach((stat) => {
      hpMap.set(stat.mobId, stat.maxHP)
    })

    return hpMap
  }, [])

  // 計算去重的最愛怪物清單（每個怪物只出現一次）
  const uniqueFavoriteMonsters = useMemo(() => {
    if (filterMode !== 'favorite-monsters' || favoriteMonsters.length === 0) return []

    const favMobIds = new Set(favoriteMonsters.map((fav) => fav.mobId))
    const monsterMap = new Map<number, { mobId: number; mobName: string; chineseMobName?: string | null; dropCount: number }>()

    // 統計每個怪物的掉落物數量
    allDrops.forEach((drop) => {
      if (favMobIds.has(drop.mobId)) {
        if (!monsterMap.has(drop.mobId)) {
          monsterMap.set(drop.mobId, {
            mobId: drop.mobId,
            mobName: drop.mobName,
            chineseMobName: drop.chineseMobName, // 新增中文名稱
            dropCount: 0,
          })
        }
        monsterMap.get(drop.mobId)!.dropCount++
      }
    })

    return Array.from(monsterMap.values())
  }, [filterMode, favoriteMonsters, allDrops])

  // 計算去重的最愛物品清單（每個物品只出現一次）
  const uniqueFavoriteItems = useMemo(() => {
    if (filterMode !== 'favorite-items' || favoriteItems.length === 0) return []

    const favItemIds = new Set(favoriteItems.map((fav) => fav.itemId))
    const itemMap = new Map<number, { itemId: number; itemName: string; chineseItemName?: string | null; monsterCount: number }>()

    // 統計每個物品被多少怪物掉落
    allDrops.forEach((drop) => {
      if (favItemIds.has(drop.itemId)) {
        if (!itemMap.has(drop.itemId)) {
          itemMap.set(drop.itemId, {
            itemId: drop.itemId,
            itemName: drop.itemName,
            chineseItemName: drop.chineseItemName, // 新增中文名稱
            monsterCount: 0,
          })
        }
        // 統計獨特的怪物數量（避免重複計算同一怪物）
        const uniqueMonsters = new Set<number>()
        allDrops.forEach((d) => {
          if (d.itemId === drop.itemId) {
            uniqueMonsters.add(d.mobId)
          }
        })
        itemMap.get(drop.itemId)!.monsterCount = uniqueMonsters.size
      }
    })

    return Array.from(itemMap.values())
  }, [filterMode, favoriteItems, allDrops])

  // 最愛怪物搜尋過濾（支援多關鍵字搜尋 + 中英文搜尋）
  const filteredUniqueMonsters = useMemo(() => {
    if (filterMode !== 'favorite-monsters') return []

    if (debouncedSearchTerm.trim() === '') {
      return uniqueFavoriteMonsters
    }

    return uniqueFavoriteMonsters.filter((monster) =>
      matchesAllKeywords(monster.mobName, debouncedSearchTerm) ||
      (monster.chineseMobName && matchesAllKeywords(monster.chineseMobName, debouncedSearchTerm))
    )
  }, [uniqueFavoriteMonsters, debouncedSearchTerm, filterMode])

  // 最愛物品搜尋過濾（支援多關鍵字搜尋 + 中英文搜尋）
  const filteredUniqueItems = useMemo(() => {
    if (filterMode !== 'favorite-items') return []

    if (debouncedSearchTerm.trim() === '') {
      return uniqueFavoriteItems
    }

    return uniqueFavoriteItems.filter((item) =>
      matchesAllKeywords(item.itemName, debouncedSearchTerm) ||
      (item.chineseItemName && matchesAllKeywords(item.chineseItemName, debouncedSearchTerm))
    )
  }, [uniqueFavoriteItems, debouncedSearchTerm, filterMode])

  // 搜尋功能 - 即時搜尋（使用 debounced 值）+ 最愛篩選
  useEffect(() => {
    let baseDrops: DropItem[] = []

    // 根據篩選模式選擇基礎資料
    if (filterMode === 'favorite-monsters' || filterMode === 'favorite-items') {
      // 最愛模式：不使用此 effect（由 filteredUniqueMonsters/filteredUniqueItems 處理）
      return
    } else {
      // 全部模式
      baseDrops = debouncedSearchTerm.trim() === '' ? initialRandomDrops : allDrops
    }

    // 應用搜尋過濾（支援多關鍵字搜尋 + 中英文搜尋）
    if (debouncedSearchTerm.trim() === '') {
      setFilteredDrops(baseDrops)
    } else {
      const filtered = baseDrops.filter((drop) => {
        return (
          matchesAllKeywords(drop.mobName, debouncedSearchTerm) ||
          matchesAllKeywords(drop.itemName, debouncedSearchTerm) ||
          (drop.chineseMobName && matchesAllKeywords(drop.chineseMobName, debouncedSearchTerm)) ||
          (drop.chineseItemName && matchesAllKeywords(drop.chineseItemName, debouncedSearchTerm))
        )
      })
      setFilteredDrops(filtered)
    }
  }, [debouncedSearchTerm, allDrops, initialRandomDrops, filterMode, favoriteMonsters])

  // 預建名稱索引 - 只在資料載入時計算一次
  const nameIndex = useMemo(() => {
    const monsterMap = new Map<string, SuggestionItem>()
    const itemMap = new Map<string, SuggestionItem>()
    const gachaMap = new Map<string, SuggestionItem>()

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

      // 建立物品英文名稱索引
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
                machineId: machine.machineId,
                machineName: machine.machineName,
              })
            }
          }
        }
      })
    })

    return { monsterMap, itemMap, gachaMap }
  }, [allDrops, gachaMachines])

  // 計算搜尋建議列表（使用索引優化效能，支援多關鍵字搜尋）
  const suggestions = useMemo(() => {
    if (debouncedSearchTerm.trim() === '' || nameIndex.monsterMap.size === 0) {
      return []
    }

    const results: SuggestionItem[] = []
    const firstKeyword = debouncedSearchTerm.toLowerCase().trim().split(/\s+/)[0]

    // 從怪物索引中搜尋（支援多關鍵字匹配）
    nameIndex.monsterMap.forEach((suggestion) => {
      if (matchesAllKeywords(suggestion.name, debouncedSearchTerm)) {
        results.push(suggestion)
      }
    })

    // 從物品索引中搜尋（支援多關鍵字匹配）
    nameIndex.itemMap.forEach((suggestion) => {
      if (matchesAllKeywords(suggestion.name, debouncedSearchTerm)) {
        results.push(suggestion)
      }
    })

    // 從轉蛋機物品索引中搜尋（支援多關鍵字匹配）
    nameIndex.gachaMap.forEach((suggestion) => {
      if (matchesAllKeywords(suggestion.name, debouncedSearchTerm)) {
        results.push(suggestion)
      }
    })

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
  }, [debouncedSearchTerm, nameIndex])

  // 選擇建議項目
  const selectSuggestion = (suggestionName: string, suggestion?: SuggestionItem) => {
    // 如果是轉蛋物品,開啟轉蛋機 Modal
    if (suggestion && suggestion.type === 'gacha' && suggestion.machineId) {
      // 找到對應的轉蛋機並開啟 modal
      const machine = gachaMachines.find(m => m.machineId === suggestion.machineId)
      if (machine) {
        modals.openGachaModal()
        search.setSearchTerm(suggestionName) // 也設定搜尋詞以便在 modal 中過濾
      }
    } else {
      search.selectSuggestion(suggestionName)
    }
  }

  // 清除最愛確認處理
  const handleClearConfirm = () => {
    if (modals.clearModalType === 'monsters') {
      clearAllMonsters()
    } else {
      clearAllItems()
    }
  }

  // 分享處理函數
  const handleShare = async () => {
    if (!search.searchTerm.trim()) return

    try {
      const url = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(search.searchTerm)}`
      await navigator.clipboard.writeText(url)
      toast.showToast(t('share.success'), 'success')
      clientLogger.info(`分享連結已複製: ${url}`)
    } catch (error) {
      toast.showToast(t('share.error'), 'error')
      clientLogger.error('複製連結失敗', error)
    }
  }

  // 鍵盤導航處理 - 包裝 search.handleKeyDown 以處理轉蛋建議
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    search.handleKeyDown(e, suggestions, (suggestion) => {
      if (suggestion.type === 'gacha' && suggestion.machineId) {
        const machine = gachaMachines.find(m => m.machineId === suggestion.machineId)
        if (machine) {
          modals.openGachaModal()
        }
      }
    })
  }

  // MonsterModal 中點擊裝備：不關閉 MonsterModal，直接在上方打開 ItemModal
  const handleItemClickFromMonsterModal = (itemId: number, itemName: string) => {
    // 不調用 modals.closeMonsterModal()
    modals.openItemModal(itemId, itemName)
  }

  // ItemModal 中點擊怪物：關閉 ItemModal，顯示下方已打開的 MonsterModal
  const handleMonsterClickFromItemModal = (mobId: number, mobName: string) => {
    modals.closeItemModal() // 關閉 ItemModal
    // 更新 MonsterModal 的內容（MonsterModal 保持開啟）
    modals.setSelectedMonsterId(mobId)
    modals.setSelectedMonsterName(mobName)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 pb-12">
        {/* Sticky Header - 固定搜尋區域 */}
        <div className="sticky top-0 z-40 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 backdrop-blur-sm pt-12 pb-6 shadow-md">
          {/* 標題區域 */}
          <div className="relative text-center mb-8 pt-2">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              {t('app.title')}
            </h1>
            {/* 主題與語言切換按鈕 - 右上角 */}
            <div className="absolute top-0 right-4 flex gap-2">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>

          {/* 搜尋列 */}
          <SearchBar
            searchTerm={search.searchTerm}
            onSearchChange={search.setSearchTerm}
            suggestions={suggestions}
            showSuggestions={search.showSuggestions}
            onFocus={() => search.setShowSuggestions(true)}
            onSelectSuggestion={selectSuggestion}
            onKeyDown={handleKeyDown}
            focusedIndex={search.focusedIndex}
            onFocusedIndexChange={search.setFocusedIndex}
            searchContainerRef={search.searchContainerRef}
            onShare={handleShare}
          />

          {/* 篩選按鈕 */}
          <FilterButtons
            filterMode={filterMode}
            onFilterChange={setFilterMode}
            favoriteMonsterCount={favoriteCount}
            favoriteItemCount={favoriteItemCount}
            onClearClick={modals.openClearModal}
          />

          {/* 資料統計 */}
          <StatsDisplay
            filterMode={filterMode}
            searchTerm={search.searchTerm}
            filteredUniqueMonsterCount={filteredUniqueMonsters.length}
            favoriteMonsterCount={favoriteCount}
            filteredUniqueItemCount={filteredUniqueItems.length}
            favoriteItemCount={favoriteItemCount}
            filteredDropsCount={filteredDrops.length}
            totalDropsCount={allDrops.length}
          />
        </div>
        {/* End Sticky Header */}

        {/* 載入中 */}
        {isLoading ? (
          <div className="text-center py-12 mt-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading')}</p>
          </div>
        ) : (
          <>
            {filterMode === 'favorite-monsters' ? (
              /* 最愛怪物模式 - 顯示怪物卡片 */
              filteredUniqueMonsters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
                  {filteredUniqueMonsters.map((monster) => (
                    <MonsterCard
                      key={monster.mobId}
                      mobId={monster.mobId}
                      mobName={monster.mobName}
                      chineseMobName={monster.chineseMobName}
                      dropCount={monster.dropCount}
                      onCardClick={modals.openMonsterModal}
                      isFavorite={true}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 mt-8">
                  <div className="text-6xl mb-4">{search.searchTerm ? '🔍' : '💝'}</div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                    {search.searchTerm ? t('empty.searchNoMatch') : t('empty.noFavoriteMonsters')}
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">
                    {search.searchTerm
                      ? t('empty.tryOtherKeywords')
                      : t('empty.clickToFavoriteMonster')}
                  </p>
                </div>
              )
            ) : filterMode === 'favorite-items' ? (
              /* 最愛物品模式 - 顯示物品卡片 */
              filteredUniqueItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
                  {filteredUniqueItems.map((item) => (
                    <ItemCard
                      key={item.itemId}
                      itemId={item.itemId}
                      itemName={item.itemName}
                      chineseItemName={item.chineseItemName}
                      monsterCount={item.monsterCount}
                      onCardClick={modals.openItemModal}
                      isFavorite={true}
                      onToggleFavorite={toggleItemFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 mt-8">
                  <div className="text-6xl mb-4">{search.searchTerm ? '🔍' : '💝'}</div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                    {search.searchTerm ? t('empty.searchNoMatch') : t('empty.noFavoriteItems')}
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">
                    {search.searchTerm
                      ? t('empty.tryOtherKeywords')
                      : t('empty.clickToFavoriteItem')}
                  </p>
                </div>
              )
            ) : (
              /* 全部模式 - 顯示掉落卡片 */
              filteredDrops.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
                  {filteredDrops.map((drop, index) => (
                    <DropCard
                      key={`${drop.mobId}-${drop.itemId}-${index}`}
                      drop={drop}
                      onCardClick={modals.openMonsterModal}
                      isFavorite={isFavorite(drop.mobId)}
                      onToggleFavorite={toggleFavorite}
                      maxHP={monsterHPMap.get(drop.mobId)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 mt-8">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                    {search.searchTerm ? t('empty.noResults') : t('empty.noData')}
                  </p>
                  {search.searchTerm && (
                    <p className="text-gray-500 dark:text-gray-500 text-sm">
                      {t('empty.tryOtherKeywords')}
                    </p>
                  )}
                </div>
              )
            )}
          </>
        )}

        {/* 底部資訊 */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            <a
              href="https://docs.google.com/spreadsheets/d/e/2PACX-1vRpKuZGJQIFFxSi6kzYx4ALI0MQborpLEkh3J1qIGSd0Bw7U4NYg5CK-3ESzyK580z4D8NO59SUeC3k/pubhtml?gid=1888753114&single=true"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
            >
              {t('footer.dataSource')}
            </a>
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
            {t('footer.note')}
          </p>
        </div>
      </div>

      {/* Monster Drops Modal */}
      <MonsterModal
        isOpen={modals.isMonsterModalOpen}
        onClose={modals.closeMonsterModal}
        monsterId={modals.selectedMonsterId}
        monsterName={modals.selectedMonsterName}
        allDrops={allDrops}
        isFavorite={modals.selectedMonsterId ? isFavorite(modals.selectedMonsterId) : false}
        onToggleFavorite={toggleFavorite}
        isItemFavorite={isItemFavorite}
        onToggleItemFavorite={toggleItemFavorite}
        onItemClick={handleItemClickFromMonsterModal}
      />

      {/* Item Drops Modal */}
      <ItemModal
        isOpen={modals.isItemModalOpen}
        onClose={modals.closeItemModal}
        itemId={modals.selectedItemId}
        itemName={modals.selectedItemName}
        allDrops={allDrops}
        isFavorite={modals.selectedItemId !== null ? isItemFavorite(modals.selectedItemId) : false}
        onToggleFavorite={toggleItemFavorite}
        isMonsterFavorite={isFavorite}
        onToggleMonsterFavorite={toggleFavorite}
        onMonsterClick={handleMonsterClickFromItemModal}
      />

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={modals.isBugReportModalOpen}
        onClose={modals.closeBugReportModal}
      />

      {/* Confirm Clear Modal */}
      <ClearConfirmModal
        isOpen={modals.isClearModalOpen}
        onClose={modals.closeClearModal}
        onConfirm={handleClearConfirm}
        type={modals.clearModalType}
        count={modals.clearModalType === 'monsters' ? favoriteCount : favoriteItemCount}
      />

      {/* Gacha Machine Modal */}
      <GachaMachineModal
        isOpen={modals.isGachaModalOpen}
        onClose={modals.closeGachaModal}
      />

      {/* 浮動轉蛋機按鈕 */}
      <button
        onClick={modals.openGachaModal}
        className="fixed bottom-6 left-6 z-40 p-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('gacha.button')}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
            />
          </svg>
          <span className="text-sm font-medium hidden group-hover:inline-block">{t('gacha.button')}</span>
        </div>
      </button>

      {/* 浮動 Bug 回報按鈕 */}
      <button
        onClick={modals.openBugReportModal}
        className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label={t('bug.report')}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐛</span>
          <span className="text-sm font-medium hidden group-hover:inline-block">{t('bug.report')}</span>
        </div>
      </button>

      {/* Toast 通知 */}
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={toast.hideToast}
        type={toast.type}
      />
    </div>
  )
}
