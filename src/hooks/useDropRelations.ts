'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { isScrollItem } from '@/lib/image-utils'

interface DropRelations {
  lastUpdated: string
  mobToItems: Record<string, number[]>
  itemToMobs: Record<string, number[]>
}

// 模組層級快取，避免重複載入
let cachedData: DropRelations | null = null
let loadPromise: Promise<DropRelations> | null = null

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

/**
 * Hook 載入和存取掉落關係資料
 *
 * 提供物品與怪物之間的掉落對應關係：
 * - getMobsForItem: 取得會掉落某物品的怪物列表
 * - getScrollsForMob: 取得某怪物會掉落的卷軸列表
 */
export function useDropRelations() {
  const [data, setData] = useState<DropRelations | null>(cachedData)
  const [isLoading, setIsLoading] = useState(!cachedData)

  useEffect(() => {
    if (cachedData) {
      setData(cachedData)
      setIsLoading(false)
      return
    }

    loadDropRelations().then((loaded) => {
      setData(loaded)
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

  // 取得某怪物會掉落的卷軸 ID 列表
  const getScrollsForMob = useCallback(
    (mobId: number): number[] => {
      if (!data) return []
      const itemIds = data.mobToItems[String(mobId)] || []
      return itemIds.filter(isScrollItem)
    },
    [data]
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
