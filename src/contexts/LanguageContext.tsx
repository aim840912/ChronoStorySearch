'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [isClient, setIsClient] = useState(false)

  // 從 localStorage 載入語言偏好
  useEffect(() => {
    setIsClient(true)
    const savedLanguage = getLanguage()
    setLanguageState(savedLanguage)
  }, [])

  // 切換語言並儲存到 localStorage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    saveLanguage(lang)

    // 更新 HTML lang 屬性
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang
    }
  }

  // 翻譯函數
  const t = (key: string, params?: Record<string, string | number>): string => {
    if (!isClient) {
      // SSR 時使用預設語言（英文）
      let text = translations['en'][key] || key
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v))
        })
      }
      return text
    }

    let translation = translations[language][key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        translation = translation.replace(`{${k}}`, String(v))
      })
    }
    return translation
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
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
