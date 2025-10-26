/**
 * 物品資料管理 Hook
 *
 * 功能：
 * - 從 drops 和 gacha 資料中提取唯一物品列表
 * - 提供物品搜尋功能
 * - 提供物品查詢功能
 *
 * 整合現有的 useDataManagement hook，避免重複載入資料
 */

'use client'

import { useMemo } from 'react'
import type { ExtendedUniqueItem, DropsEssential, GachaMachine } from '@/types'
import { extractUniqueItems, searchItems, getItemById } from '@/lib/items'

interface UseItemsDataProps {
  allDrops: DropsEssential[]
  gachaMachines: GachaMachine[]
}

interface UseItemsDataReturn {
  /**
   * 所有唯一物品列表
   */
  allItems: ExtendedUniqueItem[]

  /**
   * 搜尋物品（支援中英文）
   */
  searchItems: (query: string, limit?: number) => ExtendedUniqueItem[]

  /**
   * 根據 ID 查詢物品
   */
  getItemById: (itemId: number) => ExtendedUniqueItem | undefined

  /**
   * 物品總數
   */
  totalCount: number
}

/**
 * 物品資料管理 Hook
 *
 * @example
 * ```tsx
 * const { allItems, searchItems, getItemById } = useItemsData({
 *   allDrops,
 *   gachaMachines
 * })
 *
 * // 搜尋物品
 * const results = searchItems('弓')
 *
 * // 查詢物品
 * const item = getItemById(1234)
 * ```
 */
export function useItemsData({
  allDrops,
  gachaMachines
}: UseItemsDataProps): UseItemsDataReturn {
  // 從 drops 和 gacha 資料中提取唯一物品列表（僅在資料變化時重新計算）
  const allItems = useMemo(() => {
    return extractUniqueItems(allDrops, gachaMachines)
  }, [allDrops, gachaMachines])

  // 包裝搜尋函數（綁定 allItems）
  const search = useMemo(() => {
    return (query: string, limit?: number) => {
      return searchItems(allItems, query, limit)
    }
  }, [allItems])

  // 包裝查詢函數（綁定 allItems）
  const getItem = useMemo(() => {
    return (itemId: number) => {
      return getItemById(allItems, itemId)
    }
  }, [allItems])

  return {
    allItems,
    searchItems: search,
    getItemById: getItem,
    totalCount: allItems.length
  }
}
