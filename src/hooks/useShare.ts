import { useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { clientLogger } from '@/lib/logger'

/**
 * URL 生成器類型
 * 用於生成要分享的 URL
 */
export type UrlGenerator = () => string

/**
 * 分享功能 Hook
 *
 * 提供複製連結到剪貼簿的功能，並顯示相應的 Toast 訊息
 *
 * @param urlGenerator - 生成要分享的 URL 的函數（可選）
 * @returns handleShare - 執行分享的函數
 *
 * @example
 * ```tsx
 * function MyComponent({ itemId }: { itemId: number }) {
 *   // 自定義 URL 生成器
 *   const handleShare = useShare(() => {
 *     return `${window.location.origin}?item=${itemId}`
 *   })
 *
 *   // 或使用預設（複製當前頁面 URL）
 *   const handleShareDefault = useShare()
 *
 *   return <button onClick={handleShare}>分享</button>
 * }
 * ```
 */
export function useShare(urlGenerator?: UrlGenerator) {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const handleShare = useCallback(async () => {
    try {
      // 生成 URL（如果提供了生成器，使用它；否則使用當前 URL）
      const url = urlGenerator
        ? urlGenerator()
        : window.location.href

      await navigator.clipboard.writeText(url)
      showToast(t('modal.linkCopied'), 'success')
    } catch (error) {
      clientLogger.error('複製連結失敗', error)
      showToast(t('modal.copyFailed'), 'error')
    }
  }, [urlGenerator, t, showToast])

  return handleShare
}
