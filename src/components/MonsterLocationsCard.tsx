'use client'

import { useMemo } from 'react'
import type { MapInfo, MobInfo } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { getMonsterDisplayName } from '@/lib/display-name'

interface MonsterLocationsCardProps {
  monsterName: string
  locations: Array<MapInfo & { regionName: string; regionCode: string }> | undefined
  mobInfoData: MobInfo[] | null
  onMonsterClick?: (mobId: number, mobName: string) => void
}

/**
 * 怪物出沒地圖卡片元件
 * 顯示指定怪物出現在哪些地圖
 */
export function MonsterLocationsCard({
  monsterName,
  locations,
  mobInfoData,
}: MonsterLocationsCardProps) {
  const { t, language } = useLanguage()

  // 建立怪物名稱映射 (英文名 -> 中文名)
  const monsterNameMap = useMemo(() => {
    if (!mobInfoData) return new Map<string, string>()

    const nameMap = new Map<string, string>()
    mobInfoData.forEach((info) => {
      const englishName = info.mob.mob_name
      const chineseName = info.chineseMobName
      if (englishName && chineseName) {
        nameMap.set(englishName, chineseName)
      }
    })
    return nameMap
  }, [mobInfoData])

  // 如果沒有地圖資料，顯示提示訊息
  if (!locations || locations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t('monster.locations') || '出沒地圖'}
          </h4>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('monster.noLocationData') || '暫無地圖資料'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      {/* 標題 */}
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {t('monster.locations') || '出沒地圖'} ({locations.length})
        </h4>
      </div>

      {/* 地圖列表 */}
      <div className="space-y-3">
        {locations.map((location, index) => (
          <div
            key={`${location.regionCode}-${index}`}
            className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3 border border-gray-200 dark:border-gray-600"
          >
            {/* 區域名稱 */}
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                />
              </svg>
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                {location.regionName}
              </span>
            </div>

            {/* 地圖名稱 */}
            <div className="flex items-start gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {location.name}
              </span>
            </div>

            {/* NPCs */}
            {location.npcs.length > 0 && (
              <div className="flex items-start gap-2 mb-2">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <div className="flex-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">NPC: </span>
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {location.npcs.join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* 其他怪物 */}
            {location.monsters.length > 0 && (
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {t('monster.otherMonsters') || '其他怪物'}:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {location.monsters
                      .filter(m => m.name !== monsterName) // 過濾掉當前怪物
                      .map((monster, idx) => {
                        // 獲取中文名稱（若有）
                        const chineseName = monsterNameMap.get(monster.name)
                        // 根據語言顯示對應名稱
                        const displayName = getMonsterDisplayName(monster.name, chineseName, language)

                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                          >
                            {displayName}
                            {monster.level && (
                              <span className="ml-1 text-red-600 dark:text-red-400">
                                Lv.{monster.level}
                              </span>
                            )}
                          </span>
                        )
                      })}
                    {location.monsters.every(m => m.name === monsterName) && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                        {t('monster.onlyThisMonster') || '僅此怪物'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
