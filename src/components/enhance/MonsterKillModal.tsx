'use client'

import { useState } from 'react'
import type { MonsterInfo, DroppedEquipment } from '@/types/enhance'
import { BaseModal } from '@/components/common/BaseModal'
import { simulateAndConvertDrops, getEquipmentDropCount } from '@/lib/monster-drop-simulator'
import { useLanguage } from '@/contexts/LanguageContext'

interface MonsterKillModalProps {
  isOpen: boolean
  onClose: () => void
  monster: MonsterInfo
  onDropResult: (droppedEquipments: DroppedEquipment[]) => void
}

export function MonsterKillModal({
  isOpen,
  onClose,
  monster,
  onDropResult
}: MonsterKillModalProps) {
  const { t, language } = useLanguage()
  const [isKilling, setIsKilling] = useState(false)

  // 計算可能掉落的裝備數量
  const equipmentDropCount = getEquipmentDropCount(monster.drops)

  // 處理擊殺
  const handleKill = async () => {
    setIsKilling(true)

    // 模擬擊殺動畫延遲
    await new Promise(resolve => setTimeout(resolve, 800))

    // 執行掉落模擬
    const droppedEquipments = simulateAndConvertDrops(monster.drops, {
      id: monster.id,
      name: monster.name,
      chineseName: monster.chineseName
    })

    setIsKilling(false)

    // 關閉當前 Modal 並傳遞掉落結果
    onClose()
    onDropResult(droppedEquipments)
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        {/* 標題 */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          {t('enhance.monsterKillTitle')}
        </h2>

        {/* 怪物資訊 */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {language === 'zh-TW' ? monster.chineseName : monster.name}
            </div>
            <span className="px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
              {t('enhance.monsterLevel', { level: monster.level })}
            </span>
          </div>

          {/* 掉落物品預覽 */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>
                {equipmentDropCount > 0
                  ? t('monster.droppedItems') + `: ${equipmentDropCount} 種裝備`
                  : '無裝備掉落'}
              </span>
            </div>
          </div>
        </div>

        {/* 警告提示（如果沒有裝備掉落） */}
        {equipmentDropCount === 0 && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                此怪物不會掉落裝備類物品
              </p>
            </div>
          </div>
        )}

        {/* 按鈕區 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isKilling}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleKill}
            disabled={isKilling}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isKilling ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{t('enhance.killingMonster')}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{t('enhance.killMonster')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  )
}
