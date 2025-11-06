'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { DroppedEquipment } from '@/types/enhance'
import { BaseModal } from '@/components/common/BaseModal'
import { useLanguage } from '@/contexts/LanguageContext'

interface MonsterDropResultModalProps {
  isOpen: boolean
  onClose: () => void
  droppedEquipments: DroppedEquipment[]
  onSave: (selectedEquipments: DroppedEquipment[]) => void
}

export function MonsterDropResultModal({
  isOpen,
  onClose,
  droppedEquipments,
  onSave
}: MonsterDropResultModalProps) {
  const { t, language } = useLanguage()

  // 選中的裝備（使用 Set 儲存 itemId）
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(droppedEquipments.map(eq => eq.itemId))
  )

  // 切換單個裝備的選中狀態
  const toggleSelection = (itemId: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // 全選
  const selectAll = () => {
    setSelectedIds(new Set(droppedEquipments.map(eq => eq.itemId)))
  }

  // 全不選
  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  // 儲存選中的裝備
  const handleSave = () => {
    const selectedEquipments = droppedEquipments.filter(eq => selectedIds.has(eq.itemId))

    if (selectedEquipments.length === 0) {
      toast.warning('請至少選擇一件裝備')
      return
    }

    onSave(selectedEquipments)
    toast.success(t('enhance.equipmentsSaved', { count: selectedEquipments.length }))
    onClose()
  }

  // 格式化隨機屬性顯示
  const formatRandomStats = (equipment: DroppedEquipment): string[] => {
    if (!equipment.randomStats) return []

    const statsText: string[] = []
    const stats = equipment.randomStats
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

    Object.entries(stats).forEach(([key, value]) => {
      if (value !== null && value !== 0) {
        const statName = statsMap[key] || key.toUpperCase()
        const prefix = value > 0 ? '+' : ''
        statsText.push(`${statName} ${prefix}${value}`)
      }
    })

    return statsText
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-h-[80vh] overflow-y-auto">
        {/* 標題 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('enhance.dropResult')}
          </h2>
          {droppedEquipments.length > 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              {t('enhance.droppedEquipments')} ({droppedEquipments.length} 件)
            </p>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              {t('enhance.noEquipmentDropped')}
            </p>
          )}
        </div>

        {/* 沒有掉落裝備時的提示 */}
        {droppedEquipments.length === 0 ? (
          <div className="py-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              這次運氣不太好，沒有掉落裝備
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        ) : (
          <>
            {/* 全選/全不選按鈕 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={selectAll}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('enhance.selectAll')}
              </button>
              <button
                onClick={deselectAll}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('enhance.deselectAll')}
              </button>
            </div>

            {/* 裝備列表 */}
            <div className="space-y-3 mb-6">
              {droppedEquipments.map((equipment) => {
                const isSelected = selectedIds.has(equipment.itemId)
                const randomStats = formatRandomStats(equipment)

                return (
                  <div
                    key={equipment.itemId}
                    onClick={() => toggleSelection(equipment.itemId)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* 勾選框 */}
                      <div className="mt-1">
                        <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* 裝備資訊 */}
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {language === 'zh-TW' ? equipment.chineseName : equipment.itemName}
                          {equipment.enhanceCount > 0 && ` (+${equipment.enhanceCount})`}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {equipment.category} · {t('enhance.upgradesRemaining', { count: equipment.remainingUpgrades })}
                        </div>

                        {/* 隨機屬性 */}
                        {randomStats.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {t('enhance.randomStats')}:
                            </span>
                            {randomStats.map((stat, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded"
                              >
                                {stat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
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
                disabled={selectedIds.size === 0}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>{t('enhance.saveSelected')} ({selectedIds.size})</span>
              </button>
            </div>
          </>
        )}
      </div>
    </BaseModal>
  )
}
