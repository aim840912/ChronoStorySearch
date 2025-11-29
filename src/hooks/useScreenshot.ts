import { useCallback, useState } from 'react'
import { toPng, toBlob } from 'html-to-image'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { clientLogger } from '@/lib/logger'

/** html-to-image 選項類型 */
interface ImageOptions {
  cacheBust?: boolean
  pixelRatio?: number
  skipFonts?: boolean
  filter?: (node: HTMLElement) => boolean
  fetchRequestInit?: RequestInit
}

interface UseScreenshotOptions {
  filename?: string
  /** 截圖超時時間（毫秒），預設 10 秒 */
  timeout?: number
}

/** 預設超時時間 10 秒 */
const DEFAULT_TIMEOUT = 10000

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
  const { filename = 'screenshot', timeout = DEFAULT_TIMEOUT } = options
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [isCapturing, setIsCapturing] = useState(false)

  /**
   * 建立超時 Promise
   */
  const createTimeoutPromise = <T>(ms: number): Promise<T> => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Screenshot timeout')), ms)
    })
  }

  /**
   * 等待所有圖片載入完成（含超時）
   */
  const waitForImages = async (element: HTMLElement, timeoutMs: number): Promise<void> => {
    const images = element.querySelectorAll('img')
    const imageTimeout = Math.min(timeoutMs / 2, 5000) // 圖片等待最多 5 秒或總超時的一半

    const promises = Array.from(images).map((img) => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve()
      return Promise.race([
        new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve() // 圖片載入失敗也繼續
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => resolve(), imageTimeout) // 單張圖片超時後跳過
        }),
      ])
    })
    await Promise.all(promises)
  }

  /**
   * html-to-image 的共用選項（處理 CORS 問題）
   */
  const getImageOptions = (): ImageOptions => ({
    cacheBust: true,
    pixelRatio: 2, // 高解析度
    skipFonts: true, // 跳過字體以加速
    // 過濾掉可能有 CORS 問題的外部圖片，改用 placeholder
    filter: (node: HTMLElement) => {
      // 跳過 hidden 元素
      if (node.style?.display === 'none') return false
      return true
    },
    // 處理跨域圖片：嘗試用 fetch 取得 blob
    fetchRequestInit: {
      mode: 'cors',
      credentials: 'omit',
    },
  })

  /**
   * 下載截圖為 PNG
   */
  const downloadPng = useCallback(
    async (element: HTMLElement | null) => {
      if (!element || isCapturing) return

      setIsCapturing(true)
      try {
        await waitForImages(element, timeout)

        // 使用 Promise.race 實現超時機制
        const dataUrl = await Promise.race([
          toPng(element, getImageOptions()),
          createTimeoutPromise<string>(timeout),
        ])

        const link = document.createElement('a')
        link.download = `${filename}.png`
        link.href = dataUrl
        link.click()

        showToast(t('screenshot.downloadSuccess'), 'success')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const isTimeout = errorMessage.includes('timeout')
        clientLogger.error('截圖下載失敗', { error: errorMessage, isTimeout })
        showToast(
          isTimeout ? t('screenshot.timeout') : t('screenshot.failed'),
          'error'
        )
      } finally {
        setIsCapturing(false)
      }
    },
    [filename, isCapturing, showToast, t, timeout]
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
        await waitForImages(element, timeout)

        // 使用 Promise.race 實現超時機制
        const blob = await Promise.race([
          toBlob(element, getImageOptions()),
          createTimeoutPromise<Blob | null>(timeout),
        ])

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
        const errorMessage = error instanceof Error ? error.message : String(error)
        const isTimeout = errorMessage.includes('timeout')
        clientLogger.error('複製截圖失敗', { error: errorMessage, isTimeout })
        showToast(
          isTimeout ? t('screenshot.timeout') : t('screenshot.copyFailed'),
          'error'
        )
      } finally {
        setIsCapturing(false)
      }
    },
    [isCapturing, showToast, t, timeout]
  )

  return {
    downloadPng,
    copyToClipboard,
    isCapturing,
  }
}
