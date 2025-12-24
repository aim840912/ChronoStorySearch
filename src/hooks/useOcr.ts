'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createWorker, Worker, PSM } from 'tesseract.js'
import type { UseOcrReturn, OcrResult } from '@/types/exp-tracker'

// 預處理模式配置
const PREPROCESSING_MODES = [
  { name: 'raw', threshold: 0, invert: false, useRaw: true },
  { name: 'binary-128', threshold: 128, invert: false, useRaw: false },
  { name: 'binary-128-inv', threshold: 128, invert: true, useRaw: false },
  { name: 'binary-80', threshold: 80, invert: false, useRaw: false },
  { name: 'binary-180', threshold: 180, invert: false, useRaw: false },
  { name: 'binary-80-inv', threshold: 80, invert: true, useRaw: false },
]

// 數字匹配模式 - 支援逗號分隔或 4 位以上連續數字
const NUMBER_PATTERN = /(\d{1,3}(?:,\d{3})+|\d{4,})/g

// 百分比匹配模式（多層級，必須有小數點以過濾誤讀）
const PERCENTAGE_PATTERNS = [
  // 優先級 1：方括號格式 [xx.xx%]
  /\[\s*(\d{1,2}\.\d{1,2})\s*%\s*\]/,
  // 優先級 2：圓括號格式 (xx.xx%)
  /\(\s*(\d{1,2}\.\d{1,2})\s*%\s*\)/,
  // 優先級 3：獨立格式 xx.xx%（前面不能緊接數字，避免匹配大數字的一部分）
  /(?<![0-9,])(\d{1,2}\.\d{1,2})\s*%/,
]

/**
 * OCR Hook - 使用 Tesseract.js 進行數字辨識
 * 優化：多種預處理方式提升辨識率
 */
