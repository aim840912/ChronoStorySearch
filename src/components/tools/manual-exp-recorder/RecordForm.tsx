'use client'

import { memo, useState, useMemo, useEffect, useRef } from 'react'
import type { RecordFormProps } from '@/types/manual-exp-record'
import { useLazyMobInfo } from '@/hooks/useLazyData'
import { useLanguage } from '@/contexts/LanguageContext'

/** 最大顯示結果數量 */
const MAX_RESULTS = 10

/**
 * 經驗記錄表單
 * 輸入怪物名稱和每小時經驗量
 */
export const RecordForm = memo(function RecordForm({
  editingRecord,
  onSave,
  onUpdate,
  onCancelEdit,
  t,
}: RecordFormProps) {
  const { language } = useLanguage()
  const [monsterName, setMonsterName] = useState('')
  const [selectedMobId, setSelectedMobId] = useState<number | null>(null)
  const [expPerHour, setExpPerHour] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isEditing = editingRecord !== null

  // 載入怪物資料
  const { data: mobInfoData, loadData } = useLazyMobInfo()

  useEffect(() => {
    loadData()
  }, [loadData])

  // 編輯模式：載入記錄資料
  useEffect(() => {
    if (editingRecord) {
      setMonsterName(editingRecord.monsterName)
      setSelectedMobId(editingRecord.mobId ?? null)
      setExpPerHour(formatNumberInput(editingRecord.expPerHour))
    }
  }, [editingRecord])

  // 過濾怪物（搜尋中英文名稱）
  const filteredMonsters = useMemo(() => {
    if (!mobInfoData || !monsterName.trim()) return []

    const searchLower = monsterName.toLowerCase()
    return mobInfoData
      .filter((info) => {
        const mobName = info.mob.name?.toLowerCase() || ''
        const chineseName = info.chineseMobName?.toLowerCase() || ''
        return mobName.includes(searchLower) || chineseName.includes(searchLower)
      })
      .slice(0, MAX_RESULTS)
  }, [mobInfoData, monsterName])

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleSelectMonster = (displayName: string, mobId: number) => {
    setMonsterName(displayName)
    setSelectedMobId(mobId)
    setIsDropdownOpen(false)
  }

  // 格式化數字輸入（加入千分位）
  const formatNumberInput = (value: number): string => {
    return value.toLocaleString()
  }

  // 解析數字輸入（移除千分位）
  const parseNumberInput = (value: string): number => {
    const parsed = parseInt(value.replace(/,/g, ''), 10)
    return isNaN(parsed) ? 0 : parsed
  }

  const handleExpChange = (value: string) => {
    // 移除非數字和逗號的字符
    const cleaned = value.replace(/[^\d,]/g, '')
    setExpPerHour(cleaned)
  }

  const clearForm = () => {
    setMonsterName('')
    setSelectedMobId(null)
    setExpPerHour('')
  }

  const handleSave = () => {
    const expValue = parseNumberInput(expPerHour)
    if (!monsterName.trim() || expValue <= 0) return

    if (isEditing && editingRecord) {
      // 更新現有記錄
      onUpdate({
        ...editingRecord,
        monsterName: monsterName.trim(),
        mobId: selectedMobId ?? undefined,
        expPerHour: expValue,
        updatedAt: Date.now(),
      })
    } else {
      // 新增記錄
      onSave({
        monsterName: monsterName.trim(),
        mobId: selectedMobId ?? undefined,
        expPerHour: expValue,
      })
    }

    clearForm()
  }

  const handleCancel = () => {
    clearForm()
    onCancelEdit()
  }

  // 可儲存條件：有怪物名稱且有經驗值
  const isDisabled = !monsterName.trim() || parseNumberInput(expPerHour) <= 0

  return (
    <div className={`p-4 rounded-lg space-y-3 ${isEditing ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
      <div className="flex items-center justify-between">
        <h4 className={`text-sm font-medium ${isEditing ? 'text-yellow-700 dark:text-yellow-300' : 'text-blue-700 dark:text-blue-300'}`}>
          {isEditing ? t('editRecord') : t('addRecord')}
        </h4>
        {isEditing && (
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {t('cancel')}
          </button>
        )}
      </div>

      {/* 表單輸入區 */}
      <div className="space-y-3">
        {/* 怪物名稱（自動完成） */}
        <div>
          <label
            htmlFor="monster-name"
            className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
          >
            {t('monsterName')}
          </label>
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <input
                id="monster-name"
                type="text"
                value={monsterName}
                onChange={(e) => {
                  setMonsterName(e.target.value)
                  setIsDropdownOpen(true)
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder={t('searchMonster')}
                className="w-full px-3 py-2 pl-9 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* 自動完成下拉選單 */}
            {isDropdownOpen && filteredMonsters.length > 0 && (
              <div className="absolute w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-20">
                {filteredMonsters.map((info) => {
                  const mobId = parseInt(info.mob.id, 10)
                  const displayName =
                    language === 'zh-TW'
                      ? info.chineseMobName || info.mob.name || `怪物 ${mobId}`
                      : info.mob.name || info.chineseMobName || `Monster ${mobId}`
                  const level = info.mob.level

                  return (
                    <button
                      key={mobId}
                      type="button"
                      onClick={() => handleSelectMonster(displayName, mobId)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 dark:text-white">{displayName}</span>
                        {level !== null && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Lv.{level}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 每小時經驗量 */}
        <div>
          <label
            htmlFor="exp-per-hour"
            className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
          >
            {t('expPerHour')}
          </label>
          <input
            id="exp-per-hour"
            type="text"
            inputMode="numeric"
            value={expPerHour}
            onChange={(e) => handleExpChange(e.target.value)}
            placeholder="1,234,567"
            className="w-full px-3 py-2 text-sm text-right font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 儲存/更新按鈕 */}
        <button
          onClick={handleSave}
          disabled={isDisabled}
          className={`w-full py-2 px-4 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white ${
            isEditing
              ? 'bg-yellow-500 hover:bg-yellow-600'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isEditing ? t('update') : t('save')}
        </button>
      </div>
    </div>
  )
})
