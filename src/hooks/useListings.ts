/**
 * 刊登管理 Hooks
 * 處理刊登的建立、更新、刪除等操作
 */

import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { clientLogger } from '@/lib/logger'

// ==================== 型別定義 ====================

export interface CreateListingData {
  trade_type: 'sell' | 'buy' | 'exchange'
  item_id: number
  item_name?: string
  price?: number
  quantity?: number
  ingame_name?: string | null
  item_stats?: Record<string, number> | null
  wanted_items?: Array<{
    item_id: number
    quantity: number
  }>
  webhook_url?: string | null
}

export interface UpdateListingData {
  price?: number
  ingame_name?: string | null
  item_stats?: Record<string, number> | null
  webhook_url?: string | null
  status?: 'active' | 'sold' | 'cancelled'
}

export interface Listing {
  id: string
  user_id: string
  trade_type: 'sell' | 'buy' | 'exchange'
  item_id: number
  item_name?: string
  price: number | null
  quantity: number
  ingame_name: string | null
  item_stats: Record<string, number> | null
  webhook_url: string | null
  status: 'active' | 'sold' | 'cancelled'
  created_at: string
  updated_at: string
}

// ==================== Hook: 建立刊登 ====================

export function useCreateListing() {
  const [isLoading, setIsLoading] = useState(false)

  const createListing = useCallback(async (data: CreateListingData): Promise<Listing> => {
    setIsLoading(true)

    try {
      clientLogger.info('開始建立刊登', {
        tradeType: data.trade_type,
        itemId: data.item_id
      })

      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || '建立刊登失敗')
      }

      toast.success('刊登已成功建立')
      clientLogger.info('刊登建立成功', {
        listingId: result.data.id
      })

      return result.data
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : '建立刊登時發生錯誤'

      toast.error(message)
      clientLogger.error('建立刊登失敗', { error })

      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { createListing, isLoading }
}

// ==================== Hook: 更新刊登 ====================

export function useUpdateListing() {
  const [isLoading, setIsLoading] = useState(false)

  const updateListing = useCallback(
    async (listingId: string, data: UpdateListingData): Promise<Listing> => {
      setIsLoading(true)

      try {
        clientLogger.info('開始更新刊登', { listingId })

        const response = await fetch(`/api/listings/${listingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error?.message || '更新刊登失敗')
        }

        toast.success('刊登已成功更新')
        clientLogger.info('刊登更新成功', { listingId })

        return result.data
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : '更新刊登時發生錯誤'

        toast.error(message)
        clientLogger.error('更新刊登失敗', { error, listingId })

        throw error
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return { updateListing, isLoading }
}

// ==================== Hook: 刪除刊登 ====================

export function useDeleteListing() {
  const [isLoading, setIsLoading] = useState(false)

  const deleteListing = useCallback(async (listingId: string): Promise<void> => {
    setIsLoading(true)

    try {
      clientLogger.info('開始刪除刊登', { listingId })

      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || '刪除刊登失敗')
      }

      toast.success('刊登已成功刪除')
      clientLogger.info('刊登刪除成功', { listingId })
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : '刪除刊登時發生錯誤'

      toast.error(message)
      clientLogger.error('刪除刊登失敗', { error, listingId })

      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { deleteListing, isLoading }
}

// ==================== Hook: 查詢刊登詳情 ====================

export function useListingDetail(listingId: string | null) {
  const [listing, setListing] = useState<Listing | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchListing = useCallback(async () => {
    if (!listingId) {
      setListing(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      clientLogger.info('查詢刊登詳情', { listingId })

      const response = await fetch(`/api/listings/${listingId}`, {
        credentials: 'include'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || '查詢刊登失敗')
      }

      setListing(result.data)
      clientLogger.info('刊登詳情查詢成功', { listingId })
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : '查詢刊登時發生錯誤'

      setError(message)
      clientLogger.error('查詢刊登詳情失敗', { error: err, listingId })
    } finally {
      setIsLoading(false)
    }
  }, [listingId])

  return {
    listing,
    isLoading,
    error,
    refetch: fetchListing
  }
}
