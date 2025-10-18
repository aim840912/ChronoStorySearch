import { getFavoriteMonsters, setFavoriteMonsters } from '@/lib/storage'
import type { FavoriteMonster } from '@/types'
import { useEntityCard } from './useEntityCard'

/**
 * 自定義 Hook - 管理最愛怪物
 * 使用 localStorage 持久化儲存
 *
 * 使用 useEntityCard generic hook 提供統一的最愛管理邏輯
 */
export function useFavoriteMonsters() {
  return useEntityCard<FavoriteMonster>({
    getEntities: getFavoriteMonsters,
    setEntities: setFavoriteMonsters,
    createEntity: (id, name) => ({
      mobId: id,
      mobName: name,
      addedAt: Date.now(),
    }),
    getEntityId: (entity) => entity.mobId,
  })
}
