import { useState, useEffect } from 'react'
import type { QuotaStatus } from '@/lib/quota/types'

interface UseQuotaStatusReturn {
  /** 額度資訊 */
  quotas: QuotaStatus | null
  /** 是否正在載入 */
  isLoading: boolean
  /** 錯誤訊息 */
  error: string | null
  /** 手動刷新函數 */
  refetch: () => Promise<void>
}

/**
 * 查詢免費額度使用狀況的 Hook
 *
 * 自動每 5 分鐘刷新一次資料
 *
 * @returns 額度資訊、載入狀態和刷新函數
 */
export function useQuotaStatus(): UseQuotaStatusReturn {
  const [quotas, setQuotas] = useState<QuotaStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuotas = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/quota-status')
      const data = await response.json()

      if (data.success) {
        setQuotas(data.data)
        setError(null)
      } else {
        setError(data.message || '查詢失敗')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知錯誤')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotas()

    // 每 5 分鐘自動刷新
    const interval = setInterval(fetchQuotas, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return {
    quotas,
    isLoading,
    error,
    refetch: fetchQuotas,
  }
}
