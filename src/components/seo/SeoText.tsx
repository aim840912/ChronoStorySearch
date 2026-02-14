'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface SeoTextProps {
  textKey: string
  params?: Record<string, string | number>
}

/**
 * Server Component 中使用的翻譯文字元件
 * 用 useLanguage() 動態顯示翻譯，支援參數替換
 */
export function SeoText({ textKey, params }: SeoTextProps) {
  const { t } = useLanguage()
  return <>{t(textKey, params)}</>
}
