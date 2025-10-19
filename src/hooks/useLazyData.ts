'use client'

import { useState, useCallback, useMemo } from 'react'
import type { ItemAttributes, MobInfo } from '@/types'
import { clientLogger } from '@/lib/logger'

/**
 * 懶加載物品屬性資料 Hook
 *
 * 使用情境：
 * - 開啟 ItemModal 時
 * - 啟用進階篩選時
 *
 * 優化效果：減少 2.5MB 初始 Bundle 大小
 */
export function useLazyItemAttributes() {
  const [data, setData] = useState<ItemAttributes[] | null>(null)
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
      clientLogger.info('開始懶加載物品屬性資料...')

      // 動態 import JSON 資料
      const dataModule = await import('@/../data/item-attributes.json')
      const itemAttributes = dataModule.default as ItemAttributes[]

      setData(itemAttributes)
      clientLogger.info(`成功載入 ${itemAttributes.length} 筆物品屬性資料`)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('載入物品屬性失敗')
      setError(error)
      clientLogger.error('載入物品屬性失敗', err)
    } finally {
      setIsLoading(false)
    }
  }, [data, isLoading])

  // 建立物品屬性 Map (itemId -> ItemAttributes)
  const itemAttributesMap = useMemo(() => {
    if (!data) return new Map<number, ItemAttributes>()

    const attrMap = new Map<number, ItemAttributes>()
    data.forEach((attr) => {
      const itemId = parseInt(attr.item_id, 10)
      if (!isNaN(itemId)) {
        attrMap.set(itemId, attr)
      }
    })
    return attrMap
  }, [data])

  return {
    data,
    itemAttributesMap,
    isLoading,
    error,
    loadData,
  }
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
