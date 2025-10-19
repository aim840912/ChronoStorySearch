import { useState, useEffect } from 'react'
import { clientLogger } from '@/lib/logger'
import type { DropItem } from '@/types'

interface UseDropDataReturn {
  drops: DropItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * 自定義 Hook - 獲取掉落資料
 * 使用動態 import 從本地 JSON 載入資料（不產生 API 請求）
 *
 * 優化說明：
 * - 使用動態 import 避免增加初始 bundle 大小
 * - 完全消除 Edge Requests（不呼叫 /api/maplestory）
 * - 資料會被 webpack 自動 code split 並快取
 */
export function useDropData(): UseDropDataReturn {
  const [drops, setDrops] = useState<DropItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDrops = async () => {
    try {
      setIsLoading(true)
      setError(null)

      clientLogger.info('開始載入掉落資料（靜態 import）...')

      // 動態載入 JSON 資料（不會在初始 bundle 中，並且會被快取）
      const dropsModule = await import('@/../data/drops.json')
      const dropsData = dropsModule.default as DropItem[]

      setDrops(dropsData)
      clientLogger.info(`成功載入 ${dropsData.length} 筆掉落資料（靜態資料）`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知錯誤'
      setError(errorMessage)
      clientLogger.error('載入掉落資料失敗', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDrops()
  }, [])

  return {
    drops,
    isLoading,
    error,
    refetch: fetchDrops,
  }
}
