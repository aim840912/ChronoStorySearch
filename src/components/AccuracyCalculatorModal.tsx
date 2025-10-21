'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import {
  calculatePhysicalAccuracy,
  calculateMagicAccuracy,
  type AccuracyResult,
} from '@/lib/accuracy-calculator'
import { useLazyMobInfo } from '@/hooks/useLazyData'

interface AccuracyCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
}

type CalculatorMode = 'physical' | 'magic'

// 翻譯資料
const translations = {
  'zh-TW': {
    title: '命中率計算器',
    subtitle: '不確定公式有沒有錯',
    physical: '物理命中',
    magic: '魔法命中',
    playerLevel: '玩家等級',
    selectMonster: '選擇怪物',
    clearSelection: '清除選擇',
    searchPlaceholder: '搜尋怪物名稱...',
    calculate: '計算命中率',
    close: '關閉',
    result: '計算結果',
    requiredAccuracy: '需求命中',
    actualAccuracy: '實際命中',
    hit: '命中',
    miss: 'Miss',
    willMiss: '會 MISS！',
    wontMiss: '不會 MISS！',
    foundMonsters: '找到 {count} 個怪物',
    selectOption: '-- 請選擇怪物 --',
    playerAccuracy: '玩家命中',
    bonusAccuracy: '額外命中',
    level: '等級',
    avoid: '迴避',
    physicalMissHint: '物理攻擊無法命中，需要至少 {required} 命中',
    magicMissHint: '魔法攻擊命中率為 {rate}%，建議提升至 {required} 命中以達到 100%',
  },
  en: {
    title: 'Accuracy Calculator',
    subtitle: 'Formula accuracy not guaranteed',
    physical: 'Physical Accuracy',
    magic: 'Magic Accuracy',
    playerLevel: 'Player Level',
    selectMonster: 'Select Monster',
    clearSelection: 'Clear Selection',
    searchPlaceholder: 'Search monster name...',
    calculate: 'Calculate Accuracy',
    close: 'Close',
    result: 'Result',
    requiredAccuracy: 'Required Accuracy',
    actualAccuracy: 'Actual Accuracy',
    hit: 'Hit',
    miss: 'Miss',
    willMiss: 'Will Miss!',
    wontMiss: "Won't Miss!",
    foundMonsters: 'Found {count} monsters',
    selectOption: '-- Select a monster --',
    playerAccuracy: 'Player Accuracy',
    bonusAccuracy: 'Bonus Accuracy',
    level: 'Level',
    avoid: 'Avoid',
    physicalMissHint: 'Physical attack will miss, need at least {required} accuracy',
    magicMissHint: 'Magic attack hit rate is {rate}%, recommend reaching {required} accuracy for 100%',
  },
} as const

/**
 * 命中率計算器 Modal（僅開發環境）
 * 根據 accurate.md 和 Magic Accuracy.md 的公式計算命中率
 */
