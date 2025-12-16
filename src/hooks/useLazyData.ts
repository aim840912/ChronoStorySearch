'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type {
  ItemAttributesEssential,
  MobInfo,
  DropItem,
  ItemsOrganizedData,
  DropsByItemData,
} from '@/types'
import { clientLogger } from '@/lib/logger'
import essentialData from '@/../chronostoryData/item-attributes-essential.json'

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

  // 追蹤目前正在處理的 itemId
  // 用於偵測「首次渲染時 useEffect 還未執行」的情況
  const [activeItemId, setActiveItemId] = useState<number | null>(null)

  // 追蹤當前請求以處理競態條件
  const currentRequestRef = useRef<number | null>(null)

  useEffect(() => {
    if (!itemId) {
      setData(null)
      setError(null)
      setIsLoading(false)
      setActiveItemId(null)
      currentRequestRef.current = null
      return
    }

    // ID 變化時重置狀態，避免顯示舊資料
    // 重要：setIsLoading 必須在這裡同步設置，而非在 async 函數內
    // 否則會有短暫的 data=null + isLoading=false 狀態，造成 UI 誤判
    setData(null)
    setError(null)
    setIsLoading(true)
    setActiveItemId(itemId)
    currentRequestRef.current = itemId

    const loadData = async () => {
      try {
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

        // 檢查請求是否仍為最新（競態條件防護）
        if (currentRequestRef.current !== itemId) {
          clientLogger.info(`物品 ${itemId} 的請求已過時，忽略結果`)
          return
        }

        setData(rawData)
        clientLogger.info(`成功載入物品 ${itemId} 的資料`)
      } catch (err) {
        // 檢查請求是否仍為最新
        if (currentRequestRef.current !== itemId) {
          return
        }
        const error = err instanceof Error ? err : new Error(`載入物品 ${itemId} 詳細資料失敗`)
        setError(error)
        clientLogger.debug(`物品 ${itemId} 無 detailed 檔案，將嘗試從其他來源載入`, err)
      } finally {
        // 只有當請求仍為最新時才更新 loading 狀態
        if (currentRequestRef.current === itemId) {
          setIsLoading(false)
        }
      }
    }

    loadData()
  }, [itemId])

  // 關鍵修復：推導正確的載入狀態
  // 返回 true 如果：
  // 1. 有 itemId 需要載入
  // 2. 且：isLoading 為 true（正在載入）
  //    或：activeItemId !== itemId（useEffect 還未執行）
  const effectiveIsLoading = itemId !== null && (
    isLoading || activeItemId !== itemId
  )

  return { data, isLoading: effectiveIsLoading, error }
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

  // 追蹤當前請求以處理競態條件
  const currentRequestRef = useRef<number | null>(null)

  useEffect(() => {
    if (!mobId) {
      setData(null)
      setError(null)
      setIsLoading(false)
      currentRequestRef.current = null
      return
    }

    // ID 變化時重置狀態，避免顯示舊資料
    // 重要：setIsLoading 必須在這裡同步設置，而非在 async 函數內
    setData(null)
    setError(null)
    setIsLoading(true)
    currentRequestRef.current = mobId

    const loadData = async () => {
      try {
        clientLogger.info(`開始載入怪物 ${mobId} 的 Detailed 掉落資料...`)

        // 動態 import 單一怪物的掉落資料 JSON（從 chronostoryData/drops-by-monster/）
        const dataModule = await import(
          `@/../chronostoryData/drops-by-monster/${mobId}.json`
        )
        const rawData = dataModule.default

        // 檢查請求是否仍為最新（競態條件防護）
        if (currentRequestRef.current !== mobId) {
          clientLogger.info(`怪物 ${mobId} 的請求已過時，忽略結果`)
          return
        }

        // drops-by-monster 格式是包裝物件，掉落資料在 .drops 陣列中
        const drops = rawData.drops as DropItem[]
        setData(drops)
        clientLogger.info(`成功載入怪物 ${mobId} 的掉落資料（${drops.length} 個物品）`)
      } catch (err) {
        // 檢查請求是否仍為最新
        if (currentRequestRef.current !== mobId) {
          return
        }
        const error = err instanceof Error ? err : new Error(`載入怪物 ${mobId} 掉落資料失敗`)
        setError(error)
        clientLogger.error(`載入怪物 ${mobId} 掉落資料失敗`, err)
      } finally {
        // 只有當請求仍為最新時才更新 loading 狀態
        if (currentRequestRef.current === mobId) {
          setIsLoading(false)
        }
      }
    }

    loadData()
  }, [mobId])

  return { data, isLoading, error }
}

/**
 * 懶加載單一物品的掉落怪物資料 Hook
 *
 * 使用情境：
 * - 開啟 ItemModal 時
 * - 需要顯示哪些怪物會掉落該物品（包含機率、數量）
 *
 * 優化效果：
 * - 每個物品的掉落資料平均 ~2-5 KB
 * - 只在需要時載入，避免載入全部掉落資料
 *
 * 資料來源：chronostoryData/drops-by-item/{itemId}.json
 *
 * @param itemId - 要載入的物品 ID（null 表示不載入）
 */
export function useLazyDropsByItem(itemId: number | null) {
  const [data, setData] = useState<DropsByItemData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 追蹤當前請求以處理競態條件
  const currentRequestRef = useRef<number | null>(null)

  useEffect(() => {
    if (!itemId) {
      setData(null)
      setError(null)
      setIsLoading(false)
      currentRequestRef.current = null
      return
    }

    // ID 變化時重置狀態，避免顯示舊資料
    // 重要：setIsLoading 必須在這裡同步設置，而非在 async 函數內
    setData(null)
    setError(null)
    setIsLoading(true)
    currentRequestRef.current = itemId

    const loadData = async () => {
      try {
        clientLogger.info(`開始載入物品 ${itemId} 的掉落怪物資料...`)

        // 動態 import 單一物品的掉落資料 JSON
        const dataModule = await import(
          `@/../chronostoryData/drops-by-item/${itemId}.json`
        )
        const rawData = dataModule.default as DropsByItemData

        // 檢查請求是否仍為最新（競態條件防護）
        if (currentRequestRef.current !== itemId) {
          clientLogger.info(`物品 ${itemId} 的掉落資料請求已過時，忽略結果`)
          return
        }

        setData(rawData)
        clientLogger.info(
          `成功載入物品 ${itemId} 的掉落資料（${rawData.totalMonsters} 隻怪物）`
        )
      } catch (err) {
        // 檢查請求是否仍為最新
        if (currentRequestRef.current !== itemId) {
          return
        }
        const error =
          err instanceof Error
            ? err
            : new Error(`載入物品 ${itemId} 掉落資料失敗`)
        setError(error)
        // 使用 debug 而非 error，因為某些物品可能只來自轉蛋或商人，沒有怪物掉落
        clientLogger.debug(`物品 ${itemId} 無掉落資料檔案`, err)
      } finally {
        // 只有當請求仍為最新時才更新 loading 狀態
        if (currentRequestRef.current === itemId) {
          setIsLoading(false)
        }
      }
    }

    loadData()
  }, [itemId])

  return { data, isLoading, error }
}
