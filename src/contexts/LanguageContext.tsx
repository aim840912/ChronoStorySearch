'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Language, Translations } from '@/types'
import { getLanguage, setLanguage as saveLanguage } from '@/lib/storage'
import zhTW from '@/locales/zh-TW.json'
import en from '@/locales/en.json'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations: Record<Language, Translations> = {
  'zh-TW': zhTW,
  'en': en,
}

/**
 * Language Provider
 * 提供語言切換和翻譯功能
 * 支援雲端同步：監聽 'preferences-synced' 事件重新載入設定
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [isClient, setIsClient] = useState(false)

  // 載入語言設定
  const loadLanguage = useCallback(() => {
    const savedLanguage = getLanguage()
    setLanguageState(savedLanguage)
    // 更新 HTML lang 屬性
    if (typeof document !== 'undefined') {
      document.documentElement.lang = savedLanguage
    }
  }, [])

  // 從 localStorage 載入語言偏好
  useEffect(() => {
    setIsClient(true)
    loadLanguage()
  }, [loadLanguage])

  // 監聽雲端同步事件，重新載入設定
  useEffect(() => {
    const handleSync = () => {
      loadLanguage()
    }
    window.addEventListener('preferences-synced', handleSync)
    return () => window.removeEventListener('preferences-synced', handleSync)
  }, [loadLanguage])

  // 切換語言並儲存到 localStorage
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    saveLanguage(lang)

    // 更新 HTML lang 屬性
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang
    }

    // 觸發雲端同步事件
    window.dispatchEvent(new CustomEvent('preference-changed', {
      detail: { field: 'language', value: lang }
    }))
  }, [])

  // 翻譯函數
  const t = (key: string, params?: Record<string, string | number>): string => {
    if (!isClient) {
      // SSR 時使用預設語言（英文）
      const text = translations['en'][key] || key
      return params
        ? Object.entries(params).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), text)
        : text
    }

    const translation = translations[language][key] || key
    return params
      ? Object.entries(params).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), translation)
      : translation
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <>{children}</>
    </LanguageContext.Provider>
  )
}

/**
 * useLanguage Hook
 * 用於在元件中存取語言相關功能
 */
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
