'use client'

import { useRef, useEffect, memo } from 'react'
import type { MobInfo } from '@/types'

interface MonsterSelectorProps {
  availableMonsters: MobInfo[]
  selectedMobId: number | null
  monsterSearchTerm: string
  isDropdownOpen: boolean
  monsterLevel: number
  monsterAvoid: number
  language: 'zh-TW' | 'en'
  onSearchTermChange: (term: string) => void
  onSelectMonster: (mobId: number, displayName: string) => void
  onClearSelection: () => void
  onDropdownOpenChange: (isOpen: boolean) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

export const MonsterSelector = memo(function MonsterSelector({
  availableMonsters,
  selectedMobId,
  monsterSearchTerm,
  isDropdownOpen,
  monsterLevel,
  monsterAvoid,
  language,
  onSearchTermChange,
  onSelectMonster,
  onClearSelection,
  onDropdownOpenChange,
  t,
}: MonsterSelectorProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 選中的怪物資訊
  const selectedMonster = availableMonsters.find(
    (info) => parseInt(info.mob.id, 10) === selectedMobId
  )

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onDropdownOpenChange(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen, onDropdownOpenChange])

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('selectMonster')}
        </label>
        {selectedMobId && (
          <button
            onClick={onClearSelection}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('clearSelection')}
          </button>
        )}
      </div>

      {/* 搜尋框 + 自動完成下拉選單 */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            type="text"
            value={monsterSearchTerm}
            onChange={(e) => {
              onSearchTermChange(e.target.value)
              onDropdownOpenChange(true)
            }}
            onFocus={() => onDropdownOpenChange(true)}
            placeholder={t('searchPlaceholder')}
            className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-3 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* 過濾結果數量提示 */}
        {monsterSearchTerm && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
            {t('foundMonsters', { count: availableMonsters.length })}
          </div>
        )}

        {/* 自動完成下拉選單 */}
        {isDropdownOpen && availableMonsters.length > 0 && (
          <div className="absolute w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-20">
            {availableMonsters.map((info) => {
              const mobId = parseInt(info.mob.id, 10)
              const displayName =
                language === 'zh-TW'
                  ? info.chineseMobName || info.mob.name || `怪物 ${mobId}`
                  : info.mob.name || info.chineseMobName || `Monster ${mobId}`
              const level = info.mob.level
              const avoid = info.mob.evasion
              const isSelected = selectedMobId === mobId

              return (
                <button
                  key={mobId}
                  type="button"
                  onClick={() => {
                    onSelectMonster(mobId, displayName)
                    onDropdownOpenChange(false)
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${
                    isSelected ? 'bg-blue-100 dark:bg-blue-900/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-white">{displayName}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Lv.{level}, {t('avoid')}:{avoid}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 顯示選中怪物的等級和迴避 */}
      {selectedMonster && (
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">{t('level')}:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{monsterLevel}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600 dark:text-gray-400">{t('avoid')}:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{monsterAvoid}</span>
          </div>
        </div>
      )}
    </div>
  )
})
