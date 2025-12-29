'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  getFavoriteMonsters,
  setFavoriteMonsters,
  getGuestFavoriteMonsters,
  setGuestFavoriteMonsters,
  getFavoriteItems,
  setFavoriteItems,
  getGuestFavoriteItems,
  setGuestFavoriteItems,
} from '@/lib/storage'
import type { FavoriteMonster, FavoriteItem } from '@/types'
import { useEntityCard } from './useEntityCard'
import { useAuth } from '@/contexts/AuthContext'

/**
 * 統一的收藏管理 Hook
 * 整合怪物和物品的收藏功能
 *
 * 根據登入狀態使用不同的 storage key：
 * - 登入用戶：chronostory-favorite-* (會同步到雲端)
 * - 非登入用戶：chronostory-guest-favorite-* (僅本地)
 *
 * @example
 * ```tsx
 * const favorites = useFavorites()
 *
 * // 怪物收藏
 * favorites.monsters.list        // FavoriteMonster[]
 * favorites.monsters.toggle(id, name)
 * favorites.monsters.isFavorite(id)
 * favorites.monsters.count
 * favorites.monsters.clearAll()
 *
 * // 物品收藏
 * favorites.items.list           // FavoriteItem[]
 * favorites.items.toggle(id, name)
 * favorites.items.isFavorite(id)
 * favorites.items.count
 * favorites.items.clearAll()
 * favorites.items.reorder(fromIndex, toIndex)
 * ```
 */

export interface FavoriteEntityActions<T> {
  /** 收藏列表 */
  list: T[]
  /** 切換收藏狀態 */
  toggle: (id: number, name: string) => void
  /** 檢查是否已收藏 */
  isFavorite: (id: number) => boolean
  /** 收藏數量 */
  count: number
  /** 清空所有收藏 */
  clearAll: () => void
  /** 重新排序（拖曳用） */
  reorder: (fromIndex: number, toIndex: number) => void
}

export interface UseFavoritesReturn {
  monsters: FavoriteEntityActions<FavoriteMonster>
  items: FavoriteEntityActions<FavoriteItem>
}

export function useFavorites(): UseFavoritesReturn {
  const { user } = useAuth()
  const hasMigratedMonsters = useRef(false)
  const hasMigratedItems = useRef(false)

  // ===== 怪物收藏遷移 =====
  useEffect(() => {
    if (hasMigratedMonsters.current) return
    if (user) return

    const guestFavorites = getGuestFavoriteMonsters()
    if (guestFavorites.length > 0) return

    const oldFavorites = getFavoriteMonsters()
    if (oldFavorites.length > 0) {
      setGuestFavoriteMonsters(oldFavorites)
      console.log('[Migration] 已遷移怪物收藏到 guest storage')
    }
    hasMigratedMonsters.current = true
  }, [user])

  // ===== 物品收藏遷移 =====
  useEffect(() => {
    if (hasMigratedItems.current) return
    if (user) return

    const guestFavorites = getGuestFavoriteItems()
    if (guestFavorites.length > 0) return

    const oldFavorites = getFavoriteItems()
    if (oldFavorites.length > 0) {
      setGuestFavoriteItems(oldFavorites)
      console.log('[Migration] 已遷移物品收藏到 guest storage')
    }
    hasMigratedItems.current = true
  }, [user])

  // ===== 怪物收藏 =====
  const getMonsterEntities = useCallback(() => {
    return user ? getFavoriteMonsters() : getGuestFavoriteMonsters()
  }, [user])

  const setMonsterEntities = useCallback((monsters: FavoriteMonster[]) => {
    return user ? setFavoriteMonsters(monsters) : setGuestFavoriteMonsters(monsters)
  }, [user])

  const monsterCard = useEntityCard<FavoriteMonster>({
    getEntities: getMonsterEntities,
    setEntities: setMonsterEntities,
    createEntity: (id, name) => ({
      mobId: id,
      mobName: name,
      addedAt: Date.now(),
    }),
    getEntityId: (entity) => entity.mobId,
    preferenceField: 'favoriteMonsters',
  })

  // ===== 物品收藏 =====
  const getItemEntities = useCallback(() => {
    return user ? getFavoriteItems() : getGuestFavoriteItems()
  }, [user])

  const setItemEntities = useCallback((items: FavoriteItem[]) => {
    return user ? setFavoriteItems(items) : setGuestFavoriteItems(items)
  }, [user])

  const itemCard = useEntityCard<FavoriteItem>({
    getEntities: getItemEntities,
    setEntities: setItemEntities,
    createEntity: (id, name) => ({
      itemId: id,
      itemName: name,
      addedAt: Date.now(),
    }),
    getEntityId: (entity) => entity.itemId,
    preferenceField: 'favoriteItems',
  })

  return {
    monsters: {
      list: monsterCard.favorites,
      toggle: monsterCard.toggleFavorite,
      isFavorite: monsterCard.isFavorite,
      count: monsterCard.favoriteCount,
      clearAll: monsterCard.clearAll,
      reorder: monsterCard.reorder,
    },
    items: {
      list: itemCard.favorites,
      toggle: itemCard.toggleFavorite,
      isFavorite: itemCard.isFavorite,
      count: itemCard.favoriteCount,
      clearAll: itemCard.clearAll,
      reorder: itemCard.reorder,
    },
  }
}
