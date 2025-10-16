import { useState, useEffect } from 'react'
import { getFavoriteItems, setFavoriteItems } from '@/lib/storage'
import type { FavoriteItem } from '@/types'

/**
 * 自定義 Hook - 管理最愛物品
 * 使用 localStorage 持久化儲存
 */
export function useFavoriteItems() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])

  // 從 localStorage 載入最愛
  useEffect(() => {
    const stored = getFavoriteItems()
    setFavorites(stored)
  }, [])

  // 儲存到 localStorage
  const saveFavorites = (newFavorites: FavoriteItem[]) => {
    const success = setFavoriteItems(newFavorites)
    if (success) {
      setFavorites(newFavorites)
    }
  }

  // 切換最愛狀態
  const toggleFavorite = (itemId: number, itemName: string) => {
    const existingIndex = favorites.findIndex((fav) => fav.itemId === itemId)

    if (existingIndex >= 0) {
      // 移除最愛
      const newFavorites = favorites.filter((fav) => fav.itemId !== itemId)
      saveFavorites(newFavorites)
    } else {
      // 添加最愛
      const newFavorite: FavoriteItem = {
        itemId,
        itemName,
        addedAt: Date.now(),
      }
      saveFavorites([...favorites, newFavorite])
    }
  }

  // 檢查是否已收藏
  const isFavorite = (itemId: number): boolean => {
    return favorites.some((fav) => fav.itemId === itemId)
  }

  // 清空所有最愛
  const clearAll = () => {
    saveFavorites([])
  }

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    favoriteCount: favorites.length,
    clearAll,
  }
}
