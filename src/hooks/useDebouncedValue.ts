import { useState, useEffect } from 'react'

/**
 * 自定義 Debounce Hook
 * 延遲更新值以減少計算頻率，適用於搜尋等場景
 *
 * @param value - 要 debounce 的值
 * @param delay - 延遲時間（毫秒）
 * @returns 延遲更新後的值
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
