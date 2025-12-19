'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { isScrollItem } from '@/lib/image-utils'

interface DropRelations {
  lastUpdated: string
  mobToItems: Record<string, number[]>
  itemToMobs: Record<string, number[]>
}

// 卷軸資訊介面（包含 ID 和名稱）
export interface ScrollInfo {
  id: number
  name: string
}

// 模組層級快取，避免重複載入
let cachedData: DropRelations | null = null
let loadPromise: Promise<DropRelations> | null = null

// 卷軸名稱快取（從 item-index.json 載入，只包含卷軸）
let scrollNamesMap: Map<number, string> | null = null
let scrollNamesPromise: Promise<Map<number, string>> | null = null

async function loadDropRelations(): Promise<DropRelations> {
  if (cachedData) return cachedData

  if (!loadPromise) {
    loadPromise = import('@/../chronostoryData/drop-relations.json').then(
      (module) => {
        cachedData = module.default as DropRelations
        return cachedData
      }
    )
  }

  return loadPromise
}

// 載入卷軸名稱索引（只載入 ID 範圍 2040000-2049999 的物品）
async function loadScrollNames(): Promise<Map<number, string>> {
  if (scrollNamesMap) return scrollNamesMap

  if (!scrollNamesPromise) {
    scrollNamesPromise = import('@/../chronostoryData/item-index.json').then(
      (module) => {
        const data = module.default as {
          items: Array<{ itemId: number; itemName: string }>
        }
        scrollNamesMap = new Map()
        data.items.forEach((item) => {
          if (isScrollItem(item.itemId)) {
            scrollNamesMap!.set(item.itemId, item.itemName)
          }
        })
        return scrollNamesMap
      }
    )
  }

  return scrollNamesPromise
}

/**
 * Hook 載入和存取掉落關係資料
 *
 * 提供物品與怪物之間的掉落對應關係：
 * - getMobsForItem: 取得會掉落某物品的怪物列表
 * - getScrollsForMob: 取得某怪物會掉落的卷軸列表（包含卷軸名稱）
 */
export function useDropRelations() {
  const [data, setData] = useState<DropRelations | null>(cachedData)
  const [scrollNames, setScrollNames] = useState<Map<number, string> | null>(
    scrollNamesMap
  )
  const [isLoading, setIsLoading] = useState(!cachedData || !scrollNamesMap)

  useEffect(() => {
    // 並行載入掉落關係和卷軸名稱
    Promise.all([
      cachedData ? Promise.resolve(cachedData) : loadDropRelations(),
      scrollNamesMap ? Promise.resolve(scrollNamesMap) : loadScrollNames(),
    ]).then(([loadedData, loadedScrollNames]) => {
      setData(loadedData)
      setScrollNames(loadedScrollNames)
      setIsLoading(false)
    })
  }, [])

  // 取得會掉落某物品的怪物 ID 列表
  const getMobsForItem = useCallback(
    (itemId: number): number[] => {
      if (!data) return []
      return data.itemToMobs[String(itemId)] || []
    },
    [data]
  )

  // 取得某怪物會掉落的卷軸列表（包含 ID 和名稱）
  const getScrollsForMob = useCallback(
    (mobId: number): ScrollInfo[] => {
      if (!data) return []
      const itemIds = data.mobToItems[String(mobId)] || []
      return itemIds
        .filter(isScrollItem)
        .map((id) => ({
          id,
          name: scrollNames?.get(id) || '',
        }))
    },
    [data, scrollNames]
  )

  // 預計算常用資料
  const relations = useMemo(
    () => ({
      itemToMobs: data?.itemToMobs || {},
      mobToItems: data?.mobToItems || {},
    }),
    [data]
  )

  return {
    isLoading,
    relations,
    getMobsForItem,
    getScrollsForMob,
  }
}
