'use client'

interface GachaDrawControlProps {
  drawCount: number
  maxDraws: number
  onDrawOnce: () => void
  onReset: () => void
  t: (key: string) => string
}

export function GachaDrawControl({
  drawCount,
  maxDraws,
  onDrawOnce,
  onReset,
  t,
}: GachaDrawControlProps) {
  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl border-2 border-purple-200 dark:border-purple-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* 抽獎次數顯示 */}
        <div className="text-center sm:text-left">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('gacha.drawCount')}</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {drawCount} / {maxDraws}
          </p>
        </div>

        {/* 按鈕組 */}
        <div className="flex gap-3">
          {drawCount > 0 && (
            <button
              onClick={onReset}
              className="px-6 py-4 rounded-xl font-bold text-lg transition-all duration-200 border-2 border-red-500 hover:border-red-600 text-red-500 hover:text-red-600 bg-white dark:bg-gray-800 hover:shadow-md active:scale-95 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {t('gacha.reset')}
            </button>
          )}

          <button
            onClick={onDrawOnce}
            disabled={drawCount >= maxDraws}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
              drawCount >= maxDraws
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                : 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg hover:shadow-xl active:scale-95'
            }`}
          >
            {drawCount >= maxDraws ? t('gacha.maxReached') : t('gacha.drawOnce')}
          </button>
        </div>
      </div>
    </div>
  )
}
