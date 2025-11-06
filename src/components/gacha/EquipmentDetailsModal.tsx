'use client'

import { useMemo } from 'react'
import type { GachaResult } from '@/types'
import { BaseModal } from '@/components/common/BaseModal'
import { EquipmentStatsCard } from '@/components/equipment/EquipmentStatsCard'
import { useLanguage } from '@/contexts/LanguageContext'

interface EquipmentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  equipment: GachaResult
  onSave: (equipment: GachaResult) => void
}

/**
 * 裝備詳細資訊 Modal
 * 顯示裝備完整屬性（含隨機屬性）並提供儲存按鈕
 */
export function EquipmentDetailsModal({
  isOpen,
  onClose,
  equipment,
  onSave
}: EquipmentDetailsModalProps) {
  const { t, language } = useLanguage()

  // 應用隨機屬性到裝備數值
  const statsWithRandom = useMemo(() => {
    // GachaResult 已經包含完整的 equipment 物件
    if (!equipment.equipment) return null

    const originalStats = equipment.equipment.stats

    // 如果有隨機屬性，覆蓋原始數值
    const statsWithRandom = equipment.randomStats
      ? {
          ...originalStats,
          str: equipment.randomStats.str ?? originalStats.str,
          dex: equipment.randomStats.dex ?? originalStats.dex,
          int: equipment.randomStats.int ?? originalStats.int,
          luk: equipment.randomStats.luk ?? originalStats.luk,
          watk: equipment.randomStats.watk ?? originalStats.watk,
          matk: equipment.randomStats.matk ?? originalStats.matk,
          wdef: equipment.randomStats.wdef ?? originalStats.wdef,
          mdef: equipment.randomStats.mdef ?? originalStats.mdef,
          accuracy: equipment.randomStats.accuracy ?? originalStats.accuracy,
          avoidability: equipment.randomStats.avoidability ?? originalStats.avoidability,
          speed: equipment.randomStats.speed ?? originalStats.speed,
          jump: equipment.randomStats.jump ?? originalStats.jump,
          hp: equipment.randomStats.hp ?? originalStats.hp,
          mp: equipment.randomStats.mp ?? originalStats.mp,
        }
      : originalStats

    return statsWithRandom
  }, [equipment])

  // 處理儲存
  const handleSave = () => {
    onSave(equipment)
    onClose()
  }

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
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>{t('gacha.saveForEnhance')}</span>
          </button>
        </div>
      </div>
    </BaseModal>
  )
}
