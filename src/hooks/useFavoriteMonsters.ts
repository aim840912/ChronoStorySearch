import { useState, useEffect } from 'react'
import { getFavoriteMonsters, setFavoriteMonsters } from '@/lib/storage'
import type { FavoriteMonster } from '@/types'

/**
 * 自定義 Hook - 管理最愛怪物
 * 使用 localStorage 持久化儲存
 */
export function useFavoriteMonsters() {
  const [favorites, setFavorites] = useState<FavoriteMonster[]>([])

  // 從 localStorage 載入最愛
  useEffect(() => {
    const stored = getFavoriteMonsters()
    setFavorites(stored)
  }, [])

  // 儲存到 localStorage
  const saveFavorites = (newFavorites: FavoriteMonster[]) => {
    const success = setFavoriteMonsters(newFavorites)
    if (success) {
      setFavorites(newFavorites)
    }
  }

  // 切換最愛狀態
  const toggleFavorite = (mobId: number, mobName: string) => {
    const existingIndex = favorites.findIndex((fav) => fav.mobId === mobId)

    if (existingIndex >= 0) {
      // 移除最愛
      const newFavorites = favorites.filter((fav) => fav.mobId !== mobId)
      saveFavorites(newFavorites)
    } else {
      // 添加最愛
      const newFavorite: FavoriteMonster = {
        mobId,
        mobName,
        addedAt: Date.now(),
      }
      saveFavorites([...favorites, newFavorite])
    }
  }

  // 檢查是否已收藏
  const isFavorite = (mobId: number): boolean => {
    return favorites.some((fav) => fav.mobId === mobId)
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
