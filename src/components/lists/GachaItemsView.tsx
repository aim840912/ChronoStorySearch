'use client'

import { memo, useMemo } from 'react'
import { GachaItemCard } from '@/components/gacha/GachaItemCard'
import { useLanguage } from '@/contexts/LanguageContext'
import type { GachaMachine } from '@/types'

interface GachaItemsViewProps {
  /** 選中的轉蛋機 ID */
  machineId: number
  /** 所有轉蛋機資料 */
  gachaMachines: GachaMachine[]
  /** 點擊物品的回調 */
  onItemClick: (itemId: number, itemName: string) => void
}

/**
 * 轉蛋機物品列表元件
 * 顯示特定轉蛋機的所有物品
 */
export const GachaItemsView = memo(function GachaItemsView({
  machineId,
  gachaMachines,
  onItemClick,
}: GachaItemsViewProps) {
  const { language, t } = useLanguage()

  // 找到選中的轉蛋機
  const selectedMachine = useMemo(() => {
    return gachaMachines.find((m) => m.machineId === machineId)
  }, [gachaMachines, machineId])


  if (!selectedMachine) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {t('common.loading')}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      {/* 物品網格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {selectedMachine.items.map((item, index) => (
          <GachaItemCard
            key={`${item.itemId}-${index}`}
            item={item}
            language={language}
            onItemClick={onItemClick}
          />
        ))}
      </div>
    </div>
  )
})
