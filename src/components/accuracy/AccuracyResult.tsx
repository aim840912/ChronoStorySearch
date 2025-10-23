'use client'

import { memo } from 'react'
import type { AccuracyResult as AccuracyResultType } from '@/lib/accuracy-calculator'

interface AccuracyResultProps {
  result: AccuracyResultType
  mode: 'physical' | 'magic'
  playerInt?: number
  playerLuk?: number
  bonusAccuracy?: number
  monsterLevel: number
  playerLevel: number
  t: (key: string, params?: Record<string, string | number>) => string
}

export const AccuracyResult = memo(function AccuracyResult({
  result,
  mode,
  playerInt = 0,
  playerLuk = 0,
  bonusAccuracy = 0,
  monsterLevel,
  playerLevel,
  t,
}: AccuracyResultProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
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
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                {t('hit')}
              </span>
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {result.hitRate.toFixed(2)}%
            </div>
          </div>

          {/* Miss 率 */}
          <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border-2 border-red-300 dark:border-red-700">
            <div className="flex items-center gap-2 mb-1">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
                  {t('magicMissHint', {
                    rate: result.hitRate.toFixed(2),
                    required: result.requiredAccuracy,
                  })}
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
  )
})
