/**
 * 意向管理 Hooks
 * 處理購買意向的表達、查詢等操作
 */

import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { clientLogger } from '@/lib/logger'

// ==================== 型別定義 ====================

export interface CreateInterestData {
  listing_id: string
  message?: string
}

export interface Interest {
  id: string
  listing_id: string
  buyer_id: string
  message: string | null
  created_at: string
  status: 'pending' | 'accepted' | 'rejected'
}

// ==================== Hook: 表達意向 ====================

export function useCreateInterest() {
  const [isLoading, setIsLoading] = useState(false)

  const createInterest = useCallback(
    async (data: CreateInterestData): Promise<Interest> => {
      setIsLoading(true)

      try {
        clientLogger.info('表達購買意向', {
          listingId: data.listing_id
        })

        const response = await fetch('/api/interests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error?.message || '表達意向失敗')
        }

        toast.success('已成功表達購買意向')
        clientLogger.info('購買意向已表達', {
          interestId: result.data.id
        })

        return result.data
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : '表達意向時發生錯誤'

        toast.error(message)
        clientLogger.error('表達購買意向失敗', { error })

        throw error
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return { createInterest, isLoading }
}

// ==================== Hook: 查詢我的意向 ====================

export function useMyInterests() {
  const [interests, setInterests] = useState<Interest[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInterests = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      clientLogger.info('查詢我的意向')

      const response = await fetch('/api/interests', {
        credentials: 'include'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || '查詢意向失敗')
      }

      setInterests(result.data)
      clientLogger.info('我的意向查詢成功', {
        count: result.data.length
      })
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : '查詢意向時發生錯誤'

      setError(message)
      clientLogger.error('查詢我的意向失敗', { error: err })
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    interests,
    isLoading,
    error,
    refetch: fetchInterests
  }
}