export function useOcr(): UseOcrReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const initializingRef = useRef(false)
  // Canvas 複用，避免頻繁建立/銷毀
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // 初始化 Worker
  const initWorker = useCallback(async () => {
    if (workerRef.current || initializingRef.current) return

    initializingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const worker = await createWorker('eng', 1, {
        logger: () => {},
      })

      // 不設定白名單，讓 OCR 自由辨識所有字元
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      })

      workerRef.current = worker
      setIsReady(true)
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to initialize OCR')
      )
    } finally {
      setIsLoading(false)
      initializingRef.current = false
    }
  }, [])

  // 取得或建立 Canvas（複用以減少 GC 壓力）
  const getCanvas = useCallback((width: number, height: number): HTMLCanvasElement => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    canvasRef.current.width = width
    canvasRef.current.height = height
    return canvasRef.current
  }, [])

  // 取得或建立 Source Canvas（用於 ImageData 轉換）
  const getSourceCanvas = useCallback((width: number, height: number): HTMLCanvasElement => {
    if (!sourceCanvasRef.current) {
      sourceCanvasRef.current = document.createElement('canvas')
    }
    sourceCanvasRef.current.width = width
    sourceCanvasRef.current.height = height
    return sourceCanvasRef.current
  }, [])

  // 圖像預處理函數
  const preprocessImage = useCallback(
    (
      sourceCanvas: HTMLCanvasElement,
      threshold: number,
      invert: boolean,
      useRaw: boolean
    ): HTMLCanvasElement => {
      if (useRaw) {
        return sourceCanvas
      }

      const canvas = getCanvas(sourceCanvas.width, sourceCanvas.height)

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return sourceCanvas

      ctx.drawImage(sourceCanvas, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        let value = gray > threshold ? 255 : 0
        if (invert) value = 255 - value
        data[i] = value
        data[i + 1] = value
        data[i + 2] = value
      }

      ctx.putImageData(imageData, 0, 0)
      return canvas
    },
    [getCanvas]
  )

  // 從文字中提取最大的數字（經驗值通常是最大的）
  const extractLargestNumber = useCallback((text: string): number | null => {
    const matches = text.match(NUMBER_PATTERN)
    if (!matches || matches.length === 0) return null

    // 找最大的數字
    let largest: string | null = null
    let largestValue = 0

    for (const match of matches) {
      const value = parseInt(match.replace(/,/g, ''), 10)
      if (!isNaN(value) && value > largestValue) {
        largestValue = value
        largest = match
      }
    }

    return largest ? largestValue : null
  }, [])

  // 從文字中提取百分比（多層級匹配，必須有小數點）
  const extractPercentage = useCallback((text: string): number | null => {
    // 調試：顯示 OCR 讀取的原始文字
    if (process.env.NODE_ENV === 'development') {
      console.log('[OCR] Raw text for percentage extraction:', text)
    }

    // 多層級匹配，按優先級嘗試
    for (const pattern of PERCENTAGE_PATTERNS) {
      const match = text.match(pattern)
      if (match) {
        const percentage = parseFloat(match[1])
        // 百分比應該在 0-100 範圍內
        if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[OCR] Percentage match result:', match, 'value:', percentage)
          }
          return percentage
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[OCR] No percentage match found')
    }
    return null
  }, [])

  // 執行 OCR 辨識
  const recognize = useCallback(
    async (imageData: ImageData | HTMLCanvasElement): Promise<OcrResult> => {
      // 如果 worker 未初始化，先初始化
      if (!workerRef.current) {
        await initWorker()
      }

      if (!workerRef.current) {
        return {
          text: '',
          confidence: 0,
          expValue: null,
          percentage: null,
        }
      }

      try {
        // 如果是 ImageData，先轉換為 Canvas（複用 sourceCanvas）
        let sourceCanvas: HTMLCanvasElement

        if (imageData instanceof ImageData) {
          sourceCanvas = getSourceCanvas(imageData.width, imageData.height)
          const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true })
          if (ctx) {
            ctx.putImageData(imageData, 0, 0)
          }
        } else {
          sourceCanvas = imageData
        }

        // 嘗試多種預處理方式，收集所有有效結果
        const validResults: Array<{
          mode: string
          text: string
          confidence: number
          expValue: number
          percentage: number | null
        }> = []

        for (const mode of PREPROCESSING_MODES) {
          const processedCanvas = preprocessImage(
            sourceCanvas,
            mode.threshold,
            mode.invert,
            mode.useRaw
          )

          // 將 Canvas 轉換為 Blob（Tesseract.js 需要 Blob 而非 Canvas）
          const blob = await new Promise<Blob>((resolve, reject) => {
            processedCanvas.toBlob((b) => {
              if (b) resolve(b)
              else reject(new Error('Failed to convert canvas to blob'))
            }, 'image/png')
          })

          const result = await workerRef.current.recognize(blob)
          const text = result.data.text.trim()
          const confidence = result.data.confidence

          // 嘗試提取數字（不管信心度高低都嘗試）
          const expValue = extractLargestNumber(text)
          // 同時嘗試提取百分比
          const percentage = extractPercentage(text)

          if (expValue !== null) {
            validResults.push({ mode: mode.name, text, confidence, expValue, percentage })
          }
        }

        // 從有效結果中選信心度最高的 expValue
        if (validResults.length > 0) {
          const best = validResults.sort((a, b) => b.confidence - a.confidence)[0]

          // 單獨找百分比：從所有結果中找第一個有效的 percentage
          // 因為高信心度的結果可能沒有識別到百分比，但低信心度的結果有
          const percentageResult = validResults.find(r => r.percentage !== null)

          return {
            text: best.text,
            confidence: best.confidence,
            expValue: best.expValue,
            percentage: percentageResult?.percentage ?? null,
          }
        }

        // 所有模式都無法提取數字
        return {
          text: '',
          confidence: 0,
          expValue: null,
          percentage: null,
        }
      } catch (err) {
        console.error('OCR recognition failed:', err)
        return {
          text: '',
          confidence: 0,
          expValue: null,
          percentage: null,
        }
      }
    },
    [initWorker, preprocessImage, extractLargestNumber, extractPercentage, getSourceCanvas]
  )

  // 主動終止 Worker 和清理 Canvas（供外部呼叫，避免資源洩漏）
  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    canvasRef.current = null
    sourceCanvasRef.current = null
    setIsReady(false)
  }, [])

  // 組件掛載時初始化（只在掛載/卸載時執行）
  useEffect(() => {
    initWorker()

    return () => {
      terminateWorker()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 空依賴，確保只在掛載時初始化、卸載時清理

  return {
    isLoading,
    isReady,
    recognize,
    error,
    terminateWorker,
  }
}