export function AccuracyCalculatorModal({ isOpen, onClose }: AccuracyCalculatorModalProps) {
  const [mode, setMode] = useState<CalculatorMode>('physical')
  const [result, setResult] = useState<AccuracyResult | null>(null)
  const [language, setLanguage] = useState<'zh-TW' | 'en'>('zh-TW')

  // 怪物選擇
  const [selectedMobId, setSelectedMobId] = useState<number | null>(null)
  const [monsterSearchTerm, setMonsterSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // 翻譯函數
  const t = (key: keyof typeof translations['zh-TW'], params?: Record<string, string | number>): string => {
    let text: string = translations[language][key]
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    return text
  }

  // 語言切換函數
  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'zh-TW' ? 'en' : 'zh-TW'))
  }

  // 過濾並排序怪物列表
  const availableMonsters = useMemo(() => {
    if (!mobInfoData) return []

    // 過濾掉沒有等級或迴避的怪物
    return mobInfoData
      .filter((info) => {
        const hasValidData = info.mob.level !== null && info.mob.avoid !== null
        if (!hasValidData) return false

        // 搜尋過濾
        if (monsterSearchTerm) {
          const searchLower = monsterSearchTerm.toLowerCase()
          const mobName = info.mob.mob_name?.toLowerCase() || ''
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
    return mobInfoData.find((info) => parseInt(info.mob.mob_id, 10) === selectedMobId) || null
  }, [selectedMobId, mobInfoData])

  // 當選擇怪物時，自動填入等級和迴避
  useEffect(() => {
    if (selectedMonster) {
      if (selectedMonster.mob.level !== null) {
        setMonsterLevel(selectedMonster.mob.level)
      }
      if (selectedMonster.mob.avoid !== null) {
        setMonsterAvoid(selectedMonster.mob.avoid)
      }
    }
  }, [selectedMonster])

  // 當語言切換時，如果有選中怪物，更新搜尋框顯示的名稱
  useEffect(() => {
    if (selectedMonster) {
      const mobId = parseInt(selectedMonster.mob.mob_id, 10)
      const displayName =
        language === 'zh-TW'
          ? selectedMonster.chineseMobName || selectedMonster.mob.mob_name || `怪物 ${mobId}`
          : selectedMonster.mob.mob_name || selectedMonster.chineseMobName || `Monster ${mobId}`
      setMonsterSearchTerm(displayName)
    }
  }, [language, selectedMonster])

  // 當 Modal 開啟時載入怪物資料
  useEffect(() => {
    if (isOpen) {
      loadMobInfo()
    }
  }, [isOpen, loadMobInfo])

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
        <div className="bg-blue-500 dark:bg-blue-600 p-6 rounded-t-xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                <circle cx="12" cy="12" r="6" strokeWidth="2"/>
                <circle cx="12" cy="12" r="2" fill="currentColor"/>
              </svg>
              <div>
                <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
                <p className="text-blue-100 text-sm mt-1">{t('subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 翻譯按鈕 */}
              <button
                onClick={toggleLanguage}
                className="p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30"
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
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="關閉"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('selectMonster')}
                </label>
                {selectedMobId && (
                  <button
                    onClick={() => {
                      setSelectedMobId(null)
                      setMonsterSearchTerm('')
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('clearSelection')}
                  </button>
                )}
              </div>

              {/* 搜尋框 + 自動完成下拉選單 */}
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={monsterSearchTerm}
                    onChange={(e) => {
                      setMonsterSearchTerm(e.target.value)
                      setIsDropdownOpen(true)
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder={t('searchPlaceholder')}
                    className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <svg
                    className="absolute left-3 top-3 w-4 h-4 text-gray-400"
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

                {/* 過濾結果數量提示 */}
                {monsterSearchTerm && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                    {t('foundMonsters', { count: availableMonsters.length })}
                  </div>
                )}

                {/* 自動完成下拉選單 */}
                {isDropdownOpen && availableMonsters.length > 0 && (
                  <div className="absolute w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-20">
                    {availableMonsters.map((info) => {
                      const mobId = parseInt(info.mob.mob_id, 10)
                      const displayName =
                        language === 'zh-TW'
                          ? info.chineseMobName || info.mob.mob_name || `怪物 ${mobId}`
                          : info.mob.mob_name || info.chineseMobName || `Monster ${mobId}`
                      const level = info.mob.level
                      const avoid = info.mob.avoid
                      const isSelected = selectedMobId === mobId

                      return (
                        <button
                          key={mobId}
                          type="button"
                          onClick={() => {
                            setSelectedMobId(mobId)
                            setMonsterSearchTerm(displayName)
                            setIsDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${
                            isSelected
                              ? 'bg-blue-100 dark:bg-blue-900/50'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-gray-900 dark:text-white">{displayName}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Lv.{level}, {t('avoid')}:{avoid}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 顯示選中怪物的等級和迴避 */}
              {selectedMonster && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('level')}:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{monsterLevel}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-600 dark:text-gray-400">{t('avoid')}:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{monsterAvoid}</span>
                  </div>
                </div>
              )}
            </div>

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
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {t('result')}
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-600 rounded-lg">
                  <span className="text-gray-700 dark:text-gray-300">{t('requiredAccuracy')}：</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {result.requiredAccuracy}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-600 rounded-lg">
                  <span className="text-gray-700 dark:text-gray-300">{t('actualAccuracy')}：</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {result.actualAccuracy}
                  </span>
                </div>

                {/* 命中/Miss 百分比對比顯示 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* 命中率 */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border-2 border-green-300 dark:border-green-700">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">{t('hit')}</span>
                    </div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {result.hitRate.toFixed(2)}%
                    </div>
                  </div>

                  {/* Miss 率 */}
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border-2 border-red-300 dark:border-red-700">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">{t('miss')}</span>
                    </div>
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {(100 - result.hitRate).toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Miss 警告 */}
                <div
                  className={`p-4 rounded-lg border-2 ${
                    result.willMiss
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                      : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.willMiss ? (
                      <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <div>
                      <p
                        className={`font-bold ${
                          result.willMiss
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-green-700 dark:text-green-300'
                        }`}
                      >
                        {result.willMiss ? t('willMiss') : t('wontMiss')}
                      </p>
                      {result.willMiss && mode === 'physical' && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {t('physicalMissHint', { required: result.requiredAccuracy })}
                        </p>
                      )}
                      {result.willMiss && mode === 'magic' && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {t('magicMissHint', { rate: result.hitRate.toFixed(2), required: result.requiredAccuracy })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 公式說明（僅魔法命中顯示） */}
              {mode === 'magic' && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    法師命中 = floor(INT/10) + floor(LUK/10) + floor(額外命中/5)
                    <br />
                    = floor({playerInt}/10) + floor({playerLuk}/10) + floor({bonusAccuracy}/5)
                    <br />= {result.actualAccuracy}
                    <br />
                    <br />
                    需求命中 = (怪物迴避 + 1) × (1 + 0.0415 × D)
                    <br />D = max(0, 怪物等級 - 玩家等級) = {Math.max(0, monsterLevel - playerLevel)}
                    <br />= {result.requiredAccuracy}
                  </p>
                </div>
              )}
            </div>
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
