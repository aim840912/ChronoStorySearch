'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { EnhanceableEquipment, EnhanceScroll, EnhanceResult, EnhanceHistory } from '@/types/enhance'
import { performEnhance, getEnhanceResultMessage } from '@/lib/enhance-utils'
import { EquipmentSelector } from './EquipmentSelector'
import { ScrollSelector } from './ScrollSelector'
import { EnhanceButton } from './EnhanceButton'
import { EnhanceHistoryList } from './EnhanceHistoryList'
import { EquipmentStatsDisplay } from './EquipmentStatsDisplay'
import { convertToEnhanceableEquipment } from '@/lib/enhance-utils'
import type { GachaItem, GachaResult } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

interface EnhanceWorkshopProps {
  preSelectedEquipmentId?: number
}

export function EnhanceWorkshop({ preSelectedEquipmentId }: EnhanceWorkshopProps = {}) {
  const { t, language } = useLanguage()
  const [selectedEquipment, setSelectedEquipment] = useState<EnhanceableEquipment | null>(null)
  const [selectedScroll, setSelectedScroll] = useState<EnhanceScroll | null>(null)
  const [enhanceHistory, setEnhanceHistory] = useState<EnhanceHistory[]>([])
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [gachaEquipment, setGachaEquipment] = useState<EnhanceableEquipment[]>([])

  // 載入從轉蛋抽到的裝備
  useEffect(() => {
    const savedResults = localStorage.getItem('gacha_equipment_results')
    if (savedResults) {
      try {
        const results = JSON.parse(savedResults)
        const equipment: EnhanceableEquipment[] = results
          .map(convertToEnhanceableEquipment)
          .filter((eq: EnhanceableEquipment | null) => eq !== null)
        setGachaEquipment(equipment)
      } catch (error) {
        console.error('Failed to load gacha equipment:', error)
      }
    }
  }, [])

  // 載入歷史記錄從 localStorage
  useEffect(() => {
    const saved = localStorage.getItem('enhance_history')
    if (saved) {
      try {
        const history = JSON.parse(saved)
        setEnhanceHistory(history)
      } catch (error) {
        console.error('Failed to load enhance history:', error)
      }
    }
  }, [])

  // 儲存歷史記錄到 localStorage
  useEffect(() => {
    if (enhanceHistory.length > 0) {
      localStorage.setItem('enhance_history', JSON.stringify(enhanceHistory))
    }
  }, [enhanceHistory])

  // 自動選擇預選裝備（從轉蛋機帶過來）
  useEffect(() => {
    if (preSelectedEquipmentId) {
      // 從 localStorage 讀取轉蛋裝備
      const saved = localStorage.getItem('gacha_equipment_results')
      if (saved) {
        try {
          const results = JSON.parse(saved)
          const targetItem = results.find((item: GachaItem) => item.itemId === preSelectedEquipmentId)

          if (targetItem) {
            const equipment = convertToEnhanceableEquipment(targetItem)
            if (equipment) {
              setSelectedEquipment(equipment)
              // 顯示提示
              toast.info(`已自動選擇：${equipment.chineseName}`)
            }
          }
        } catch (error) {
          console.error('Failed to load pre-selected equipment:', error)
        }
      }
    }
  }, [preSelectedEquipmentId])

  // 處理強化
  const handleEnhance = async () => {
    if (!selectedEquipment || !selectedScroll) return
    if (selectedEquipment.isDestroyed) return
    if (selectedEquipment.remainingUpgrades <= 0) return

    setIsEnhancing(true)

    // 模擬強化動畫延遲
    await new Promise(resolve => setTimeout(resolve, 800))

    // 執行強化邏輯
    const result: EnhanceResult = performEnhance(selectedEquipment, selectedScroll)

    // 更新裝備狀態
    setSelectedEquipment(result.equipment)

    // 同步更新 localStorage（強化成功或失敗時）
    if (result.type !== 'destroyed' && selectedEquipment.drawId) {
      try {
        const stored = localStorage.getItem('gacha_equipment_results')
        if (stored) {
          const equipments = JSON.parse(stored) as GachaResult[]
          const index = equipments.findIndex((eq) => eq.drawId === selectedEquipment.drawId)

          if (index !== -1) {
            // 更新裝備素質，保留其他抽獎資訊（drawId、randomStats 等）
            equipments[index] = {
              ...equipments[index],
              equipment: {
                ...equipments[index].equipment!,
                stats: result.equipment.currentStats
              }
            }
            localStorage.setItem('gacha_equipment_results', JSON.stringify(equipments))
          }
        }
      } catch (error) {
        console.error('Failed to sync equipment to localStorage:', error)
      }

      // 同步更新 gachaEquipment state
      setGachaEquipment(prev =>
        prev.map(eq =>
          eq.drawId === selectedEquipment.drawId
            ? result.equipment
            : eq
        )
      )
    }

    // 添加歷史記錄
    const historyEntry: EnhanceHistory = {
      id: `${Date.now()}-${Math.random()}`,
      equipmentName: result.equipment.itemName,
      equipmentChineseName: result.equipment.chineseName,
      scrollName: result.scroll.itemName,
      scrollChineseName: result.scroll.chineseName,
      result: result.type,
      timestamp: result.timestamp
    }
    setEnhanceHistory(prev => [historyEntry, ...prev].slice(0, 20)) // 只保留最近 20 條

    // 顯示結果通知
    const message = getEnhanceResultMessage(result, language)

    if (result.type === 'success') {
      toast.success(message)
    } else if (result.type === 'failed') {
      toast.warning(message)
    } else if (result.type === 'destroyed') {
      toast.error(message)

      // 從 localStorage 和 state 移除毀滅的裝備
      if (selectedEquipment) {
        try {
          // 更新 localStorage（使用 drawId 識別）
          const stored = localStorage.getItem('gacha_equipment_results')
          if (stored) {
            const equipments = JSON.parse(stored) as GachaResult[]
            // 使用 drawId 過濾（如果有），否則退回使用 itemId
            const filtered = equipments.filter((eq) =>
              selectedEquipment.drawId ? eq.drawId !== selectedEquipment.drawId : eq.itemId !== selectedEquipment.itemId
            )
            localStorage.setItem('gacha_equipment_results', JSON.stringify(filtered))
          }

          // 更新 state（觸發 UI 重新渲染）
          setGachaEquipment(prev => prev.filter(eq =>
            selectedEquipment.drawId ? eq.drawId !== selectedEquipment.drawId : eq.itemId !== selectedEquipment.itemId
          ))
        } catch (error) {
          console.error('Failed to remove destroyed equipment:', error)
        }
      }

      // 裝備毀滅後清除選擇
      setTimeout(() => {
        setSelectedEquipment(null)
        setSelectedScroll(null)
      }, 2000)
    }

    setIsEnhancing(false)
  }

  // 處理裝備選擇
  const handleEquipmentSelect = (equipment: EnhanceableEquipment | null) => {
    setSelectedEquipment(equipment)
    // 清除卷軸選擇，讓用戶重新選擇匹配的卷軸
    setSelectedScroll(null)
  }

  // 處理更新 gacha 裝備列表
  const handleUpdateGachaEquipment = (updatedEquipment: EnhanceableEquipment[]) => {
    setGachaEquipment(updatedEquipment)
  }

  // 檢查是否可以強化
  const canEnhance =
    selectedEquipment !== null &&
    selectedScroll !== null &&
    !selectedEquipment.isDestroyed &&
    selectedEquipment.remainingUpgrades > 0 &&
    !isEnhancing

  return (
    <div className="space-y-8">
      {/* 主要工作區 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左側：裝備選擇與展示 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('enhance.selectEquipment')}
          </h2>

          <EquipmentSelector
            selectedEquipment={selectedEquipment}
            onSelectEquipment={handleEquipmentSelect}
            gachaEquipment={gachaEquipment}
            onUpdateGachaEquipment={handleUpdateGachaEquipment}
          />

          {selectedEquipment && (
            <EquipmentStatsDisplay equipment={selectedEquipment} />
          )}
        </div>

        {/* 右側：卷軸選擇 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('enhance.selectScroll')}
          </h2>

          <ScrollSelector
            equipmentCategory={selectedEquipment?.category}
            selectedScroll={selectedScroll}
            onSelectScroll={setSelectedScroll}
            disabled={!selectedEquipment || selectedEquipment.isDestroyed}
          />
        </div>
      </div>

      {/* 強化按鈕 */}
      <div className="flex justify-center">
        <EnhanceButton
          canEnhance={canEnhance}
          isEnhancing={isEnhancing}
          onEnhance={handleEnhance}
        />
      </div>

      {/* 強化歷史記錄 */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('enhance.history')}
        </h2>
        <EnhanceHistoryList history={enhanceHistory} />
      </div>
    </div>
  )
}
