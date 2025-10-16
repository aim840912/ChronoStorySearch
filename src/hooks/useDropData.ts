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
 * 從 API 獲取 MapleStory 掉落資料
 */
export function useDropData(): UseDropDataReturn {
  const [drops, setDrops] = useState<DropItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDrops = async () => {
    try {
      setIsLoading(true)
      setError(null)

      clientLogger.info('開始獲取掉落資料...')

      const response = await fetch('/api/maplestory')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '獲取資料失敗')
      }

      setDrops(result.data)
      clientLogger.info(`成功獲取 ${result.data.length} 筆掉落資料`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知錯誤'
      setError(errorMessage)
      clientLogger.error('獲取掉落資料失敗', err)
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
