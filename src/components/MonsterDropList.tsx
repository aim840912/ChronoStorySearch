/**
 * 怪物掉落列表元件（表格視圖）
 *
 * 功能：
 * - 表格式佈局，適合快速掃描和比較
 * - 支援點擊查看怪物詳情
 * - 支援最愛功能
 * - 響應式設計（手機版簡化欄位）
 * - 與 MonsterDropCard 功能一致
 */

'use client'

import { memo, useState, useMemo } from 'react'
import type { DropItem } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useImageFormat } from '@/contexts/ImageFormatContext'
import { getMonsterDisplayName } from '@/lib/display-name'
import { getMonsterImageUrl } from '@/lib/image-utils'

// localStorage key for sorting preference
const SORT_ORDER_STORAGE_KEY = 'monster-drop-sort-order'

interface MonsterDropListProps {
  drops: DropItem[]
  monsterHPMap: Map<number, number | null>
  isMonsterFavorite: (mobId: number) => boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
  onMonsterClick: (mobId: number, mobName: string) => void
}

export const MonsterDropList = memo(function MonsterDropList({
  drops,
  monsterHPMap,
  isMonsterFavorite,
  onToggleFavorite,
  onMonsterClick,
}: MonsterDropListProps) {
  const { t } = useLanguage()
  const isDev = process.env.NODE_ENV === 'development'

  // 排序狀態（從 localStorage 讀取，預設高到低）
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SORT_ORDER_STORAGE_KEY)
      if (saved === 'asc' || saved === 'desc') {
        return saved
      }
    }
    return 'desc'
  })

  // 切換排序並保存到 localStorage
  const handleSortToggle = () => {
    setSortOrder(prev => {
      const newOrder = prev === 'desc' ? 'asc' : 'desc'
      localStorage.setItem(SORT_ORDER_STORAGE_KEY, newOrder)
      return newOrder
    })
  }

  // 根據掉落率排序
  const sortedDrops = useMemo(() => {
    return [...drops].sort((a, b) => {
      return sortOrder === 'desc'
        ? b.chance - a.chance  // 高→低
        : a.chance - b.chance  // 低→高
    })
  }, [drops, sortOrder])

  return (
    <table className="w-full border-collapse">
      <thead className="sticky top-12 z-[5] bg-gray-100 dark:bg-gray-700">
        <tr className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600">
            <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
              {/* 最愛欄位（圖示） */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </th>
            <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('card.monster') || '怪物'}
            </th>
            <th className="text-center p-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <button
                onClick={handleSortToggle}
                className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {t('card.dropChance') || '掉落率'}
                <svg
                  className={`w-4 h-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </th>
            <th className="text-center p-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hidden sm:table-cell">
              {t('card.hp') || '血量'}
            </th>
            {isDev && (
              <th className="text-center p-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hidden md:table-cell">
                ID
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedDrops.map((drop, index) => (
            <MonsterDropListRow
              key={drop.mobId}
              drop={drop}
              monsterHPMap={monsterHPMap}
              isFavorite={isMonsterFavorite(drop.mobId)}
              onToggleFavorite={onToggleFavorite}
              onMonsterClick={onMonsterClick}
              isEvenRow={index % 2 === 0}
              isDev={isDev}
            />
          ))}
        </tbody>
      </table>
  )
})

// ============================================
// 列表行元件（單一怪物）
// ============================================

interface MonsterDropListRowProps {
  drop: DropItem
  monsterHPMap: Map<number, number | null>
  isFavorite: boolean
  onToggleFavorite: (mobId: number, mobName: string) => void
  onMonsterClick: (mobId: number, mobName: string) => void
  isEvenRow: boolean
  isDev: boolean
}

const MonsterDropListRow = memo(function MonsterDropListRow({
  drop,
  monsterHPMap,
  isFavorite,
  onToggleFavorite,
  onMonsterClick,
  isEvenRow,
  isDev,
}: MonsterDropListRowProps) {
  const { language, t } = useLanguage()
  const { format } = useImageFormat()

  const chancePercent = drop.chance.toFixed(4)

  // 計算怪物血量顯示值
  const monsterHP = monsterHPMap.get(drop.mobId)
  const hpDisplay = monsterHP !== undefined && monsterHP !== null
    ? monsterHP.toLocaleString()
    : 'N/A'

  // 獲取顯示名稱
  const displayMobName = getMonsterDisplayName(drop.mobName, drop.chineseMobName, language)

  // 怪物圖示 URL
  const monsterIconUrl = getMonsterImageUrl(drop.mobId, { format })

  return (
    <tr
      onClick={() => onMonsterClick(drop.mobId, displayMobName)}
      className={`
        cursor-pointer
        transition-all duration-200
        hover:bg-blue-50 dark:hover:bg-blue-900/20
        border-b border-gray-200 dark:border-gray-700
        ${isEvenRow ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}
      `}
    >
      {/* 最愛按鈕 */}
      <td className="p-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(drop.mobId, displayMobName)
          }}
          className={`
            p-2 rounded-full transition-all duration-200
            hover:scale-110 active:scale-95
            ${
              isFavorite
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600'
            }
          `}
          aria-label={isFavorite ? t('card.unfavorite') : t('card.favorite')}
        >
          <svg
            className="w-4 h-4"
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </td>

      {/* 怪物資訊（圖示 + 名稱） */}
      <td className="p-3">
        <div className="flex items-center gap-3">
          <img
            src={monsterIconUrl}
            alt={displayMobName}
            width={48}
            height={48}
            className="monster-image flex-shrink-0"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 dark:text-white truncate">
              {displayMobName}
            </div>
          </div>
        </div>
      </td>

      {/* 掉落率 */}
      <td className="p-3 text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold text-sm">
          {chancePercent}%
        </span>
      </td>

      {/* 血量（手機版隱藏） */}
      <td className="p-3 text-center hidden sm:table-cell">
        <span className="inline-block px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold text-sm">
          {hpDisplay}
        </span>
      </td>

      {/* 開發模式：怪物 ID（桌面版才顯示） */}
      {isDev && (
        <td className="p-3 text-center text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell">
          {drop.mobId}
        </td>
      )}
    </tr>
  )
})
