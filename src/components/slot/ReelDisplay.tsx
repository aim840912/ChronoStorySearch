import type { Reel } from '@/types/slot'
import { SymbolIcon } from './SymbolIcon'

interface ReelDisplayProps {
  reel: Reel
}

/**
 * 單個轉輪顯示元件
 * 垂直顯示 3 個符號（上、中、下）並處理旋轉動畫
 */
export function ReelDisplay({ reel }: ReelDisplayProps) {
  const { symbols, status } = reel

  // 根據狀態決定容器樣式
  const getContainerClasses = () => {
    const baseClasses = 'flex flex-col gap-2'

    return baseClasses
  }

  // 根據狀態決定單個符號框的樣式
  const getSymbolBoxClasses = () => {
    const baseClasses = 'relative flex items-center justify-center rounded-lg border-2 transition-all duration-300 w-20 h-20 md:w-24 md:h-24'

    if (status === 'spinning') {
      return `${baseClasses} border-blue-500 bg-blue-50 dark:bg-blue-950 animate-pulse-scale`
    }

    if (status === 'stopping') {
      return `${baseClasses} border-yellow-500 bg-yellow-50 dark:bg-yellow-950`
    }

    if (status === 'stopped' && symbols[0]) {
      return `${baseClasses} border-green-500 bg-green-50 dark:bg-green-950`
    }

    return `${baseClasses} border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800`
  }

  const symbolBoxClasses = getSymbolBoxClasses()

  return (
    <div className={getContainerClasses()}>
      {/* 上符號 */}
      <div className={symbolBoxClasses}>
        {status === 'spinning' ? (
          <div className="text-3xl font-bold text-gray-400 dark:text-gray-500 animate-spin">
            ?
          </div>
        ) : symbols[0] ? (
          <SymbolIcon symbol={symbols[0]} size="lg" />
        ) : (
          <div className="text-xl text-gray-300 dark:text-gray-600">-</div>
        )}
      </div>

      {/* 中符號 */}
      <div className={symbolBoxClasses}>
        {status === 'spinning' ? (
          <div className="text-3xl font-bold text-gray-400 dark:text-gray-500 animate-spin">
            ?
          </div>
        ) : symbols[1] ? (
          <SymbolIcon symbol={symbols[1]} size="lg" />
        ) : (
          <div className="text-xl text-gray-300 dark:text-gray-600">-</div>
        )}
      </div>

      {/* 下符號 */}
      <div className={symbolBoxClasses}>
        {status === 'spinning' ? (
          <div className="text-3xl font-bold text-gray-400 dark:text-gray-500 animate-spin">
            ?
          </div>
        ) : symbols[2] ? (
          <SymbolIcon symbol={symbols[2]} size="lg" />
        ) : (
          <div className="text-xl text-gray-300 dark:text-gray-600">-</div>
        )}
      </div>
    </div>
  )
}
