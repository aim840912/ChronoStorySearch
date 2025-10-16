'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { DropItem, SuggestionItem, FilterMode, ClearModalType, GachaMachine } from '@/types'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFavoriteMonsters } from '@/hooks/useFavoriteMonsters'
import { useFavoriteItems } from '@/hooks/useFavoriteItems'
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
import { clientLogger } from '@/lib/logger'
import dropsData from '@/../public/data/drops.json'

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
  const router = useRouter()

  const [allDrops, setAllDrops] = useState<DropItem[]>([])
  const [gachaMachines, setGachaMachines] = useState<GachaMachine[]>([])
  const [filteredDrops, setFilteredDrops] = useState<DropItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMonsterId, setSelectedMonsterId] = useState<number | null>(null)
  const [selectedMonsterName, setSelectedMonsterName] = useState('')
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [selectedItemName, setSelectedItemName] = useState('')
  const [isBugReportModalOpen, setIsBugReportModalOpen] = useState(false)
  const [isClearModalOpen, setIsClearModalOpen] = useState(false)
  const [clearModalType, setClearModalType] = useState<ClearModalType>('monsters')
  const [isGachaModalOpen, setIsGachaModalOpen] = useState(false)

  // 篩選模式：全部 or 最愛怪物 or 最愛物品
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  // Debounced 搜尋詞 - 延遲 500ms 以減少計算頻率
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 500)

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
        setMessage(
          `成功載入楓之谷掉落資料${process.env.NODE_ENV === 'development' ? '（本地模式）' : ''}`
        )
        clientLogger.info(`成功載入 ${dropsData.length} 筆掉落資料`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '載入資料失敗'
        setMessage(errorMsg)
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

  // 處理 URL 參數 - 自動開啟對應的 modal
  useEffect(() => {
    if (allDrops.length === 0) return // 等待資料載入完成

    const monsterIdParam = searchParams.get('monster')
    const itemIdParam = searchParams.get('item')

    if (monsterIdParam) {
      const monsterId = parseInt(monsterIdParam, 10)
      if (!isNaN(monsterId)) {
        // 從 allDrops 中查找怪物名稱
        const monster = allDrops.find((drop) => drop.mobId === monsterId)
        if (monster) {
          setSelectedMonsterId(monsterId)
          setSelectedMonsterName(monster.mobName)
          setIsModalOpen(true)
          clientLogger.info(`從 URL 參數開啟怪物 modal: ${monster.mobName} (${monsterId})`)
        }
      }
    } else if (itemIdParam) {
      const itemId = parseInt(itemIdParam, 10)
      if (!isNaN(itemId) || itemIdParam === '0') {
        const parsedItemId = itemIdParam === '0' ? 0 : itemId
        // 從 allDrops 中查找物品名稱
        const item = allDrops.find((drop) => drop.itemId === parsedItemId)
        if (item) {
          setSelectedItemId(parsedItemId)
          setSelectedItemName(item.itemName)
          setIsItemModalOpen(true)
          clientLogger.info(`從 URL 參數開啟物品 modal: ${item.itemName} (${parsedItemId})`)
        }
      }
    }
  }, [allDrops, searchParams])

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

  // 計算去重的最愛怪物清單（每個怪物只出現一次）
  const uniqueFavoriteMonsters = useMemo(() => {
    if (filterMode !== 'favorite-monsters' || favoriteMonsters.length === 0) return []

    const favMobIds = new Set(favoriteMonsters.map((fav) => fav.mobId))
    const monsterMap = new Map<number, { mobId: number; mobName: string; dropCount: number }>()

    // 統計每個怪物的掉落物數量
    allDrops.forEach((drop) => {
      if (favMobIds.has(drop.mobId)) {
        if (!monsterMap.has(drop.mobId)) {
          monsterMap.set(drop.mobId, {
            mobId: drop.mobId,
            mobName: drop.mobName,
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
    const itemMap = new Map<number, { itemId: number; itemName: string; monsterCount: number }>()

    // 統計每個物品被多少怪物掉落
    allDrops.forEach((drop) => {
      if (favItemIds.has(drop.itemId)) {
        if (!itemMap.has(drop.itemId)) {
          itemMap.set(drop.itemId, {
            itemId: drop.itemId,
            itemName: drop.itemName,
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

  // 最愛怪物搜尋過濾（支援多關鍵字搜尋）
  const filteredUniqueMonsters = useMemo(() => {
    if (filterMode !== 'favorite-monsters') return []

    if (debouncedSearchTerm.trim() === '') {
      return uniqueFavoriteMonsters
    }

    return uniqueFavoriteMonsters.filter((monster) =>
      matchesAllKeywords(monster.mobName, debouncedSearchTerm)
    )
  }, [uniqueFavoriteMonsters, debouncedSearchTerm, filterMode])

  // 最愛物品搜尋過濾（支援多關鍵字搜尋）
  const filteredUniqueItems = useMemo(() => {
    if (filterMode !== 'favorite-items') return []

    if (debouncedSearchTerm.trim() === '') {
      return uniqueFavoriteItems
    }

    return uniqueFavoriteItems.filter((item) =>
      matchesAllKeywords(item.itemName, debouncedSearchTerm)
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

    // 應用搜尋過濾（支援多關鍵字搜尋）
    if (debouncedSearchTerm.trim() === '') {
      setFilteredDrops(baseDrops)
    } else {
      const filtered = baseDrops.filter((drop) => {
        return (
          matchesAllKeywords(drop.mobName, debouncedSearchTerm) ||
          matchesAllKeywords(drop.itemName, debouncedSearchTerm)
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
      // 建立怪物名稱索引
      const mobNameLower = drop.mobName.toLowerCase()
      const existingMonster = monsterMap.get(mobNameLower)
      if (existingMonster) {
        existingMonster.count++
      } else {
        monsterMap.set(mobNameLower, {
          name: drop.mobName, // 保留原始大小寫
          type: 'monster',
          count: 1,
        })
      }

      // 建立物品名稱索引
      const itemNameLower = drop.itemName.toLowerCase()
      const existingItem = itemMap.get(itemNameLower)
      if (existingItem) {
        existingItem.count++
      } else {
        itemMap.set(itemNameLower, {
          name: drop.itemName, // 保留原始大小寫
          type: 'item',
          count: 1,
        })
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
        setIsGachaModalOpen(true)
        setSearchTerm(suggestionName) // 也設定搜尋詞以便在 modal 中過濾
      }
    } else {
      setSearchTerm(suggestionName)
    }
    setShowSuggestions(false)
    setFocusedIndex(-1)
  }

  // Modal 處理函數
  const handleCardClick = (mobId: number, mobName: string) => {
    setSelectedMonsterId(mobId)
    setSelectedMonsterName(mobName)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedMonsterId(null)
    setSelectedMonsterName('')
    // 清除 URL 參數
    router.replace('/', { scroll: false })
  }

  // 物品點擊處理 - 開啟 ItemModal
  const handleItemClick = (itemId: number, itemName: string) => {
    setSelectedItemId(itemId)
    setSelectedItemName(itemName)
    setIsItemModalOpen(true)
  }

  const handleCloseItemModal = () => {
    setIsItemModalOpen(false)
    setSelectedItemId(null)
    setSelectedItemName('')
    // 清除 URL 參數
    router.replace('/', { scroll: false })
  }

  // 清除最愛確認處理
  const handleClearConfirm = () => {
    if (clearModalType === 'monsters') {
      clearAllMonsters()
    } else {
      clearAllItems()
    }
  }

  // 鍵盤導航處理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
          selectSuggestion(suggestions[focusedIndex].name, suggestions[focusedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        setFocusedIndex(-1)
        break
    }
  }

  // 點擊外部關閉建議列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 pb-12">
        {/* Sticky Header - 固定搜尋區域 */}
        <div className="sticky top-0 z-40 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 backdrop-blur-sm pt-12 pb-6 shadow-md">
          {/* 標題區域 */}
          <div className="text-center mb-8 pt-2">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              ChronoStory
            </h1>
          </div>

          {/* 搜尋列 */}
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            onFocus={() => setShowSuggestions(true)}
            onSelectSuggestion={selectSuggestion}
            onKeyDown={handleKeyDown}
            focusedIndex={focusedIndex}
            onFocusedIndexChange={setFocusedIndex}
            searchContainerRef={searchContainerRef}
          />

          {/* 篩選按鈕 */}
          <FilterButtons
            filterMode={filterMode}
            onFilterChange={setFilterMode}
            favoriteMonsterCount={favoriteCount}
            favoriteItemCount={favoriteItemCount}
            onClearClick={(type) => {
              setClearModalType(type)
              setIsClearModalOpen(true)
            }}
          />

          {/* 資料統計 */}
          <StatsDisplay
            message={message}
            filterMode={filterMode}
            searchTerm={searchTerm}
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
            <p className="mt-4 text-gray-600 dark:text-gray-400">載入中...</p>
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
                      dropCount={monster.dropCount}
                      onCardClick={handleCardClick}
                      isFavorite={true}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 mt-8">
                  <div className="text-6xl mb-4">{searchTerm ? '🔍' : '💝'}</div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                    {searchTerm ? '找不到符合的最愛怪物' : '還沒有收藏任何怪物'}
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">
                    {searchTerm
                      ? '試試搜尋其他關鍵字'
                      : '點擊卡片上的愛心按鈕來收藏怪物吧！'}
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
                      monsterCount={item.monsterCount}
                      onCardClick={handleItemClick}
                      isFavorite={true}
                      onToggleFavorite={toggleItemFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 mt-8">
                  <div className="text-6xl mb-4">{searchTerm ? '🔍' : '💝'}</div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                    {searchTerm ? '找不到符合的最愛物品' : '還沒有收藏任何物品'}
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">
                    {searchTerm
                      ? '試試搜尋其他關鍵字'
                      : '點擊物品卡片上的愛心按鈕來收藏物品吧！'}
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
                      onCardClick={handleCardClick}
                      isFavorite={isFavorite(drop.mobId)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 mt-8">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                    {searchTerm ? '找不到符合的結果' : '目前沒有掉落資料'}
                  </p>
                  {searchTerm && (
                    <p className="text-gray-500 dark:text-gray-500 text-sm">
                      試試搜尋其他關鍵字，例如：Snail、Meso、Potion
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
              資料來源: ChronoStory 楓之谷私服掉落表
            </a>
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
            掉落機率已轉換為百分比顯示 | 即時搜尋
          </p>
        </div>
      </div>

      {/* Monster Drops Modal */}
      <MonsterModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        monsterId={selectedMonsterId}
        monsterName={selectedMonsterName}
        allDrops={allDrops}
        isFavorite={selectedMonsterId ? isFavorite(selectedMonsterId) : false}
        onToggleFavorite={toggleFavorite}
        isItemFavorite={isItemFavorite}
        onToggleItemFavorite={toggleItemFavorite}
        onItemClick={handleItemClick}
      />

      {/* Item Drops Modal */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={handleCloseItemModal}
        itemId={selectedItemId}
        itemName={selectedItemName}
        allDrops={allDrops}
        isFavorite={selectedItemId !== null ? isItemFavorite(selectedItemId) : false}
        onToggleFavorite={toggleItemFavorite}
        isMonsterFavorite={isFavorite}
        onToggleMonsterFavorite={toggleFavorite}
        onMonsterClick={handleCardClick}
      />

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={isBugReportModalOpen}
        onClose={() => setIsBugReportModalOpen(false)}
      />

      {/* Confirm Clear Modal */}
      <ClearConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearConfirm}
        type={clearModalType}
        count={clearModalType === 'monsters' ? favoriteCount : favoriteItemCount}
      />

      {/* Gacha Machine Modal */}
      <GachaMachineModal
        isOpen={isGachaModalOpen}
        onClose={() => setIsGachaModalOpen(false)}
      />

      {/* 浮動轉蛋機按鈕 */}
      <button
        onClick={() => setIsGachaModalOpen(true)}
        className="fixed bottom-6 left-6 z-40 p-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label="轉蛋機圖鑑"
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
          <span className="text-sm font-medium hidden group-hover:inline-block">轉蛋機圖鑑</span>
        </div>
      </button>

      {/* 浮動 Bug 回報按鈕 */}
      <button
        onClick={() => setIsBugReportModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label="回報問題"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐛</span>
          <span className="text-sm font-medium hidden group-hover:inline-block">回報問題</span>
        </div>
      </button>
    </div>
  )
}
