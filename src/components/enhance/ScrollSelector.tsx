'use client'

import { useState, useEffect, useMemo } from 'react'
import type { EnhanceScroll } from '@/types/enhance'
import { useLanguage } from '@/contexts/LanguageContext'

interface ScrollSelectorProps {
  equipmentCategory?: string
  selectedScroll: EnhanceScroll | null
  onSelectScroll: (scroll: EnhanceScroll | null) => void
  disabled?: boolean
}

export function ScrollSelector({
  equipmentCategory,
  selectedScroll,
  onSelectScroll,
  disabled = false
}: ScrollSelectorProps) {
  const { language } = useLanguage()
  const [allScrolls, setAllScrolls] = useState<EnhanceScroll[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 載入卷軸資料
  useEffect(() => {
    loadScrolls()
  }, [])

  const loadScrolls = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/enhance/scrolls')
      const data = await response.json()

      if (data.success) {
        setAllScrolls(data.data)
      }
    } catch (error) {
      console.error('Failed to load scrolls:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 根據裝備分類篩選可用卷軸
  const availableScrolls = useMemo(() => {
    if (!equipmentCategory) return []
    return allScrolls.filter(scroll => scroll.category === equipmentCategory)
  }, [allScrolls, equipmentCategory])

  // 分離普通卷軸和詛咒卷
  const { normalScrolls, cursedScrolls } = useMemo(() => {
    const normal: EnhanceScroll[] = []
    const cursed: EnhanceScroll[] = []

    availableScrolls.forEach(scroll => {
      if (scroll.destroyRate > 0) {
        cursed.push(scroll)
      } else {
        normal.push(scroll)
      }
    })

    return { normalScrolls: normal, cursedScrolls: cursed }
  }, [availableScrolls])

  // 按成功率分組（普通卷軸）
  const scrollsBySuccessRate = useMemo(() => {
    const groups: Record<number, EnhanceScroll[]> = {}
    normalScrolls.forEach(scroll => {
      if (!groups[scroll.successRate]) {
        groups[scroll.successRate] = []
      }
      groups[scroll.successRate].push(scroll)
    })
    return groups
  }, [normalScrolls])

  // 按成功率分組（詛咒卷）
  const cursedScrollsBySuccessRate = useMemo(() => {
    const groups: Record<number, EnhanceScroll[]> = {}
    cursedScrolls.forEach(scroll => {
      if (!groups[scroll.successRate]) {
        groups[scroll.successRate] = []
      }
      groups[scroll.successRate].push(scroll)
    })
    return groups
  }, [cursedScrolls])

  // 格式化屬性顯示
  const formatStats = (scroll: EnhanceScroll): string[] => {
    const statsText: string[] = []
    const statsMap: Record<string, string> = {
      str: 'STR',
      dex: 'DEX',
      int: 'INT',
      luk: 'LUK',
      watk: '物攻',
      matk: '魔攻',
      wdef: '物防',
      mdef: '魔防',
      hp: 'HP',
      mp: 'MP',
      accuracy: '命中',
      avoidability: '迴避',
      speed: '速度',
      jump: '跳躍'
    }

    Object.entries(scroll.stats).forEach(([key, value]) => {
      if (value !== null && value !== 0) {
        const statName = statsMap[key] || key.toUpperCase()
        statsText.push(`${statName} +${value}`)
      }
    })

    return statsText
  }

  if (disabled || !equipmentCategory) {
    return (
      <div className="p-8 text-center text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg">
        {!equipmentCategory ? '請先選擇裝備' : '當前裝備無法強化'}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        載入卷軸中...
      </div>
    )
  }

  if (availableScrolls.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg">
        找不到適用於 {equipmentCategory} 的卷軸
      </div>
    )
  }

  return (
    <div className="space-y-6 max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto pr-2">
      {/* 普通卷軸區塊 */}
      {[100, 60, 15, 10].map(successRate => {
        const scrolls = scrollsBySuccessRate[successRate] || []
        if (scrolls.length === 0) return null

        return (
          <div key={successRate} className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {language === 'zh-TW' ? `成功率 ${successRate}%` : `Success Rate ${successRate}%`}
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {scrolls.map(scroll => {
                const stats = formatStats(scroll)
                const isSelected = selectedScroll?.itemId === scroll.itemId

                return (
                  <button
                    key={scroll.itemId}
                    onClick={() => onSelectScroll(scroll)}
                    className={`p-4 text-left border rounded-lg transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {language === 'zh-TW' ? scroll.chineseName : scroll.itemName}
                        </div>
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {stats.join(', ')}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {successRate}%
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* 詛咒卷獨立區塊 */}
      {cursedScrolls.length > 0 && (
        <div className="mt-6 pt-6 border-t-2 border-red-200 dark:border-red-900">
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-bold">
                {language === 'zh-TW' ? '詛咒卷 (Dark Scrolls)' : 'Cursed Scrolls (Dark Scrolls)'}
              </span>
            </div>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {language === 'zh-TW' ? (
                <>⚠️ 警告：失敗時有 <span className="font-bold">50% 機率</span>導致裝備<span className="font-bold">永久毀滅</span>！</>
              ) : (
                <>⚠️ Warning: <span className="font-bold">50% chance</span> to <span className="font-bold">permanently destroy</span> equipment on failure!</>
              )}
            </p>
          </div>

          {[70, 30].map(successRate => {
            const scrolls = cursedScrollsBySuccessRate[successRate] || []
            if (scrolls.length === 0) return null

            return (
              <div key={successRate} className="space-y-2 mb-4">
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">
                  詛咒卷 - 成功率 {successRate}% (失敗時 50% 毀滅)
                </h3>

                <div className="grid grid-cols-1 gap-2">
                  {scrolls.map(scroll => {
                    const stats = formatStats(scroll)
                    const isSelected = selectedScroll?.itemId === scroll.itemId

                    return (
                      <button
                        key={scroll.itemId}
                        onClick={() => onSelectScroll(scroll)}
                        className={`p-4 text-left border-2 rounded-lg transition-all ${
                          isSelected
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                            : 'border-red-300 dark:border-red-700 hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/10'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-red-700 dark:text-red-300">
                              {language === 'zh-TW' ? scroll.chineseName : scroll.itemName}
                            </div>
                            <div className="mt-1 text-sm text-red-600 dark:text-red-400">
                              {stats.join(', ')}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                            {successRate}%
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
