'use client'

import { MonsterCard } from '@/components/MonsterCard'
import { EmptyState } from './EmptyState'

type UniqueMonster = { mobId: number; mobName: string; chineseMobName?: string | null; dropCount: number }

interface FavoriteMonstersListProps {
  monsters: UniqueMonster[]
  hasSearchTerm: boolean
  mobLevelMap: Map<number, number | null>
  onCardClick: (mobId: number, mobName: string) => void
  onToggleFavorite: (mobId: number, mobName: string) => void
  t: (key: string) => string
}

/**
 * 最愛怪物列表元件 - 顯示使用者收藏的怪物
 */
export function FavoriteMonstersList({
  monsters,
  hasSearchTerm,
  mobLevelMap,
  onCardClick,
  onToggleFavorite,
  t,
}: FavoriteMonstersListProps) {
  if (monsters.length === 0) {
    return (
      <EmptyState
        hasSearchTerm={hasSearchTerm}
        mode="favorite-monsters"
        t={t}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto mt-6 sm:mt-8">
      {monsters.map((monster) => (
        <MonsterCard
          key={monster.mobId}
          mobId={monster.mobId}
          mobName={monster.mobName}
          chineseMobName={monster.chineseMobName}
          dropCount={monster.dropCount}
          onCardClick={onCardClick}
          isFavorite={true}
          onToggleFavorite={onToggleFavorite}
          level={mobLevelMap.get(monster.mobId) ?? null}
        />
      ))}
    </div>
  )
}
