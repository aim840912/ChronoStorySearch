'use client'

import { useMemo } from 'react'
import type { GachaResult } from '@/types'
import { BaseModal } from '@/components/common/BaseModal'
import { EquipmentStatsCard } from '@/components/equipment/EquipmentStatsCard'
import { useLanguage } from '@/contexts/LanguageContext'
import { mergeRandomStats } from '@/lib/random-equipment-stats'

interface EquipmentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  equipment: GachaResult
}

/**
 * 裝備詳細資訊 Modal
 * 顯示裝備完整屬性（含隨機屬性）
 */
export function EquipmentDetailsModal({
  isOpen,
  onClose,
  equipment,
}: EquipmentDetailsModalProps) {
  const { t, language } = useLanguage()

  // 應用隨機屬性到裝備數值
  const statsWithRandom = useMemo(() => {
    if (!equipment.equipment) return null
    return mergeRandomStats(equipment.equipment.stats, equipment.randomStats)
  }, [equipment])

  // 如果不是裝備類物品，不顯示 Modal
  if (!equipment.equipment || !statsWithRandom) {
    return null
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" zIndex="z-[80]">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-h-[80vh] overflow-y-auto">
        {/* 標題 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('gacha.equipmentDetails')}
          </h2>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            {language === 'zh-TW' ? equipment.chineseName : equipment.itemName}
          </p>
          {equipment.randomStats && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              {t('gacha.hasRandomStats')}
            </p>
          )}
        </div>

        {/* 裝備屬性卡片 */}
        <div className="mb-6">
          <EquipmentStatsCard stats={statsWithRandom} />
        </div>

        {/* 按鈕區 */}
        <div className="flex">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </BaseModal>
  )
}
