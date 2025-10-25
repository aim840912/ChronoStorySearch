import { useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Language } from '@/types'

/**
 * 語言切換 Hook
 *
 * 提供簡便的語言切換功能，在繁體中文和英文之間切換
 *
 * @returns toggleLanguage - 切換語言的函數
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const toggleLanguage = useLanguageToggle()
 *
 *   return (
 *     <button onClick={toggleLanguage}>
 *       切換語言
 *     </button>
 *   )
 * }
 * ```
 */
export function useLanguageToggle() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = useCallback(() => {
    const newLanguage: Language = language === 'zh-TW' ? 'en' : 'zh-TW'
    setLanguage(newLanguage)
  }, [language, setLanguage])

  return toggleLanguage
}
