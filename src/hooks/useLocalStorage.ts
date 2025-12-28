/**
 * useLocalStorage Hook
 *
 * 功能：
 * - 同步 React 狀態與 localStorage
 * - TypeScript 泛型支援
 * - SSR 安全（Next.js 相容）
 * - 自動序列化/反序列化 JSON
 * - 支援雲端同步：監聽 'preferences-synced' 事件重新載入設定
 *
 * 使用範例：
 * ```tsx
 * const [value, setValue] = useLocalStorage<string>('key', 'defaultValue')
 * ```
 */

import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // 從 localStorage 讀取值的函數
  const readValue = useCallback((): T => {
    // SSR 檢查：伺服器端無 window 物件
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch (error) {
      console.warn(`Error loading localStorage key "${key}":`, error)
      return initialValue
    }
  }, [key, initialValue])

  const [storedValue, setStoredValue] = useState<T>(readValue)

  // 監聽 preferences-synced 事件，重新從 localStorage 讀取值
  // 這確保當雲端設定同步完成後，UI 能正確更新
  useEffect(() => {
    const handleSync = () => {
      setStoredValue(readValue())
    }
    window.addEventListener('preferences-synced', handleSync)
    return () => window.removeEventListener('preferences-synced', handleSync)
  }, [readValue])

  // 監聽同頁面內其他組件對同一 key 的修改
  // 這確保全域設定修改後，使用相同 key 的組件能即時更新
  useEffect(() => {
    const handleStorageChange = (e: CustomEvent<{ key: string; newValue: unknown }>) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.newValue as T)
      }
    }
    window.addEventListener('local-storage-change', handleStorageChange as EventListener)
    return () => window.removeEventListener('local-storage-change', handleStorageChange as EventListener)
  }, [key])

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value

      // Save state
      setStoredValue(valueToStore)

      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
        // 通知同頁面內其他使用相同 key 的組件
        window.dispatchEvent(new CustomEvent('local-storage-change', {
          detail: { key, newValue: valueToStore }
        }))
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}
