'use client'

import { useState } from 'react'
import { SLOT_SYMBOLS, calculateWinProbability } from '@/lib/slot-utils'
import { SymbolIcon } from './SymbolIcon'
import { getMonsterDisplayName } from '@/lib/display-name'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 賠率表元件
 * 顯示所有符號的賠率和獲勝機率
 * 支援中英文多語言顯示
 */
export function PayoutTable() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { language } = useLanguage()

  return (
    <div className="w-full">
      {/* 折疊/展開按鈕 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
      >
        <span>賠率表</span>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 賠率表內容 */}
      {isExpanded && (
        <div className="mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            {/* 表頭 */}
            <div className="grid grid-cols-4 gap-2 pb-2 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400">
              <div>符號</div>
              <div className="text-right">賠率</div>
              <div className="text-right">機率</div>
              <div className="text-right">獲勝率</div>
            </div>

            {/* 符號列表 (依賠率由高到低排序) */}
            {[...SLOT_SYMBOLS]
              .sort((a, b) => b.payout - a.payout)
              .map((symbol) => {
                const winProb = calculateWinProbability(symbol)
                const displayName = getMonsterDisplayName(
                  symbol.name,
                  symbol.chineseName,
                  language
                )
                return (
                  <div
                    key={symbol.id}
                    className="grid grid-cols-4 gap-2 items-center text-sm"
                  >
                    {/* 符號 */}
                    <div className="flex items-center gap-1">
                      <SymbolIcon symbol={symbol} size="sm" />
                      <span className="text-xs truncate">{displayName}</span>
                    </div>

                    {/* 賠率 */}
                    <div className="text-right font-semibold text-blue-600 dark:text-blue-400">
                      {symbol.payout}x
                    </div>

                    {/* 單個符號機率 */}
                    <div className="text-right text-gray-600 dark:text-gray-400 text-xs">
                      {((symbol.weight / SLOT_SYMBOLS.reduce((sum, s) => sum + s.weight, 0)) * 100).toFixed(1)}%
                    </div>

                    {/* 獲勝機率 (3 連線) */}
                    <div className="text-right text-gray-600 dark:text-gray-400 text-xs">
                      {winProb < 0.01 ? '<0.01' : winProb.toFixed(2)}%
                    </div>
                  </div>
                )
              })}
          </div>

          {/* 說明 */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            <p>• 3 個相同符號連線即可獲勝</p>
            <p>• 獲勝率 = 單符號機率³ (3 個獨立轉輪)</p>
          </div>
        </div>
      )}
    </div>
  )
}
