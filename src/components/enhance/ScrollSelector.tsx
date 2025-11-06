'use client'

import { useState, useEffect, useMemo } from 'react'
import type { EnhanceScroll } from '@/types/enhance'
import { isCursedScroll } from '@/lib/enhance-utils'
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

  // 按成功率分組
  const scrollsBySuccessRate = useMemo(() => {
    const groups: Record<number, EnhanceScroll[]> = {}
    availableScrolls.forEach(scroll => {
      if (!groups[scroll.successRate]) {
        groups[scroll.successRate] = []
      }
      groups[scroll.successRate].push(scroll)
    })
    return groups
  }, [availableScrolls])

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
    <div className="space-y-4 max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto pr-2">
      {/* 按成功率分組顯示 */}
      {[100, 60, 15, 10].map(successRate => {
        const scrolls = scrollsBySuccessRate[successRate] || []
        if (scrolls.length === 0) return null

        return (
          <div key={successRate} className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              成功率 {successRate}%
              {scrolls[0] && isCursedScroll(scrolls[0]) && (
                <span className="ml-2 text-red-600 dark:text-red-400">(詛咒卷 - 失敗時 {scrolls[0].destroyRate}% 毀滅)</span>
              )}
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {scrolls.map(scroll => {
                const stats = formatStats(scroll)
                const isCursed = isCursedScroll(scroll)
                const isSelected = selectedScroll?.itemId === scroll.itemId

                return (
                  <button
                    key={scroll.itemId}
                    onClick={() => onSelectScroll(scroll)}
                    className={`p-4 text-left border rounded-lg transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : isCursed
                        ? 'border-red-300 dark:border-red-700 hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className={`font-medium ${isCursed ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          {language === 'zh-TW' ? scroll.chineseName : scroll.itemName}
                        </div>
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {stats.join(', ')}
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${
                        isCursed
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
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
  )
}
