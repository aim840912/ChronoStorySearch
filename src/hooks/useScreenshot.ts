import { useCallback, useState } from 'react'
import { toPng, toBlob } from 'html-to-image'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { clientLogger } from '@/lib/logger'

interface UseScreenshotOptions {
  filename?: string
}

/**
 * 截圖功能 Hook
 *
 * 提供下載 PNG 和複製到剪貼簿的功能，並顯示相應的 Toast 訊息
 *
 * @param options - 截圖選項
 * @returns 截圖相關的方法和狀態
 *
 * @example
 * ```tsx
 * function MyModal() {
 *   const screenshotRef = useRef<HTMLDivElement>(null)
 *   const { downloadPng, copyToClipboard, isCapturing } = useScreenshot({
 *     filename: 'monster-info'
 *   })
 *
 *   return (
 *     <div ref={screenshotRef}>
 *       <button onClick={() => downloadPng(screenshotRef.current)}>下載</button>
 *       <button onClick={() => copyToClipboard(screenshotRef.current)}>複製</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useScreenshot(options: UseScreenshotOptions = {}) {
  const { filename = 'screenshot' } = options
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [isCapturing, setIsCapturing] = useState(false)

  /**
   * 等待所有圖片載入完成
   */
  const waitForImages = async (element: HTMLElement): Promise<void> => {
    const images = element.querySelectorAll('img')
    const promises = Array.from(images).map((img) => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve()
      return new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve() // 圖片載入失敗也繼續
      })
    })
    await Promise.all(promises)
  }

  /**
   * 下載截圖為 PNG
   */
  const downloadPng = useCallback(
    async (element: HTMLElement | null) => {
      if (!element || isCapturing) return

      setIsCapturing(true)
      try {
        await waitForImages(element)

        const dataUrl = await toPng(element, {
          cacheBust: true,
          pixelRatio: 2, // 高解析度
        })

        const link = document.createElement('a')
        link.download = `${filename}.png`
        link.href = dataUrl
        link.click()

        showToast(t('screenshot.downloadSuccess'), 'success')
      } catch (error) {
        clientLogger.error('截圖下載失敗', error)
        showToast(t('screenshot.failed'), 'error')
      } finally {
        setIsCapturing(false)
      }
    },
    [filename, isCapturing, showToast, t]
  )

  /**
   * 複製截圖到剪貼簿
   */
  const copyToClipboard = useCallback(
    async (element: HTMLElement | null) => {
      if (!element || isCapturing) return

      // 檢查 Clipboard API 支援
      if (!navigator.clipboard?.write) {
        showToast(t('screenshot.copyFailed'), 'error')
        return
      }

      setIsCapturing(true)
      try {
        await waitForImages(element)

        const blob = await toBlob(element, {
          cacheBust: true,
          pixelRatio: 2,
        })

        if (!blob) throw new Error('Failed to create blob')

        // 檢查文件焦點（Clipboard API 安全限制）
        if (!document.hasFocus()) {
          showToast(t('screenshot.focusRequired'), 'error')
          return
        }

        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])

        showToast(t('screenshot.copySuccess'), 'success')
      } catch (error) {
        clientLogger.error('複製截圖失敗', error)
        showToast(t('screenshot.copyFailed'), 'error')
      } finally {
        setIsCapturing(false)
      }
    },
    [isCapturing, showToast, t]
  )

  return {
    downloadPng,
    copyToClipboard,
    isCapturing,
  }
}
