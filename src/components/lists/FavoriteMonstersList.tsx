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
  onClearClick: () => void
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
  onClearClick,
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
    <div className="max-w-7xl mx-auto mt-6 sm:mt-8">
      {/* 清除按鈕 */}
      <div className="flex justify-end mb-4">
        <button
          onClick={onClearClick}
          className="px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 border-2 border-red-500 hover:border-red-600 text-red-500 hover:text-red-600 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg"
          title="清除所有最愛怪物"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {t('filter.clear')}
        </button>
      </div>

      {/* 卡片網格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {monsters.map((monster, index) => (
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
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
