'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
import { useDraggable } from '@/hooks/useDraggable'
import { useResizable } from '@/hooks/useResizable'
import { useAccuracyCalculatorUI } from '@/hooks/useAccuracyCalculatorUI'

interface AccuracyCalculatorFloatingProps {
  isOpen: boolean
  onClose: () => void
  initialMonsterId?: number | null
}

type CalculatorMode = 'physical' | 'magic'

/**
 * 命中率計算器 - 懸浮視窗版
 * 可拖曳、可最小化的懸浮視窗
 */
export function AccuracyCalculatorFloating({
  isOpen,
  onClose,
  initialMonsterId,
}: AccuracyCalculatorFloatingProps) {
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

  // 計算初始位置（小螢幕居中，大螢幕靠右）
  const getInitialPosition = () => {
    if (typeof window === 'undefined') return { x: 20, y: 80 }

    const isMobile = window.innerWidth < 640
    if (isMobile) {
      // 小螢幕：左邊留 8px 邊距
      return { x: 8, y: 80 }
    }
    // 大螢幕：靠右
    return { x: window.innerWidth - 420, y: 80 }
  }

  // 拖曳功能
  const { position, isDragging, setPosition, dragHandlers } = useDraggable({
    initialPosition: getInitialPosition(),
  })

  // 調整大小功能（展開狀態）
  const resizable = useResizable({
    initialSize: { width: 400, height: 500 },
    minSize: { width: 320, height: 300 },
    maxSize: { width: 600, height: 800 },
    enabled: true,
    onPositionChange: ({ dx, dy }) => {
      setPosition({ x: position.x + dx, y: position.y + dy })
    },
  })

  // UI 狀態管理 Hook（簡化版，無最小化功能）
  const ui = useAccuracyCalculatorUI({
    isOpen,
    position,
    onPositionChange: setPosition,
    resizable,
  })

  // 翻譯函數（支援參數替換）
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text: string = contextT(`accuracy.${key}`)
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v))
        })
      }
      return text
    },
    [contextT]
  )

  // 語言切換函數
  const toggleLanguage = () => {
    setLanguage(language === 'zh-TW' ? 'en' : 'zh-TW')
  }

  // 過濾並排序怪物列表
  const availableMonsters = useMemo(() => {
    if (!mobInfoData) return []

    return mobInfoData
      .filter((info) => {
        const hasValidData =
          info.mob.level !== null && info.mob.evasion !== null
        if (!hasValidData) return false

        if (monsterSearchTerm) {
          const searchLower = monsterSearchTerm.toLowerCase()
          const mobName = info.mob.name?.toLowerCase() || ''
          const chineseName = info.chineseMobName?.toLowerCase() || ''
          return (
            mobName.includes(searchLower) || chineseName.includes(searchLower)
          )
        }
        return true
      })
      .sort((a, b) => (a.mob.level || 0) - (b.mob.level || 0))
  }, [mobInfoData, monsterSearchTerm])

  // 選中的怪物資訊
  const selectedMonster = useMemo(() => {
    if (!selectedMobId || !mobInfoData) return null
    return (
      mobInfoData.find((info) => parseInt(info.mob.id, 10) === selectedMobId) ||
      null
    )
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
          ? selectedMonster.chineseMobName ||
            selectedMonster.mob.name ||
            `怪物 ${mobId}`
          : selectedMonster.mob.name ||
            selectedMonster.chineseMobName ||
            `Monster ${mobId}`
      setMonsterSearchTerm(displayName)
    }
  }, [language, selectedMonster])

  // 當視窗開啟時載入怪物資料和 UI 狀態
  useEffect(() => {
    if (isOpen) {
      loadMobInfo()
      ui.loadState()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]) // 只在開啟時載入一次，避免無限循環

  // 當視窗開啟時，從 localStorage 載入上次保存的狀態
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
  }, [
    mode,
    playerLevel,
    playerAccuracy,
    playerInt,
    playerLuk,
    bonusAccuracy,
    selectedMobId,
    isOpen,
  ])

  // ESC 鍵關閉視窗
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
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

  if (!isOpen || !ui.mounted) return null

  // 完整視窗
  return createPortal(
    <div
      ref={resizable.containerRef}
      className="fixed z-[65] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col"
      style={{
        left: position.x,
        top: position.y,
        width: resizable.size.width,
        height: resizable.size.height,
        maxWidth: 'calc(100vw - 16px)', // 確保不超出螢幕
        cursor: resizable.cursorStyle || (isDragging ? 'grabbing' : ''),
      }}
    >
      {/* 標題列（可拖曳） */}
      <div
        className="shrink-0 flex items-center justify-between px-3 py-2 bg-blue-500 text-white rounded-t-lg cursor-grab select-none"
        onMouseDown={(e) => {
          if (resizable.activeEdge) return
          dragHandlers.onMouseDown(e)
        }}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 opacity-50"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          </svg>
          <span className="text-sm font-bold">{t('title')}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* 語言切換按鈕 */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="p-1 hover:bg-blue-600 rounded"
            aria-label="切換語言"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-blue-600 rounded"
            aria-label={t('close')}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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

      {/* 內容區 */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-4 space-y-4">
        {/* 模式切換 */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setMode('physical')
              setResult(null)
            }}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm ${
              mode === 'physical'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 21l7.5-7.5m0 0l4.5-4.5m-4.5 4.5L21 3M6 18h.01M9 15h.01"
              />
            </svg>
            {t('physical')}
          </button>
          <button
            onClick={() => {
              setMode('magic')
              setResult(null)
            }}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm ${
              mode === 'magic'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3l14 9-14 9V3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 12l8-5-8-5v10z"
              />
            </svg>
            {t('magic')}
          </button>
        </div>

        {/* 輸入欄位 */}
        <div className="space-y-3">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('playerLevel')}
                </label>
                <input
                  type="number"
                  value={playerLevel}
                  onChange={(e) => setPlayerLevel(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('playerAccuracy')}
                </label>
                <input
                  type="number"
                  value={playerAccuracy}
                  onChange={(e) => setPlayerAccuracy(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* 魔法命中專屬 */}
          {mode === 'magic' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('playerLevel')}
                </label>
                <input
                  type="number"
                  value={playerLevel}
                  onChange={(e) => setPlayerLevel(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('bonusAccuracy')}
                </label>
                <input
                  type="number"
                  value={bonusAccuracy}
                  onChange={(e) => setBonusAccuracy(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  INT
                </label>
                <input
                  type="number"
                  value={playerInt}
                  onChange={(e) => setPlayerInt(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  LUK
                </label>
                <input
                  type="number"
                  value={playerLuk}
                  onChange={(e) => setPlayerLuk(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 計算按鈕 */}
        <button
          onClick={handleCalculate}
          disabled={!selectedMobId}
          className={`w-full py-2 text-white font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 text-sm ${
            selectedMobId
              ? 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-60'
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 8h8M8 12h8M8 16h8"
            />
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
      </div>
    </div>,
    document.body
  )
}
