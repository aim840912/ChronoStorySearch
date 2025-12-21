'use client'

import { memo, useState, useMemo, useEffect, useRef } from 'react'
import type { SaveExpFormProps } from '@/types/exp-tracker'
import { formatExp } from '@/lib/exp-calculator'
import { useLazyMobInfo } from '@/hooks/useLazyData'
import { useLanguage } from '@/contexts/LanguageContext'

/** 預設分鐘選項 */
const MINUTE_OPTIONS = [1, 5, 10, 15, 30, 60]

/** 最大顯示結果數量 */
const MAX_RESULTS = 10

/**
 * 經驗儲存表單
 * 輸入怪物名稱和分鐘數，自動計算總經驗
 */
export const SaveExpForm = memo(function SaveExpForm({
  expPerMinute,
  editingRecord,
  onSave,
  onUpdate,
  onCancelEdit,
  t,
}: SaveExpFormProps) {
  const { language } = useLanguage()
  const [monsterName, setMonsterName] = useState('')
  const [minutes, setMinutes] = useState(30)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [manualTotalExp, setManualTotalExp] = useState<number | null>(null)
  const [totalExpInput, setTotalExpInput] = useState('')
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
      setMinutes(editingRecord.minutes)
      setManualTotalExp(editingRecord.totalExp)
      setTotalExpInput(String(editingRecord.totalExp))
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

  // 自動計算的總經驗
  const autoTotalExp = useMemo(() => expPerMinute * minutes, [expPerMinute, minutes])

  // 實際使用的總經驗（手動輸入優先）
  const actualTotalExp = manualTotalExp ?? autoTotalExp

  const handleSelectMonster = (displayName: string) => {
    setMonsterName(displayName)
    setIsDropdownOpen(false)
  }

  const handleTotalExpChange = (value: string) => {
    setTotalExpInput(value)
    const parsed = parseInt(value.replace(/,/g, ''), 10)
    if (!isNaN(parsed) && parsed > 0) {
      setManualTotalExp(parsed)
    } else if (value === '') {
      setManualTotalExp(null)
    }
  }

  const handleResetTotalExp = () => {
    setManualTotalExp(null)
    setTotalExpInput('')
  }

  const clearForm = () => {
    setMonsterName('')
    setMinutes(30)
    setManualTotalExp(null)
    setTotalExpInput('')
  }

  const handleSave = () => {
    if (!monsterName.trim() || actualTotalExp <= 0) return

    if (isEditing && editingRecord) {
      // 更新現有記錄
      onUpdate({
        ...editingRecord,
        monsterName: monsterName.trim(),
        minutes,
        expPerMinute,
        totalExp: actualTotalExp,
      })
    } else {
      // 新增記錄
      onSave({
        monsterName: monsterName.trim(),
        minutes,
        expPerMinute,
        totalExp: actualTotalExp,
      })
    }

    clearForm()
  }

  const handleCancel = () => {
    clearForm()
    onCancelEdit()
  }

  // 可儲存條件：有怪物名稱且有總經驗（自動或手動）
  const isDisabled = !monsterName.trim() || actualTotalExp <= 0

  return (
    <div className={`p-4 rounded-lg space-y-3 ${isEditing ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
      <div className="flex items-center justify-between">
        <h4 className={`text-sm font-medium ${isEditing ? 'text-yellow-700 dark:text-yellow-300' : 'text-blue-700 dark:text-blue-300'}`}>
          {isEditing ? t('editRecord') : t('saveRecord')}
        </h4>
        {isEditing && (
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {t('cancelEdit')}
          </button>
        )}
      </div>

      {/* 表單輸入區 - 桌面版三欄同一列 */}
      <div className="space-y-3 md:space-y-0 md:flex md:items-end md:gap-3">
        {/* 怪物名稱（自動完成） */}
        <div className="md:flex-1">
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
                placeholder={t('enterMonsterName')}
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
                      onClick={() => handleSelectMonster(displayName)}
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

        {/* 分鐘數選擇 */}
        <div className="md:w-28">
          <label
            htmlFor="minutes"
            className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
          >
            {t('minutes')}
          </label>
          <select
            id="minutes"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {MINUTE_OPTIONS.map((min) => (
              <option key={min} value={min}>
                {min} {t('minuteUnit')}
              </option>
            ))}
          </select>
        </div>

        {/* 儲存/更新按鈕 */}
        <button
          onClick={handleSave}
          disabled={isDisabled}
          className={`w-full md:w-auto py-2 px-4 md:px-6 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white ${
            isEditing
              ? 'bg-yellow-500 hover:bg-yellow-600'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isEditing ? t('update') : t('save')}
        </button>
      </div>

      {/* 總經驗輸入（可手動或自動計算）- 垂直佈局節省空間 */}
      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg space-y-1">
        <label
          htmlFor="total-exp"
          className="block text-xs text-gray-600 dark:text-gray-400"
        >
          {t('totalExp')}
        </label>
        <div className="flex items-center gap-2">
          <input
            id="total-exp"
            type="text"
            value={manualTotalExp !== null ? totalExpInput : (autoTotalExp > 0 ? formatExp(autoTotalExp) : '')}
            onChange={(e) => handleTotalExpChange(e.target.value)}
            placeholder={autoTotalExp > 0 ? formatExp(autoTotalExp) : '--'}
            className="flex-1 min-w-0 px-3 py-1.5 text-right text-base font-bold font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {manualTotalExp !== null && (
            <button
              type="button"
              onClick={handleResetTotalExp}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              title={t('resetToAuto')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
