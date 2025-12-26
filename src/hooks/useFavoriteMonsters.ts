import { useCallback, useEffect, useRef } from 'react'
import {
  getFavoriteMonsters,
  setFavoriteMonsters,
  getGuestFavoriteMonsters,
  setGuestFavoriteMonsters,
} from '@/lib/storage'
import type { FavoriteMonster } from '@/types'
import { useEntityCard } from './useEntityCard'
import { useAuth } from '@/contexts/AuthContext'

/**
 * 自定義 Hook - 管理最愛怪物
 * 使用 localStorage 持久化儲存
 *
 * 根據登入狀態使用不同的 storage key：
 * - 登入用戶：chronostory-favorite-monsters（會同步到雲端）
 * - 非登入用戶：chronostory-guest-favorite-monsters（僅本地）
 */
export function useFavoriteMonsters() {
  const { user } = useAuth()
  const hasMigrated = useRef(false)

  // 一次性遷移：將舊的非登入用戶資料遷移到 guest key
  useEffect(() => {
    if (hasMigrated.current) return
    if (user) return // 已登入用戶不需要遷移

    const guestFavorites = getGuestFavoriteMonsters()
    if (guestFavorites.length > 0) return // 已有 guest 資料，不需遷移

    const oldFavorites = getFavoriteMonsters()
    if (oldFavorites.length > 0) {
      setGuestFavoriteMonsters(oldFavorites)
      console.log('[Migration] 已遷移怪物收藏到 guest storage')
    }
    hasMigrated.current = true
  }, [user])

  // 根據登入狀態選擇對應的 getter/setter
  const getEntities = useCallback(() => {
    return user ? getFavoriteMonsters() : getGuestFavoriteMonsters()
  }, [user])

  const setEntities = useCallback((monsters: FavoriteMonster[]) => {
    return user ? setFavoriteMonsters(monsters) : setGuestFavoriteMonsters(monsters)
  }, [user])

  return useEntityCard<FavoriteMonster>({
    getEntities,
    setEntities,
    createEntity: (id, name) => ({
      mobId: id,
      mobName: name,
      addedAt: Date.now(),
    }),
    getEntityId: (entity) => entity.mobId,
    preferenceField: 'favoriteMonsters',
  })
}
