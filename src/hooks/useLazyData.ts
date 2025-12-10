'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  ItemAttributesEssential,
  MobInfo,
  DropItem,
  ItemsOrganizedData,
} from '@/types'
import { clientLogger } from '@/lib/logger'
import essentialData from '@/../chronostoryData/item-attributes-essential.json'
import { DropItemsEssentialSchema } from '@/schemas/drops.schema'

// ==================== Helper Functions ====================

/**
 * 根據物品 ID 判斷所在目錄
 * - 1xxxxxx → equipment/
 * - 2xxxxxx → consumable/
 * - 其他 → etc/
 */
function getItemFolder(itemId: number): string {
  const prefix = Math.floor(itemId / 1000000)
  if (prefix === 1) return 'equipment'
  if (prefix === 2) return 'consumable'
  return 'etc'
}

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
 * 懶加載單一物品 Organized 資料 Hook
 *
 * 使用情境：
 * - 開啟 ItemModal 時
 * - 需要顯示物品完整屬性時
 *
 * 優化效果：
 * - 每個物品的資料僅 ~1.53 KB
 * - 只在需要時載入，大幅減少流量（94.5% 節省）
 *
 * 資料來源：chronostoryData/items-organized/
 * - equipment/ → 物品 ID 1xxxxxx
 * - consumable/ → 物品 ID 2xxxxxx
 * - etc/ → 其他物品 ID
 *
 * @param itemId - 要載入的物品 ID（null 表示不載入）
 * @returns 直接返回 ItemsOrganizedData 原始格式
 */
export function useLazyItemDetailed(itemId: number | null) {
  const [data, setData] = useState<ItemsOrganizedData | null>(null)
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
        const folder = getItemFolder(itemId)
        clientLogger.info(`開始載入物品 ${itemId} 的資料（from ${folder}/）...`)

        // 動態 import 單一物品的 JSON（從 chronostoryData/items-organized/）
        // 注意：Webpack 需要靜態路徑前綴，所以分開處理每個資料夾
        let dataModule
        if (folder === 'equipment') {
          dataModule = await import(
            `@/../chronostoryData/items-organized/equipment/${itemId}.json`
          )
        } else if (folder === 'consumable') {
          dataModule = await import(
            `@/../chronostoryData/items-organized/consumable/${itemId}.json`
          )
        } else {
          dataModule = await import(
            `@/../chronostoryData/items-organized/etc/${itemId}.json`
          )
        }
        const rawData = dataModule.default as ItemsOrganizedData

        // 直接返回原始 ItemsOrganizedData 格式
        setData(rawData)
        clientLogger.info(`成功載入物品 ${itemId} 的資料`)
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
      const dataModule = await import('@/../chronostoryData/mob-info.json')
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

  // 建立怪物血量 Map (mobId -> maxHP)
  const monsterHPMap = useMemo(() => {
    if (!data) return new Map<number, number | null>()

    const hpMap = new Map<number, number | null>()
    data.forEach((info) => {
      const mobId = parseInt(info.mob.id, 10)
      if (!isNaN(mobId)) {
        hpMap.set(mobId, info.mob.maxHP)
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
        const rawData = dataModule.default

        // 使用 Zod 驗證資料格式
        const parseResult = DropItemsEssentialSchema.safeParse(rawData)

        if (!parseResult.success) {
          clientLogger.warn(`怪物 ${mobId} 掉落資料驗證失敗`, parseResult.error)
          // 仍然使用原始資料，但記錄警告
          setData(rawData as DropItem[])
        } else {
          setData(parseResult.data as DropItem[])
          clientLogger.info(`成功載入並驗證怪物 ${mobId} 的 Detailed 掉落資料（${parseResult.data.length} 個物品）`)
        }
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
