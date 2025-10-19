'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { DropItem, GachaMachine } from '@/types'
import { clientLogger } from '@/lib/logger'
import dropsData from '@/../data/drops.json'

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
      clientLogger.info('開始懶加載轉蛋機資料（靜態 import）...')

      // 使用動態 import 載入所有轉蛋機資料（不產生 API 請求）
      const [m1, m2, m3, m4, m5, m6, m7] = await Promise.all([
        import('@/../data/gacha/machine-1.json'),
        import('@/../data/gacha/machine-2.json'),
        import('@/../data/gacha/machine-3.json'),
        import('@/../data/gacha/machine-4.json'),
        import('@/../data/gacha/machine-5.json'),
        import('@/../data/gacha/machine-6.json'),
        import('@/../data/gacha/machine-7.json'),
      ])

      const machines: GachaMachine[] = [
        m1.default as unknown as GachaMachine,
        m2.default as unknown as GachaMachine,
        m3.default as unknown as GachaMachine,
        m4.default as unknown as GachaMachine,
        m5.default as unknown as GachaMachine,
        m6.default as unknown as GachaMachine,
        m7.default as unknown as GachaMachine,
      ]

      setGachaMachines(machines)
      clientLogger.info(`成功載入 ${machines.length} 台轉蛋機（靜態資料）`)
    } catch (error) {
      clientLogger.error('載入轉蛋機資料失敗', error)
    }
  }, [gachaMachines.length])

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
