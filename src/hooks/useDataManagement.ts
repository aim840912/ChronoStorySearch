'use client'

import { useState, useEffect, useMemo } from 'react'
import type { DropItem, GachaMachine, ItemAttributes, MobInfo } from '@/types'
import { clientLogger } from '@/lib/logger'
import dropsData from '@/../data/drops.json'
import mobInfoData from '@/../data/mob-info.json'
import itemAttributesData from '@/../data/item-attributes.json'

/**
 * 資料管理 Hook
 * 職責：
 * - 載入所有資料（drops, gacha machines）
 * - 建立資料索引（monster HP, item attributes）
 * - 提供初始隨機資料
 */
export function useDataManagement() {
  // 資料狀態
  const [allDrops, setAllDrops] = useState<DropItem[]>([])
  const [gachaMachines, setGachaMachines] = useState<GachaMachine[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 載入掉落資料
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
            const response = await fetch(`/api/gacha/${id}`)
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

  // 建立怪物血量快速查詢 Map (mobId -> max_hp)
  const monsterHPMap = useMemo(() => {
    const hpMap = new Map<number, number | null>()
    const mobData = mobInfoData as MobInfo[]

    mobData.forEach((info) => {
      const mobId = parseInt(info.mob.mob_id, 10)
      if (!isNaN(mobId)) {
        hpMap.set(mobId, info.mob.max_hp)
      }
    })

    return hpMap
  }, [])

  // 建立物品屬性快速查詢 Map (itemId -> ItemAttributes)
  const itemAttributesMap = useMemo(() => {
    const attrMap = new Map<number, ItemAttributes>()
    const attributes = itemAttributesData as ItemAttributes[]

    attributes.forEach((attr) => {
      const itemId = parseInt(attr.item_id, 10)
      if (!isNaN(itemId)) {
        attrMap.set(itemId, attr)
      }
    })

    clientLogger.info(`成功建立 ${attrMap.size} 筆物品屬性索引`)
    return attrMap
  }, [])

  return {
    // 資料
    allDrops,
    gachaMachines,
    isLoading,

    // 索引
    initialRandomDrops,
    monsterHPMap,
    itemAttributesMap,
  }
}
