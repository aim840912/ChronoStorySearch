'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Theme } from '@/types'
import { getTheme, setTheme as saveTheme } from '@/lib/storage'

interface ThemeContextType {
  theme: Theme
  effectiveTheme: 'light' | 'dark' // 保持向後兼容（現在等同於 theme）
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/**
 * Theme Provider
 * 提供主題切換功能，支援 light / dark 兩種模式
 * 支援雲端同步：監聽 'preferences-synced' 事件重新載入設定
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [isClient, setIsClient] = useState(false)

  // 載入主題設定
  const loadTheme = useCallback(() => {
    const savedTheme = getTheme()
    // 確保主題值有效（處理舊版 'system' 值）
    const validTheme: Theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'light'
    setThemeState(validTheme)
  }, [])

  // 從 localStorage 載入主題偏好
  useEffect(() => {
    setIsClient(true)
    loadTheme()
  }, [loadTheme])

  // 監聽雲端同步事件，重新載入設定
  useEffect(() => {
    const handleSync = () => {
      loadTheme()
    }
    window.addEventListener('preferences-synced', handleSync)
    return () => window.removeEventListener('preferences-synced', handleSync)
  }, [loadTheme])

  // 應用主題到 HTML class
  useEffect(() => {
    if (!isClient) return

    // 更新 HTML class
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme, isClient])

  // 切換主題並儲存到 localStorage（雲端同步由 PreferencesSyncContext 處理）
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    saveTheme(newTheme)
    // 觸發雲端同步事件
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'theme', value: newTheme }
    }))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme: theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * useTheme Hook
 * 用於在元件中存取主題相關功能
 */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
