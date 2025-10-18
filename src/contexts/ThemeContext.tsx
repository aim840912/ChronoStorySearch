'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Theme } from '@/types'
import { getTheme, setTheme as saveTheme } from '@/lib/storage'

interface ThemeContextType {
  theme: Theme
  effectiveTheme: 'light' | 'dark' // 實際應用的主題（解析 system 後）
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/**
 * Theme Provider
 * 提供主題切換功能，支援 light / dark / system 三種模式
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light')
  const [isClient, setIsClient] = useState(false)

  // 從 localStorage 載入主題偏好
  useEffect(() => {
    setIsClient(true)
    const savedTheme = getTheme()
    setThemeState(savedTheme)
  }, [])

  // 解析實際應用的主題（處理 system 模式）
  useEffect(() => {
    if (!isClient) return undefined

    const resolveTheme = (currentTheme: Theme): 'light' | 'dark' => {
      if (currentTheme === 'system') {
        // 檢查系統偏好
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
      }
      return currentTheme
    }

    const updateEffectiveTheme = () => {
      const resolved = resolveTheme(theme)
      setEffectiveTheme(resolved)

      // 更新 HTML class
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    updateEffectiveTheme()

    // 監聽系統主題變更（僅在 theme 為 system 時）
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => updateEffectiveTheme()

      // 現代瀏覽器使用 addEventListener
      mediaQuery.addEventListener('change', handleChange)

      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }
    return undefined
  }, [theme, isClient])

  // 切換主題並儲存到 localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    saveTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
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
