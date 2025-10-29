'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ItemAttributesEssential, ItemAttributesDetailed, MobInfo, DropItem, MobMapsData } from '@/types'
import { clientLogger } from '@/lib/logger'
import essentialData from '@/../data/item-attributes-essential.json'

/**
 * 預載入 Essential 物品資料 Hook
 *
 * 使用情境：
 * - 頁面初始化時自動載入
 * - 物品列表顯示和篩選
 *
 * 優化效果：
 * - Essential 資料僅 275 KB（vs. 原始 2.5 MB）
 * - 包含列表顯示所需的基本資訊和需求屬性
 */
export function useItemAttributesEssential() {
  const essentialMap = useMemo(() => {
    const map = new Map<number, ItemAttributesEssential>()
    essentialData.forEach((item) => {
      const itemId = parseInt(item.item_id, 10)
      if (!isNaN(itemId)) {
        map.set(itemId, item as ItemAttributesEssential)
      }
    })
    clientLogger.info(`載入 ${essentialData.length} 筆 Essential 物品資料`)
    return map
  }, [])

  return { essentialMap, isLoading: false }
}

/**
 * 懶加載單一物品 Detailed 資料 Hook
 *
 * 使用情境：
 * - 開啟 ItemModal 時
 * - 需要顯示物品完整屬性時
 *
 * 優化效果：
 * - 每個物品的 Detailed 資料僅 ~1.53 KB
 * - 只在需要時載入，大幅減少流量（94.5% 節省）
 *
 * @param itemId - 要載入的物品 ID（null 表示不載入）
 */
export function useLazyItemDetailed(itemId: number | null) {
  const [data, setData] = useState<ItemAttributesDetailed | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!itemId) {
      setData(null)
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        clientLogger.info(`開始載入物品 ${itemId} 的 Detailed 資料...`)

        // 動態 import 單一物品的 Detailed JSON
        const dataModule = await import(`@/../data/item-attributes-detailed/${itemId}.json`)
        const detailedData = dataModule.default as ItemAttributesDetailed

        setData(detailedData)
        clientLogger.info(`成功載入物品 ${itemId} 的 Detailed 資料`)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(`載入物品 ${itemId} 詳細資料失敗`)
        setError(error)
        clientLogger.debug(`物品 ${itemId} 無 detailed 檔案，將嘗試從其他來源載入`, err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [itemId])

  return { data, isLoading, error }
}

/**
 * 懶加載怪物資訊資料 Hook
 *
 * 使用情境：
 * - 開啟 MonsterModal 時
 *
 * 優化效果：減少 134KB 初始 Bundle 大小
 */
export function useLazyMobInfo() {
  const [data, setData] = useState<MobInfo[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    // 如果已經載入過，直接返回
    if (data !== null) return

    // 如果正在載入中，不重複載入
    if (isLoading) return

    try {
      setIsLoading(true)
      setError(null)
      clientLogger.info('開始懶加載怪物資訊資料...')

      // 動態 import JSON 資料
      const dataModule = await import('@/../data/mob-info.json')
      const mobInfo = dataModule.default as MobInfo[]

      setData(mobInfo)
      clientLogger.info(`成功載入 ${mobInfo.length} 筆怪物資訊資料`)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('載入怪物資訊失敗')
      setError(error)
      clientLogger.error('載入怪物資訊失敗', err)
    } finally {
      setIsLoading(false)
    }
  }, [data, isLoading])

  // 建立怪物血量 Map (mobId -> max_hp)
  const monsterHPMap = useMemo(() => {
    if (!data) return new Map<number, number | null>()

    const hpMap = new Map<number, number | null>()
    data.forEach((info) => {
      const mobId = parseInt(info.mob.mob_id, 10)
      if (!isNaN(mobId)) {
        hpMap.set(mobId, info.mob.max_hp)
      }
    })
    return hpMap
  }, [data])

  return {
    data,
    monsterHPMap,
    isLoading,
    error,
    loadData,
  }
}

/**
 * 懶加載單一怪物的 Detailed 掉落資料 Hook
 *
 * 使用情境：
 * - 開啟 MonsterModal 時
 * - 需要顯示該怪物的完整掉落資訊（包含機率、數量）
 *
 * 優化效果：
 * - 每個怪物的 Detailed 資料僅 ~6.81 KB
 * - 只在需要時載入，大幅減少流量（~85-90% 節省）
 *
 * @param mobId - 要載入的怪物 ID（null 表示不載入）
 */
export function useLazyDropsDetailed(mobId: number | null) {
  const [data, setData] = useState<DropItem[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!mobId) {
      setData(null)
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        clientLogger.info(`開始載入怪物 ${mobId} 的 Detailed 掉落資料...`)

        // 動態 import 單一怪物的 Detailed JSON
        const dataModule = await import(`@/../data/drops-detailed/${mobId}.json`)
        const dropsData = dataModule.default as DropItem[]

        setData(dropsData)
        clientLogger.info(`成功載入怪物 ${mobId} 的 Detailed 掉落資料（${dropsData.length} 個物品）`)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(`載入怪物 ${mobId} 掉落資料失敗`)
        setError(error)
        clientLogger.error(`載入怪物 ${mobId} 掉落資料失敗`, err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [mobId])

  return { data, isLoading, error }
}

/**
 * 懶加載地圖怪物映射資料 Hook
 *
 * 使用情境：
 * - 開啟 MonsterModal 時
 * - 需要顯示地圖中的其他怪物資訊
 *
 * 優化效果：減少初始 Bundle 大小
 */
export function useLazyMobMaps() {
  const [data, setData] = useState<MobMapsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    // 如果已經載入過，直接返回
    if (data !== null) return

    // 如果正在載入中，不重複載入
    if (isLoading) return

    try {
      setIsLoading(true)
      setError(null)
      clientLogger.info('開始懶加載地圖怪物映射資料...')

      // 動態 import JSON 資料
      const dataModule = await import('@/../data/mob-maps.json')
      const mobMaps = dataModule.default as MobMapsData

      setData(mobMaps)
      clientLogger.info(`成功載入 ${mobMaps.maps.length} 個地圖的怪物映射資料`)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('載入地圖怪物映射資料失敗')
      setError(error)
      clientLogger.error('載入地圖怪物映射資料失敗', err)
    } finally {
      setIsLoading(false)
    }
  }, [data, isLoading])

  // 建立 Map ID → 地圖資料的快速查找 Map
  const mapIdToDataMap = useMemo(() => {
    if (!data) return new Map()

    const mapData = new Map<string, typeof data.maps[0]>()
    data.maps.forEach((map) => {
      mapData.set(map.map_id, map)
    })
    return mapData
  }, [data])

  return {
    data,
    mapIdToDataMap,
    isLoading,
    error,
    loadData,
  }
}
