'use client'

interface EnhanceButtonProps {
  canEnhance: boolean
  isEnhancing: boolean
  onEnhance: () => void
}

export function EnhanceButton({ canEnhance, isEnhancing, onEnhance }: EnhanceButtonProps) {
  return (
    <button
      onClick={onEnhance}
      disabled={!canEnhance}
      className={`
        relative px-8 py-4 rounded-lg font-semibold text-lg
        transition-all duration-200
        ${
          canEnhance
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl active:scale-95'
            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
        }
        ${isEnhancing ? 'animate-pulse' : ''}
      `}
    >
      {isEnhancing ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          強化中...
        </span>
      ) : (
        '開始強化'
      )}
    </button>
  )
}
