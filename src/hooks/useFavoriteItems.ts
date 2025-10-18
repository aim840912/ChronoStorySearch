import { getFavoriteItems, setFavoriteItems } from '@/lib/storage'
import type { FavoriteItem } from '@/types'
import { useEntityCard } from './useEntityCard'

/**
 * 自定義 Hook - 管理最愛物品
 * 使用 localStorage 持久化儲存
 *
 * 使用 useEntityCard generic hook 提供統一的最愛管理邏輯
 */
export function useFavoriteItems() {
  return useEntityCard<FavoriteItem>({
    getEntities: getFavoriteItems,
    setEntities: setFavoriteItems,
    createEntity: (id, name) => ({
      itemId: id,
      itemName: name,
      addedAt: Date.now(),
    }),
    getEntityId: (entity) => entity.itemId,
  })
}
