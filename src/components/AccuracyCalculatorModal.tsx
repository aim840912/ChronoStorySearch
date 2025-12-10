'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  calculatePhysicalAccuracy,
  calculateMagicAccuracy,
  type AccuracyResult,
} from '@/lib/accuracy-calculator'
import { useLazyMobInfo } from '@/hooks/useLazyData'
import {
  getAccuracyCalculatorState,
  setAccuracyCalculatorState,
} from '@/lib/storage'
import { MonsterSelector } from '@/components/accuracy/MonsterSelector'
import { AccuracyResult as AccuracyResultDisplay } from '@/components/accuracy/AccuracyResult'
import { useLanguage } from '@/contexts/LanguageContext'

interface AccuracyCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  initialMonsterId?: number | null
}

type CalculatorMode = 'physical' | 'magic'

/**
 * 命中率計算器 Modal（僅開發環境）
 * 根據 accurate.md 和 Magic Accuracy.md 的公式計算命中率
 */
export function AccuracyCalculatorModal({ isOpen, onClose, initialMonsterId }: AccuracyCalculatorModalProps) {
  const [mode, setMode] = useState<CalculatorMode>('physical')
  const [result, setResult] = useState<AccuracyResult | null>(null)

  // 使用統一的語言系統
  const { language, setLanguage, t: contextT } = useLanguage()

  // 怪物選擇
  const [selectedMobId, setSelectedMobId] = useState<number | null>(null)
  const [monsterSearchTerm, setMonsterSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // 物理命中輸入
  const [playerLevel, setPlayerLevel] = useState<number>(18)
  const [monsterLevel, setMonsterLevel] = useState<number>(21)
  const [monsterAvoid, setMonsterAvoid] = useState<number>(25)
  const [playerAccuracy, setPlayerAccuracy] = useState<number>(102)

  // 魔法命中額外輸入
  const [playerInt, setPlayerInt] = useState<number>(100)
  const [playerLuk, setPlayerLuk] = useState<number>(20)
  const [bonusAccuracy, setBonusAccuracy] = useState<number>(0)

  // 載入怪物資料
  const { data: mobInfoData, loadData: loadMobInfo } = useLazyMobInfo()

  // 翻譯函數（支援參數替換）
  const t = (key: string, params?: Record<string, string | number>): string => {
    let text: string = contextT(`accuracy.${key}`)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    return text
  }

  // 語言切換函數
  const toggleLanguage = () => {
    setLanguage(language === 'zh-TW' ? 'en' : 'zh-TW')
  }

  // 過濾並排序怪物列表
  const availableMonsters = useMemo(() => {
    if (!mobInfoData) return []

    // 過濾掉沒有等級或迴避的怪物
    return mobInfoData
      .filter((info) => {
        const hasValidData = info.mob.level !== null && info.mob.evasion !== null
        if (!hasValidData) return false

        // 搜尋過濾
        if (monsterSearchTerm) {
          const searchLower = monsterSearchTerm.toLowerCase()
          const mobName = info.mob.name?.toLowerCase() || ''
          const chineseName = info.chineseMobName?.toLowerCase() || ''
          return mobName.includes(searchLower) || chineseName.includes(searchLower)
        }
        return true
      })
      .sort((a, b) => (a.mob.level || 0) - (b.mob.level || 0))
  }, [mobInfoData, monsterSearchTerm])

  // 選中的怪物資訊
  const selectedMonster = useMemo(() => {
    if (!selectedMobId || !mobInfoData) return null
    return mobInfoData.find((info) => parseInt(info.mob.id, 10) === selectedMobId) || null
  }, [selectedMobId, mobInfoData])

  // 當選擇怪物時，自動填入等級和迴避
  useEffect(() => {
    if (selectedMonster) {
      if (selectedMonster.mob.level !== null) {
        setMonsterLevel(selectedMonster.mob.level)
      }
      if (selectedMonster.mob.evasion !== null) {
        setMonsterAvoid(selectedMonster.mob.evasion)
      }
    }
  }, [selectedMonster])

  // 當語言切換時，如果有選中怪物，更新搜尋框顯示的名稱
  useEffect(() => {
    if (selectedMonster) {
      const mobId = parseInt(selectedMonster.mob.id, 10)
      const displayName =
        language === 'zh-TW'
          ? selectedMonster.chineseMobName || selectedMonster.mob.name || `怪物 ${mobId}`
          : selectedMonster.mob.name || selectedMonster.chineseMobName || `Monster ${mobId}`
      setMonsterSearchTerm(displayName)
    }
  }, [language, selectedMonster])

  // 當 Modal 開啟時載入怪物資料
  useEffect(() => {
    if (isOpen) {
      loadMobInfo()
    }
  }, [isOpen, loadMobInfo])

  // 當 Modal 開啟時，從 localStorage 載入上次保存的狀態
  useEffect(() => {
    if (isOpen) {
      const savedState = getAccuracyCalculatorState()
      if (savedState) {
        setMode(savedState.mode)
        setPlayerLevel(savedState.playerLevel)
        setPlayerAccuracy(savedState.playerAccuracy)
        setPlayerInt(savedState.playerInt)
        setPlayerLuk(savedState.playerLuk)
        setBonusAccuracy(savedState.bonusAccuracy)
        if (savedState.selectedMobId !== null) {
          setSelectedMobId(savedState.selectedMobId)
        }
      }
    }
  }, [isOpen])

  // 當有初始怪物 ID 時，自動選擇該怪物
  useEffect(() => {
    if (isOpen && initialMonsterId && mobInfoData) {
      setSelectedMobId(initialMonsterId)
      // 清空結果以便重新計算
      setResult(null)
    }
  }, [isOpen, initialMonsterId, mobInfoData])

  // 當狀態變化時，自動保存到 localStorage
  useEffect(() => {
    if (isOpen) {
      setAccuracyCalculatorState({
        mode,
        playerLevel,
        playerAccuracy,
        playerInt,
        playerLuk,
        bonusAccuracy,
        selectedMobId,
      })
    }
  }, [mode, playerLevel, playerAccuracy, playerInt, playerLuk, bonusAccuracy, selectedMobId, isOpen])

  // ESC 鍵關閉 modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // 計算命中率
  const handleCalculate = () => {
    if (mode === 'physical') {
      const calculatedResult = calculatePhysicalAccuracy({
        playerLevel,
        monsterLevel,
        monsterAvoid,
        playerAccuracy,
      })
      setResult(calculatedResult)
    } else {
      const calculatedResult = calculateMagicAccuracy({
        playerLevel,
        monsterLevel,
        monsterAvoid,
        playerInt,
        playerLuk,
        bonusAccuracy,
      })
      setResult(calculatedResult)
    }
  }

  // 怪物選擇器回調
  const handleSelectMonster = (mobId: number, displayName: string) => {
    setSelectedMobId(mobId)
    setMonsterSearchTerm(displayName)
  }

  const handleClearSelection = () => {
    setSelectedMobId(null)
    setMonsterSearchTerm('')
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-blue-500 dark:bg-blue-600 p-4 sm:p-6 rounded-t-xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            {/* 左側：佔位 */}
            <div className="flex-1"></div>

            {/* 中間：標題區域 */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="6" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="2" fill="currentColor"/>
                </svg>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{t('title')}</h2>
              </div>
              <p className="text-blue-100 text-xs sm:text-sm">{t('subtitle')}</p>
            </div>

            {/* 右側：按鈕群組 */}
            <div className="flex-1 flex items-center gap-2 justify-end">
              {/* 翻譯按鈕 */}
              <button
                onClick={toggleLanguage}
                className="p-3 min-h-[44px] min-w-[44px] rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30 flex items-center justify-center"
                aria-label="切換語言"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              {/* 關閉按鈕 */}
              <button
                onClick={onClose}
                className="p-3 min-h-[44px] min-w-[44px] text-white hover:bg-white/20 rounded-full transition-colors flex items-center justify-center"
                aria-label="關閉"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* 模式切換 */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => {
                setMode('physical')
                setResult(null)
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'physical'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21l7.5-7.5m0 0l4.5-4.5m-4.5 4.5L21 3M6 18h.01M9 15h.01" />
              </svg>
              {t('physical')}
            </button>
            <button
              onClick={() => {
                setMode('magic')
                setResult(null)
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'magic'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 12l8-5-8-5v10z" />
              </svg>
              {t('magic')}
            </button>
          </div>

          {/* 輸入欄位 */}
          <div className="space-y-4 mb-6">
            {/* 怪物選擇器 */}
            <MonsterSelector
              availableMonsters={availableMonsters}
              selectedMobId={selectedMobId}
              monsterSearchTerm={monsterSearchTerm}
              isDropdownOpen={isDropdownOpen}
              monsterLevel={monsterLevel}
              monsterAvoid={monsterAvoid}
              language={language}
              onSearchTermChange={setMonsterSearchTerm}
              onSelectMonster={handleSelectMonster}
              onClearSelection={handleClearSelection}
              onDropdownOpenChange={setIsDropdownOpen}
              t={t as (key: string, params?: Record<string, string | number>) => string}
            />

            {/* 物理命中專屬 */}
            {mode === 'physical' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('playerLevel')}
                  </label>
                  <input
                    type="number"
                    value={playerLevel}
                    onChange={(e) => setPlayerLevel(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('playerAccuracy')}
                  </label>
                  <input
                    type="number"
                    value={playerAccuracy}
                    onChange={(e) => setPlayerAccuracy(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* 魔法命中專屬 */}
            {mode === 'magic' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('playerLevel')}
                  </label>
                  <input
                    type="number"
                    value={playerLevel}
                    onChange={(e) => setPlayerLevel(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('bonusAccuracy')}
                  </label>
                  <input
                    type="number"
                    value={bonusAccuracy}
                    onChange={(e) => setBonusAccuracy(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    INT
                  </label>
                  <input
                    type="number"
                    value={playerInt}
                    onChange={(e) => setPlayerInt(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    LUK
                  </label>
                  <input
                    type="number"
                    value={playerLuk}
                    onChange={(e) => setPlayerLuk(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 計算按鈕 */}
          <button
            onClick={handleCalculate}
            disabled={!selectedMobId}
            className={`w-full py-3 text-white font-bold rounded-lg shadow-lg transition-all mb-6 flex items-center justify-center gap-2 ${
              selectedMobId
                ? 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-60'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h8M8 12h8M8 16h8" />
            </svg>
            {t('calculate')}
          </button>

          {/* 結果顯示 */}
          {result && (
            <AccuracyResultDisplay
              result={result}
              mode={mode}
              playerInt={playerInt}
              playerLuk={playerLuk}
              bonusAccuracy={bonusAccuracy}
              monsterLevel={monsterLevel}
              playerLevel={playerLevel}
              t={t as (key: string, params?: Record<string, string | number>) => string}
            />
          )}

          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="w-full mt-6 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}
