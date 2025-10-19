'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { DropItem, GachaMachine } from '@/types'
import { clientLogger } from '@/lib/logger'
import dropsData from '@/../data/drops.json'

/**
 * 正規化 Enhanced JSON 格式的轉蛋機資料
 * 將 Enhanced JSON 的欄位映射到 GachaMachine 型別
 */
function normalizeGachaMachine(rawData: any): GachaMachine {
  return {
    ...rawData,
    items: rawData.items.map((item: any) => ({
      // 先展開所有原始欄位
      ...item,

      // 然後覆蓋需要特殊處理的欄位（順序很重要！）
      // 轉蛋機特有欄位
      chineseName: item.chineseName,
      probability: item.probability,
      chance: item.chance,

      // itemId: string → number（關鍵轉換，必須在 ...item 之後）
      itemId: typeof item.itemId === 'string' ? parseInt(item.itemId, 10) : item.itemId,

      // 映射欄位以相容現有型別定義
      name: item.itemName || item.name,
      itemName: item.itemName,
      description: item.itemDescription || item.description || '',

      // 從 equipment.category 映射到 category（如果存在）
      category: item.equipment?.category || item.category,
      subcategory: item.subType || item.subcategory,
      overallCategory: item.type || item.overallCategory,
    })),
  }
}

/**
 * 資料管理 Hook
 * 職責：
 * - 載入核心資料（drops）
 * - 提供轉蛋機按需載入功能
 * - 提供初始隨機資料
 *
 * 優化：
 * - item-attributes 和 mob-info 改為懶加載（使用 useLazyData Hook）
 * - gacha machines 改為延遲載入（使用者搜尋時才載入）
 * - 使用 Enhanced JSON 提供完整物品資料（equipment stats、stat variation 等）
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

  // 延遲載入轉蛋機資料 - 使用者搜尋時才載入
  // 優化：使用動態 import 而非 API 呼叫，完全消除 Edge Requests
  const loadGachaMachines = useCallback(async () => {
    // 如果已經載入過，直接返回
    if (gachaMachines.length > 0) return

    try {
      clientLogger.info('開始懶加載轉蛋機資料（Enhanced JSON）...')

      // 使用動態 import 載入所有轉蛋機資料（Enhanced 版本，包含完整物品資料）
      const [m1, m2, m3, m4, m5, m6, m7] = await Promise.all([
        import('@/../data/gacha/machine-1-enhanced.json'),
        import('@/../data/gacha/machine-2-enhanced.json'),
        import('@/../data/gacha/machine-3-enhanced.json'),
        import('@/../data/gacha/machine-4-enhanced.json'),
        import('@/../data/gacha/machine-5-enhanced.json'),
        import('@/../data/gacha/machine-6-enhanced.json'),
        import('@/../data/gacha/machine-7-enhanced.json'),
      ])

      // 正規化資料格式以符合 GachaMachine 型別
      const machines: GachaMachine[] = [
        normalizeGachaMachine(m1.default),
        normalizeGachaMachine(m2.default),
        normalizeGachaMachine(m3.default),
        normalizeGachaMachine(m4.default),
        normalizeGachaMachine(m5.default),
        normalizeGachaMachine(m6.default),
        normalizeGachaMachine(m7.default),
      ]

      setGachaMachines(machines)
      clientLogger.info(`成功載入 ${machines.length} 台轉蛋機（Enhanced 資料）`)
    } catch (error) {
      clientLogger.error('載入轉蛋機資料失敗', error)
    }
  }, [gachaMachines.length])

  // 隨機選擇 10 筆資料（初始顯示用）- Fisher-Yates shuffle
  const initialRandomDrops = useMemo(() => {
    if (allDrops.length === 0) return []

    // 複製陣列避免修改原始資料
    const shuffled = [...allDrops]

    // Fisher-Yates shuffle 演算法（只 shuffle 前 10 個）
    const sampleSize = Math.min(10, allDrops.length)
    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = i + Math.floor(Math.random() * (shuffled.length - i))
      ;[shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]]
    }

    return shuffled.slice(0, sampleSize)
  }, [allDrops])


  return {
    // 資料
    allDrops,
    gachaMachines,
    isLoading,

    // 初始隨機資料
    initialRandomDrops,

    // 按需載入函數
    loadGachaMachines,
  }
}
