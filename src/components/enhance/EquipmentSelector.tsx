'use client'

import { useState, useEffect, useMemo } from 'react'
import type { EnhanceableEquipment, DroppedEquipment, MonsterInfo } from '@/types/enhance'
import type { DropItem } from '@/types'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { MonsterKillModal } from './MonsterKillModal'
import { MonsterDropResultModal } from './MonsterDropResultModal'

interface EquipmentSelectorProps {
  selectedEquipment: EnhanceableEquipment | null
  onSelectEquipment: (equipment: EnhanceableEquipment | null) => void
  gachaEquipment: EnhanceableEquipment[]
  onUpdateGachaEquipment: (equipment: EnhanceableEquipment[]) => void
}

type SourceMode = 'gacha' | 'monster-drop'

export function EquipmentSelector({
  selectedEquipment,
  onSelectEquipment,
  gachaEquipment,
  onUpdateGachaEquipment
}: EquipmentSelectorProps) {
  const { t, language } = useLanguage()
  const [sourceMode, setSourceMode] = useState<SourceMode>('gacha')
  const [monsterDropEquipment, setMonsterDropEquipment] = useState<DroppedEquipment[]>([])
  const [monsters, setMonsters] = useState<MonsterInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal state
  const [selectedMonster, setSelectedMonster] = useState<MonsterInfo | null>(null)
  const [isKillModalOpen, setIsKillModalOpen] = useState(false)
  const [isDropResultModalOpen, setIsDropResultModalOpen] = useState(false)
  const [droppedEquipments, setDroppedEquipments] = useState<DroppedEquipment[]>([])

  // 載入怪物掉落裝備 (from localStorage)
  useEffect(() => {
    const saved = localStorage.getItem('monster_drop_equipment_results')
    if (saved) {
      try {
        const equipments: DroppedEquipment[] = JSON.parse(saved)
        setMonsterDropEquipment(equipments)
      } catch (error) {
        console.error('Failed to load monster drop equipment:', error)
      }
    }
  }, [])

  // 載入怪物列表（簡化版：使用精選怪物）
  useEffect(() => {
    if (sourceMode === 'monster-drop' && monsters.length === 0) {
      loadMonsters()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceMode])

  const loadMonsters = async () => {
    setIsLoading(true)
    try {
      // 從 API 載入怪物資料 (drops essential data)
      const response = await fetch('/data/drops-essential.json')
      const dropsData: DropItem[] = await response.json()

      // 按怪物分組並建立 MonsterInfo
      const monsterMap = new Map<number, MonsterInfo>()

      dropsData.forEach(drop => {
        if (!monsterMap.has(drop.mobId)) {
          monsterMap.set(drop.mobId, {
            id: drop.mobId,
            name: drop.mobName,
            chineseName: drop.chineseMobName || drop.mobName,
            level: 0, // 簡化版：先設為 0，可以後續從怪物資料 API 取得
            drops: []
          })
        }
        monsterMap.get(drop.mobId)!.drops.push(drop)
      })

      // 只取有裝備掉落的怪物（至少有一個掉落物）
      const monstersWithEquipment = Array.from(monsterMap.values())
        .filter(monster => monster.drops.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name)) // 按名稱排序

      setMonsters(monstersWithEquipment)
    } catch (error) {
      console.error('Failed to load monsters:', error)
      toast.error('載入怪物資料失敗')
    } finally {
      setIsLoading(false)
    }
  }

  // 處理怪物點擊
  const handleMonsterClick = (monster: MonsterInfo) => {
    setSelectedMonster(monster)
    setIsKillModalOpen(true)
  }

  // 處理掉落結果
  const handleDropResult = (droppedEquips: DroppedEquipment[]) => {
    if (droppedEquips.length > 0) {
      setDroppedEquipments(droppedEquips)
      setIsDropResultModalOpen(true)
    } else {
      toast.info(t('enhance.noEquipmentDropped'))
    }
  }

  // 儲存掉落裝備
  const handleSaveDroppedEquipments = (equipmentsToSave: DroppedEquipment[]) => {
    try {
      // 合併到現有的怪物掉落裝備列表
      const updatedEquipment = [...monsterDropEquipment, ...equipmentsToSave]

      // 儲存到 localStorage
      localStorage.setItem('monster_drop_equipment_results', JSON.stringify(updatedEquipment))

      // 更新 state
      setMonsterDropEquipment(updatedEquipment)
    } catch (error) {
      console.error('Failed to save dropped equipments:', error)
      toast.error('儲存裝備失敗')
    }
  }

  // 移除裝備
  const handleRemoveEquipment = (equipment: EnhanceableEquipment, event: React.MouseEvent) => {
    event.stopPropagation() // 防止觸發父元素的 onClick

    try {
      if (sourceMode === 'gacha') {
        // 從轉蛋 localStorage 移除（使用 drawId 識別）
        const stored = localStorage.getItem('gacha_equipment_results')
        if (stored) {
          const equipments = JSON.parse(stored) as { itemId: number; drawId?: number }[]
          // 使用 drawId 過濾（如果有），否則退回使用 itemId
          const filtered = equipments.filter((eq) =>
            equipment.drawId ? eq.drawId !== equipment.drawId : eq.itemId !== equipment.itemId
          )
          localStorage.setItem('gacha_equipment_results', JSON.stringify(filtered))

          // 更新父元件 state
          const updatedGachaEquipment = gachaEquipment.filter(eq =>
            equipment.drawId ? eq.drawId !== equipment.drawId : eq.itemId !== equipment.itemId
          )
          onUpdateGachaEquipment(updatedGachaEquipment)
        }
      } else if (sourceMode === 'monster-drop') {
        // 從怪物掉落 localStorage 移除（使用 itemId）
        const stored = localStorage.getItem('monster_drop_equipment_results')
        if (stored) {
          const equipments = JSON.parse(stored) as DroppedEquipment[]
          const filtered = equipments.filter((eq) => eq.itemId !== equipment.itemId)
          localStorage.setItem('monster_drop_equipment_results', JSON.stringify(filtered))

          // 更新 state
          setMonsterDropEquipment(filtered)
        }
      }

      // 如果刪除的是當前選中的裝備，清除選擇
      const isSameEquipment = equipment.drawId
        ? selectedEquipment?.drawId === equipment.drawId
        : selectedEquipment?.itemId === equipment.itemId
      if (isSameEquipment) {
        onSelectEquipment(null)
      }

      toast.success(t('enhance.equipmentRemoved'))
    } catch (error) {
      console.error('Failed to remove equipment:', error)
      toast.error(t('enhance.removeEquipmentFailed'))
    }
  }

  // 當前顯示的裝備列表
  const currentEquipment = sourceMode === 'gacha' ? gachaEquipment : monsterDropEquipment

  // 搜尋和篩選 (裝備)
  const filteredEquipment = useMemo(() => {
    // 沒有搜尋時顯示全部
    if (!searchTerm) return currentEquipment

    const term = searchTerm.toLowerCase()
    return currentEquipment.filter(eq =>
      eq.itemName.toLowerCase().includes(term) ||
      eq.chineseName.toLowerCase().includes(term)
    )
  }, [currentEquipment, searchTerm])

  // 搜尋和篩選 (怪物)
  const filteredMonsters = useMemo(() => {
    if (!searchTerm) return monsters

    const term = searchTerm.toLowerCase()
    return monsters.filter(monster =>
      monster.name.toLowerCase().includes(term) ||
      monster.chineseName.toLowerCase().includes(term)
    )
  }, [monsters, searchTerm])

  return (
    <div className="space-y-4">
      {/* Tab 切換 */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            sourceMode === 'gacha'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
          onClick={() => setSourceMode('gacha')}
        >
          {t('enhance.fromGacha')} ({gachaEquipment.length}/10)
        </button>
        {/* 暫時停用怪物掉落功能 - 保留 Tab 結構以便未來擴充 */}
        {/* <button
          className={`px-4 py-2 font-medium transition-colors ${
            sourceMode === 'monster-drop'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
          onClick={() => setSourceMode('monster-drop')}
        >
          {t('enhance.fromMonsterDrop')}
          {monsterDropEquipment.length > 0 && ` (${monsterDropEquipment.length})`}
        </button> */}
      </div>

      {/* 搜尋框 */}
      <div>
        <input
          type="text"
          placeholder={t('enhance.searchEquipment')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 內容區域 */}
      {sourceMode === 'gacha' ? (
        /* 轉蛋裝備列表 */
        <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>
          ) : filteredEquipment.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {t('enhance.noEquipment')}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEquipment.map((equipment) => (
                <div
                  key={equipment.drawId || equipment.itemId}
                  onClick={() => onSelectEquipment(equipment)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectEquipment(equipment)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`w-full p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                    selectedEquipment?.drawId && equipment.drawId
                      ? selectedEquipment.drawId === equipment.drawId
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                      : selectedEquipment?.itemId === equipment.itemId
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {language === 'zh-TW' ? equipment.chineseName : equipment.itemName}
                        {equipment.enhanceCount > 0 && ` (+${equipment.enhanceCount})`}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {equipment.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {t('enhance.upgradesRemaining', { count: equipment.remainingUpgrades })}
                      </div>
                      <button
                        onClick={(e) => handleRemoveEquipment(equipment, e)}
                        className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label={t('enhance.removeEquipment')}
                        title={t('enhance.removeEquipment')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 怪物掉落模式 */
        <div className="space-y-4">
          {/* 怪物列表 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('enhance.selectMonster')}
            </h3>
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>
              ) : filteredMonsters.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  找不到符合的怪物
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-2">
                  {filteredMonsters.slice(0, 20).map((monster) => (
                    <button
                      key={monster.id}
                      onClick={() => handleMonsterClick(monster)}
                      className="p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {language === 'zh-TW' ? monster.chineseName : monster.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {monster.drops.length} 種掉落物
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 已獲得的裝備 */}
          {monsterDropEquipment.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t('enhance.obtainedEquipments')} ({monsterDropEquipment.length})
              </h3>
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredEquipment.map((equipment) => (
                    <div
                      key={equipment.itemId}
                      onClick={() => onSelectEquipment(equipment)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSelectEquipment(equipment)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={`w-full p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                        selectedEquipment?.itemId === equipment.itemId
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                            {language === 'zh-TW' ? equipment.chineseName : equipment.itemName}
                            {equipment.enhanceCount > 0 && ` (+${equipment.enhanceCount})`}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {equipment.category}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {t('enhance.upgradesRemaining', { count: equipment.remainingUpgrades })}
                          </div>
                          <button
                            onClick={(e) => handleRemoveEquipment(equipment, e)}
                            className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            aria-label={t('enhance.removeEquipment')}
                            title={t('enhance.removeEquipment')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedMonster && (
        <MonsterKillModal
          isOpen={isKillModalOpen}
          onClose={() => setIsKillModalOpen(false)}
          monster={selectedMonster}
          onDropResult={handleDropResult}
        />
      )}

      <MonsterDropResultModal
        isOpen={isDropResultModalOpen}
        onClose={() => setIsDropResultModalOpen(false)}
        droppedEquipments={droppedEquipments}
        onSave={handleSaveDroppedEquipments}
      />
    </div>
  )
}
