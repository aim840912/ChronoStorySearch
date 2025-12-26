import { useCallback, useEffect, useRef } from 'react'
import {
  getFavoriteItems,
  setFavoriteItems,
  getGuestFavoriteItems,
  setGuestFavoriteItems,
} from '@/lib/storage'
import type { FavoriteItem } from '@/types'
import { useEntityCard } from './useEntityCard'
import { useAuth } from '@/contexts/AuthContext'

/**
 * 自定義 Hook - 管理最愛物品
 * 使用 localStorage 持久化儲存
 *
 * 根據登入狀態使用不同的 storage key：
 * - 登入用戶：chronostory-favorite-items（會同步到雲端）
 * - 非登入用戶：chronostory-guest-favorite-items（僅本地）
 */
export function useFavoriteItems() {
  const { user } = useAuth()
  const hasMigrated = useRef(false)

  // 一次性遷移：將舊的非登入用戶資料遷移到 guest key
  useEffect(() => {
    if (hasMigrated.current) return
    if (user) return // 已登入用戶不需要遷移

    const guestFavorites = getGuestFavoriteItems()
    if (guestFavorites.length > 0) return // 已有 guest 資料，不需遷移

    const oldFavorites = getFavoriteItems()
    if (oldFavorites.length > 0) {
      setGuestFavoriteItems(oldFavorites)
      console.log('[Migration] 已遷移物品收藏到 guest storage')
    }
    hasMigrated.current = true
  }, [user])

  // 根據登入狀態選擇對應的 getter/setter
  const getEntities = useCallback(() => {
    return user ? getFavoriteItems() : getGuestFavoriteItems()
  }, [user])

  const setEntities = useCallback((items: FavoriteItem[]) => {
    return user ? setFavoriteItems(items) : setGuestFavoriteItems(items)
  }, [user])

  return useEntityCard<FavoriteItem>({
    getEntities,
    setEntities,
    createEntity: (id, name) => ({
      itemId: id,
      itemName: name,
      addedAt: Date.now(),
    }),
    getEntityId: (entity) => entity.itemId,
    preferenceField: 'favoriteItems',
  })
}
