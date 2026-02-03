'use client'

import { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { MonsterSpawnLocation } from '@/types/monster'

// 直接 import 預處理的 JSON（build time 產生）
import monsterSpawnsData from '@/chronostoryData/map-database/monster-spawns.json'

interface MonsterSpawnsCardProps {
  monsterName: string  // 英文怪物名稱（來自 monsterData.mobName）
}

// 預設顯示的地圖數量
const DEFAULT_VISIBLE_COUNT = 5

/**
 * 怪物出沒地點卡片元件
 * 顯示怪物出現在哪些地圖
 */
export function MonsterSpawnsCard({ monsterName }: MonsterSpawnsCardProps) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)

  // 取得該怪物的出沒地點
  const spawns = useMemo(() => {
    const data = monsterSpawnsData as Record<string, MonsterSpawnLocation[]>
    return data[monsterName] || []
  }, [monsterName])

  // 按區域分組
  const spawnsByRegion = useMemo(() => {
    const grouped: Record<string, MonsterSpawnLocation[]> = {}
    for (const spawn of spawns) {
      if (!grouped[spawn.region]) {
        grouped[spawn.region] = []
      }
      grouped[spawn.region].push(spawn)
    }
    return grouped
  }, [spawns])

  // 計算是否需要展開/收合功能
  const needsExpansion = spawns.length > DEFAULT_VISIBLE_COUNT

  // 處理無出沒資料的情況
  if (spawns.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('monster.spawns')}
        </h3>
        <div className="flex flex-col items-center justify-center py-6 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-base font-medium">{t('monster.spawns_none')}</p>
        </div>
      </div>
    )
  }

  // 獲取可見的區域和地圖
  const getVisibleContent = () => {
    if (isExpanded) {
      return spawnsByRegion
    }

    // 收合狀態：只顯示前 N 個地圖，但保持區域分組
    let count = 0
    const result: Record<string, MonsterSpawnLocation[]> = {}

    for (const [region, regionSpawns] of Object.entries(spawnsByRegion)) {
      if (count >= DEFAULT_VISIBLE_COUNT) break

      const remaining = DEFAULT_VISIBLE_COUNT - count
      const visibleInRegion = regionSpawns.slice(0, remaining)
      if (visibleInRegion.length > 0) {
        result[region] = visibleInRegion
        count += visibleInRegion.length
      }
    }

    return result
  }

  const visibleContent = getVisibleContent()

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/30 rounded-xl p-6 shadow-lg border border-emerald-200 dark:border-emerald-800">
      {/* 標題 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('monster.spawns')}
        </h3>
        <span className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-800/50 px-2 py-1 rounded-full">
          {spawns.length} {t('monster.spawns_count')}
        </span>
      </div>

      {/* 地圖列表 - 按區域分組 */}
      <div className="space-y-4">
        {Object.entries(visibleContent).map(([region, regionSpawns]) => (
          <div key={region}>
            {/* 區域標題 */}
            <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {region}
            </h4>

            {/* 地圖列表 */}
            <div className="flex flex-col gap-2">
              {regionSpawns.map((spawn, index) => (
                <div
                  key={`${spawn.section}-${spawn.map}-${index}`}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    spawn.hidden
                      ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                      : 'bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {/* 地圖名稱 */}
                      <div className={`font-medium ${
                        spawn.hidden
                          ? 'text-amber-800 dark:text-amber-200'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        {spawn.map}
                      </div>
                      {/* 區段名稱 */}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {spawn.section}
                      </div>
                    </div>
                    {/* 隱藏地圖標記 */}
                    {spawn.hidden && (
                      <span className="flex-shrink-0 text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-800/50 px-1.5 py-0.5 rounded">
                        {t('monster.spawns_hidden')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 展開/收合按鈕 */}
      {needsExpansion && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 w-full py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          {isExpanded ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {t('monster.spawns_collapse')}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {t('monster.spawns_expand')} ({spawns.length - DEFAULT_VISIBLE_COUNT})
            </>
          )}
        </button>
      )}
    </div>
  )
}
