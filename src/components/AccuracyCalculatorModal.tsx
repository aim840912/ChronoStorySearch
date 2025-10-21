'use client'

import { useEffect, useState, useMemo } from 'react'
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

/**
 * 命中率計算器 Modal（僅開發環境）
 * 根據 accurate.md 和 Magic Accuracy.md 的公式計算命中率
 */
export function AccuracyCalculatorModal({ isOpen, onClose }: AccuracyCalculatorModalProps) {
  const [mode, setMode] = useState<CalculatorMode>('physical')
  const [result, setResult] = useState<AccuracyResult | null>(null)

  // 怪物選擇
  const [selectedMobId, setSelectedMobId] = useState<number | null>(null)
  const [monsterSearchTerm, setMonsterSearchTerm] = useState('')

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

  // 當 Modal 開啟時載入怪物資料
  useEffect(() => {
    if (isOpen) {
      loadMobInfo()
    }
  }, [isOpen, loadMobInfo])

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
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 p-6 rounded-t-xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🎯</div>
              <div>
                <h2 className="text-2xl font-bold text-white">命中率計算器</h2>
                <p className="text-blue-100 text-sm mt-1">開發環境專用工具</p>
              </div>
            </div>
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

        {/* Modal Content */}
        <div className="p-6">
          {/* 模式切換 */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => {
                setMode('physical')
                setResult(null)
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                mode === 'physical'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              ⚔️ 物理命中
            </button>
            <button
              onClick={() => {
                setMode('magic')
                setResult(null)
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                mode === 'magic'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              ✨ 魔法命中
            </button>
          </div>

          {/* 輸入欄位 */}
          <div className="space-y-4 mb-6">
            {/* 玩家等級 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                玩家等級
              </label>
              <input
                type="number"
                value={playerLevel}
                onChange={(e) => setPlayerLevel(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 怪物選擇器 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  選擇怪物
                </label>
                {selectedMobId && (
                  <button
                    onClick={() => {
                      setSelectedMobId(null)
                      setMonsterSearchTerm('')
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    清除選擇
                  </button>
                )}
              </div>

              {/* 搜尋框 */}
              <div className="relative mb-2">
                <input
                  type="text"
                  value={monsterSearchTerm}
                  onChange={(e) => setMonsterSearchTerm(e.target.value)}
                  placeholder="搜尋怪物名稱..."
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

              {/* 怪物下拉選單 */}
              <select
                value={selectedMobId || ''}
                onChange={(e) => setSelectedMobId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- 請選擇怪物 --</option>
                {availableMonsters.map((info) => {
                  const mobId = parseInt(info.mob.mob_id, 10)
                  const displayName = info.chineseMobName || info.mob.mob_name || `怪物 ${mobId}`
                  const level = info.mob.level
                  const avoid = info.mob.avoid
                  return (
                    <option key={mobId} value={mobId}>
                      {displayName} (Lv.{level}, 迴避:{avoid})
                    </option>
                  )
                })}
              </select>

              {/* 顯示選中怪物的等級和迴避 */}
              {selectedMonster && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">等級:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{monsterLevel}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-600 dark:text-gray-400">迴避:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{monsterAvoid}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 物理命中專屬 */}
            {mode === 'physical' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  玩家命中
                </label>
                <input
                  type="number"
                  value={playerAccuracy}
                  onChange={(e) => setPlayerAccuracy(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* 魔法命中專屬 */}
            {mode === 'magic' && (
              <div className="grid grid-cols-3 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    額外命中
                  </label>
                  <input
                    type="number"
                    value={bonusAccuracy}
                    onChange={(e) => setBonusAccuracy(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 計算按鈕 */}
          <button
            onClick={handleCalculate}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-lg shadow-lg transition-all mb-6"
          >
            🧮 計算命中率
          </button>

          {/* 結果顯示 */}
          {result && (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                📊 計算結果
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-600 rounded-lg">
                  <span className="text-gray-700 dark:text-gray-300">需求命中：</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {result.requiredAccuracy}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-600 rounded-lg">
                  <span className="text-gray-700 dark:text-gray-300">實際命中：</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {result.actualAccuracy}
                  </span>
                </div>

                {/* 命中/Miss 百分比對比顯示 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* 命中率 */}
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-lg border-2 border-green-300 dark:border-green-700">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">✅</span>
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">命中</span>
                    </div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {result.hitRate.toFixed(2)}%
                    </div>
                  </div>

                  {/* Miss 率 */}
                  <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 rounded-lg border-2 border-red-300 dark:border-red-700">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">❌</span>
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">Miss</span>
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
                    <span className="text-3xl">{result.willMiss ? '❌' : '✅'}</span>
                    <div>
                      <p
                        className={`font-bold ${
                          result.willMiss
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-green-700 dark:text-green-300'
                        }`}
                      >
                        {result.willMiss ? '會 MISS！' : '不會 MISS！'}
                      </p>
                      {result.willMiss && mode === 'physical' && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          物理攻擊無法命中，需要至少 {result.requiredAccuracy} 命中
                        </p>
                      )}
                      {result.willMiss && mode === 'magic' && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          魔法攻擊命中率為 {result.hitRate.toFixed(2)}%，建議提升至 {result.requiredAccuracy} 命中以達到 100%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 公式說明 */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  {mode === 'physical' ? (
                    <>
                      需求命中 = (怪物等級 - 玩家等級) / 7.5 + 3.67 × 怪物迴避
                      <br />
                      = ({monsterLevel} - {playerLevel}) / 7.5 + 3.67 × {monsterAvoid}
                      <br />= {result.requiredAccuracy}
                    </>
                  ) : (
                    <>
                      法師命中 = floor(INT/10) + floor(LUK/10) + floor(額外命中/5)
                      <br />
                      = floor({playerInt}/10) + floor({playerLuk}/10) + floor({bonusAccuracy}/5)
                      <br />= {result.actualAccuracy}
                      <br />
                      <br />
                      需求命中 = (怪物迴避 + 1) × (1 + 0.0415 × D)
                      <br />D = max(0, 怪物等級 - 玩家等級) = {Math.max(0, monsterLevel - playerLevel)}
                      <br />= {result.requiredAccuracy}
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="w-full mt-6 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}
