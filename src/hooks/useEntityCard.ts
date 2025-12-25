'use client'

import { useState, useEffect } from 'react'

/**
 * Generic Hook - 管理最愛實體的通用邏輯
 *
 * 職責：
 * - 提供統一的最愛管理邏輯（新增、移除、檢查、清空）
 * - 使用 dependency injection 處理不同的 storage 操作
 * - 支援任意型別的實體（透過 TypeScript 泛型）
 *
 * @template T - 實體型別（如 FavoriteMonster, FavoriteItem）
 *
 * @example
 * ```typescript
 * const favoriteMonsters = useEntityCard({
 *   getEntities: getFavoriteMonsters,
 *   setEntities: setFavoriteMonsters,
 *   createEntity: (id, name) => ({ mobId: id, mobName: name, addedAt: Date.now() }),
 *   getEntityId: (entity) => entity.mobId,
 * })
 * ```
 */

interface UseEntityCardParams<T> {
  /** 從 localStorage 讀取實體列表的函數 */
  getEntities: () => T[]
  /** 儲存實體列表到 localStorage 的函數 */
  setEntities: (entities: T[]) => boolean
  /** 建立新實體的工廠函數 */
  createEntity: (id: number, name: string) => T
  /** 從實體中提取 ID 的函數 */
  getEntityId: (entity: T) => number
  /** 偏好設定欄位名稱（用於雲端同步事件） */
  preferenceField: 'favoriteMonsters' | 'favoriteItems'
}

interface UseEntityCardReturn<T> {
  /** 最愛實體列表 */
  favorites: T[]
  /** 切換最愛狀態（如果存在則移除，不存在則新增） */
  toggleFavorite: (id: number, name: string) => void
  /** 檢查是否已收藏 */
  isFavorite: (id: number) => boolean
  /** 清空所有最愛 */
  clearAll: () => void
  /** 最愛數量 */
  favoriteCount: number
  /** 重新排序（拖曳用） */
  reorder: (fromIndex: number, toIndex: number) => void
}

export function useEntityCard<T>({
  getEntities,
  setEntities,
  createEntity,
  getEntityId,
  preferenceField,
}: UseEntityCardParams<T>): UseEntityCardReturn<T> {
  const [favorites, setFavorites] = useState<T[]>([])

  // 從 localStorage 載入最愛
  useEffect(() => {
    const stored = getEntities()
    setFavorites(stored)
  }, [getEntities])

  // 監聽雲端同步事件，重新載入最愛
  useEffect(() => {
    const handleSync = () => {
      const stored = getEntities()
      setFavorites(stored)
    }
    window.addEventListener('preferences-synced', handleSync)
    return () => window.removeEventListener('preferences-synced', handleSync)
  }, [getEntities])

  // 儲存到 localStorage 並觸發雲端同步
  const saveFavorites = (newFavorites: T[]) => {
    const success = setEntities(newFavorites)
    if (success) {
      setFavorites(newFavorites)
      // 觸發雲端同步事件
      window.dispatchEvent(new CustomEvent('preference-changed', {
        detail: { field: preferenceField, value: newFavorites }
      }))
    }
  }

  // 切換最愛狀態
  const toggleFavorite = (id: number, name: string) => {
    const existingIndex = favorites.findIndex((fav) => getEntityId(fav) === id)

    if (existingIndex >= 0) {
      // 移除最愛
      const newFavorites = favorites.filter((fav) => getEntityId(fav) !== id)
      saveFavorites(newFavorites)
    } else {
      // 添加最愛
      const newFavorite = createEntity(id, name)
      saveFavorites([...favorites, newFavorite])
    }
  }

  // 檢查是否已收藏
  const isFavorite = (id: number): boolean => {
    return favorites.some((fav) => getEntityId(fav) === id)
  }

  // 清空所有最愛
  const clearAll = () => {
    saveFavorites([])
  }

  // 重新排序（拖曳用）
  const reorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= favorites.length) return
    if (toIndex < 0 || toIndex >= favorites.length) return

    const newFavorites = [...favorites]
    const [removed] = newFavorites.splice(fromIndex, 1)
    newFavorites.splice(toIndex, 0, removed)
    saveFavorites(newFavorites)
  }

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    favoriteCount: favorites.length,
    clearAll,
    reorder,
  }
}
