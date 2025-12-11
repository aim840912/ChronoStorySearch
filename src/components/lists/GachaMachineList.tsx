'use client'

import { memo } from 'react'
import { MachineCard } from '@/components/gacha/MachineCard'
import { useLanguage } from '@/contexts/LanguageContext'
import type { GachaMachine } from '@/types'

interface GachaMachineListProps {
  /** 轉蛋機列表 */
  gachaMachines: GachaMachine[]
  /** 選擇轉蛋機的回調 */
  onSelect: (machineId: number) => void
}

/**
 * 轉蛋機列表元件
 * 顯示所有轉蛋機卡片，點擊後切換到該機器的物品列表
 */
export const GachaMachineList = memo(function GachaMachineList({
  gachaMachines,
  onSelect,
}: GachaMachineListProps) {
  const { language, t } = useLanguage()

  if (gachaMachines.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {t('common.loading')}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 pt-4">
      {/* 轉蛋機網格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {gachaMachines.map((machine) => (
          <MachineCard
            key={machine.machineId}
            machine={machine}
            language={language}
            onClick={() => onSelect(machine.machineId)}
          />
        ))}
      </div>
    </div>
  )
})
