'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  Region,
  AutoDetectResult,
  UseAutoRegionDetectorReturn,
} from '@/types/exp-tracker'

/**
 * 自動偵測 EXP 區域 Hook
 * 兩階段策略：
 * 1. 掃描找 "EXP" 標籤
 * 2. 從 EXP 位置往右延伸找數字
 */

// 掃描參數（根據遊戲截圖優化：EXP 在底部 5-8%，中間 50-75% 位置）
const BOTTOM_SCAN_RATIO = 0.10   // 掃描底部 10%（實際 EXP 在 5-8%）
const CENTER_SCAN_RATIO = 0.50   // 只掃描中間 50% 寬度
const SCALE = 3                  // 放大倍率
const MIN_CONFIDENCE = 10        // 最低信心度閾值（降低以適應遊戲字體）

// 基準解析度的掃描參數（以 640px 寬為基準）
const BASE_WIDTH = 640
const BASE_REGION_HEIGHT = 30     // 條帶高度
const BASE_SCAN_STRIDE = 15       // 掃描間隔（原本 8，增大減少掃描次數）
const BASE_EXP_REGION_WIDTH = 120 // EXP 標籤區域寬度
const BASE_X_STEP = 60            // X 方向掃描步進（原本 40，增大減少掃描次數）

// 經驗值數字格式 - 專門匹配 EXP 後面的數字
const EXP_AFTER_PATTERN = /EXP\s*[:\s]*(\d{1,3}(?:,\d{3})+|\d{4,})/i
// 備用：匹配任意大數字（4位以上或帶逗號）
const ANY_NUMBER_PATTERN = /\d{1,3}(?:,\d{3})+|\d{4,}/g

interface ExpLabelResult {
  x: number
  y: number
  width: number
  height: number
  confidence: number
  /** 掃描時找到的原始文字（可能已包含 EXP 數字） */
  text?: string
}

export function useAutoRegionDetector(): UseAutoRegionDetectorReturn {
  const [isDetecting, setIsDetecting] = useState(false)
  const cancelledRef = useRef(false)
  const labelWorkerRef = useRef<import('tesseract.js').Worker | null>(null)
  const numberWorkerRef = useRef<import('tesseract.js').Worker | null>(null)
  // Canvas 複用，避免頻繁建立/銷毀
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // 初始化 EXP 標籤 OCR Worker
  const initLabelWorker = useCallback(async () => {
    if (labelWorkerRef.current) return labelWorkerRef.current

    const { createWorker, PSM } = await import('tesseract.js')
    const worker = await createWorker('eng', 1, {
      logger: () => {},
    })

    // 移除白名單限制，讓 OCR 自由辨識所有字元（遊戲字體可能需要更靈活的辨識）
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    })

    labelWorkerRef.current = worker
    return worker
  }, [])

  // 初始化數字 OCR Worker（不限制白名單，讓 OCR 自由辨識）
  const initNumberWorker = useCallback(async () => {
    if (numberWorkerRef.current) return numberWorkerRef.current

    const { createWorker, PSM } = await import('tesseract.js')
    const worker = await createWorker('eng', 1, {
      logger: () => {},
    })

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      // 不設定白名單，讓 OCR 自由辨識所有字元
    })

    numberWorkerRef.current = worker
    return worker
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

  // 從視頻擷取區域（不做預處理，保留原始顏色）
  // 注意：region 座標必須是 video 座標（videoWidth/videoHeight 空間）
  const captureRegionRaw = useCallback(
    (video: HTMLVideoElement, region: Region): HTMLCanvasElement | null => {
      const canvas = getCanvas(region.width * SCALE, region.height * SCALE)

      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // 直接使用 video 座標繪製（不需要縮放轉換）
      ctx.drawImage(
        video,
        region.x,
        region.y,
        region.width,
        region.height,
        0,
        0,
        canvas.width,
        canvas.height
      )

      return canvas
    },
    [getCanvas]
  )

  // 從視頻擷取區域並進行二值化預處理
  const captureRegion = useCallback(
    (video: HTMLVideoElement, region: Region, threshold = 128, invert = false): HTMLCanvasElement | null => {
      const canvas = captureRegionRaw(video, region)
      if (!canvas) return null

      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      // 圖像預處理：灰階 + 二值化
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
    [captureRegionRaw]
  )

  // 階段 1：掃描找 EXP 標籤
  // 注意：所有座標都使用 video 原始解析度（videoWidth/videoHeight）
  const findExpLabel = useCallback(
    async (
      video: HTMLVideoElement,
      worker: import('tesseract.js').Worker
    ): Promise<ExpLabelResult | null> => {
      // 使用 video 實際解析度（不是 DOM 顯示尺寸）
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight

      // 根據解析度縮放掃描參數
      const resolutionScale = videoWidth / BASE_WIDTH
      const regionHeight = Math.round(BASE_REGION_HEIGHT * resolutionScale)
      const scanStride = Math.round(BASE_SCAN_STRIDE * resolutionScale)
      const expRegionWidth = Math.round(BASE_EXP_REGION_WIDTH * resolutionScale)
      const xStep = Math.round(BASE_X_STEP * resolutionScale)

      const startY = Math.floor(videoHeight * (1 - BOTTOM_SCAN_RATIO))
      const endY = videoHeight

      // 從中間開始掃描，只掃描中間 50% 寬度（根據遊戲截圖，EXP 在中間偏右）
      const xPositions: number[] = []
      const centerX = Math.floor(videoWidth / 2)
      const scanHalfWidth = Math.floor(videoWidth * CENTER_SCAN_RATIO / 2)  // 左右各 25%

      for (let offset = 0; offset <= scanHalfWidth; offset += xStep) {
        if (centerX + offset < videoWidth - expRegionWidth) {
          xPositions.push(centerX + offset)
        }
        if (centerX - offset >= 0 && offset > 0) {
          xPositions.push(centerX - offset)
        }
      }

      for (let y = startY; y < endY - regionHeight; y += scanStride) {
        if (cancelledRef.current) return null

        for (const x of xPositions) {
          const region: Region = {
            x,
            y,
            width: expRegionWidth,
            height: regionHeight,
          }

          const canvas = captureRegion(video, region)
          if (!canvas) continue

          const result = await worker.recognize(canvas)
          const text = result.data.text.trim().toUpperCase()
          const confidence = result.data.confidence

          // 調試日誌：顯示掃描結果
          if (process.env.NODE_ENV === 'development' && text.length > 0) {
            console.log('[AutoDetect] Scanning:', { x, y, text, confidence })
          }

          // 檢查是否包含 EXP
          if (text.includes('EXP') && confidence >= MIN_CONFIDENCE) {
            return {
              x,
              y,
              width: expRegionWidth,
              height: regionHeight,
              confidence,
              text: result.data.text.trim(), // 保留原始文字（包含大小寫）
            }
          }
        }
      }

      return null
    },
    [captureRegion]
  )

  // 階段 2：從 EXP 位置往右找數字（嘗試多種預處理方式）
  // 注意：expLabel 的座標已經是 video 座標（videoWidth/videoHeight 空間）
  const findExpNumber = useCallback(
    async (
      video: HTMLVideoElement,
      expLabel: ExpLabelResult,
      worker: import('tesseract.js').Worker
    ): Promise<AutoDetectResult | null> => {
      // 直接使用 video 實際解析度（不需要 client↔video 座標轉換）
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight

      // 優先策略：檢查掃描文字是否已包含 EXP 數字
      // 如果掃描階段就找到完整資訊，直接使用原掃描區域
      if (expLabel.text) {
        const expMatch = expLabel.text.match(EXP_AFTER_PATTERN)
        const allNumbers = expLabel.text.match(ANY_NUMBER_PATTERN)

        if (process.env.NODE_ENV === 'development') {
          console.log('[AutoDetect] Checking scan text:', {
            text: expLabel.text,
            expMatch,
            allNumbers
          })
        }

        // 如果掃描文字包含 EXP 數字，直接使用原掃描區域（已是 video 座標）
        if (expMatch) {
          const scanRegion: Region = {
            x: expLabel.x,
            y: expLabel.y,
            width: expLabel.width,
            height: expLabel.height,
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('[AutoDetect] Using scan region directly:', { scanRegion, expNumber: expMatch[1] })
          }

          return {
            region: scanRegion,
            confidence: expLabel.confidence,
            text: expMatch[1],
          }
        }

        // 如果有大數字（可能是經驗值）
        if (allNumbers && allNumbers.length > 0) {
          const largestNumber = allNumbers.reduce((max, num) => {
            const numValue = parseInt(num.replace(/,/g, ''), 10)
            const maxValue = parseInt(max.replace(/,/g, ''), 10)
            return numValue > maxValue ? num : max
          })

          // 只接受 4 位數以上的數字（經驗值通常較大）
          const numValue = parseInt(largestNumber.replace(/,/g, ''), 10)
          if (numValue >= 1000) {
            const scanRegion: Region = {
              x: expLabel.x,
              y: expLabel.y,
              width: expLabel.width,
              height: expLabel.height,
            }

            if (process.env.NODE_ENV === 'development') {
              console.log('[AutoDetect] Using scan region with largest number:', { scanRegion, largestNumber })
            }

            return {
              region: scanRegion,
              confidence: expLabel.confidence,
              text: largestNumber,
            }
          }
        }
      }

      // 備用策略：擴大擷取區域（如果掃描文字沒有數字）
      // 按 video 解析度比例調整延伸範圍
      const scale = videoWidth / 1920 // 假設基準解析度為 1920px
      const leftExtend = Math.round(100 * scale)   // 往左延伸
      const rightExtend = Math.round(200 * scale)  // 往右延伸

      // 直接在 video 座標中計算區域
      const numberRegion: Region = {
        x: Math.max(0, expLabel.x - leftExtend),
        y: expLabel.y,
        width: leftExtend + expLabel.width + rightExtend,
        height: expLabel.height,
      }

      // 確保不超出視頻範圍
      if (numberRegion.x + numberRegion.width > videoWidth) {
        numberRegion.width = videoWidth - numberRegion.x
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[AutoDetect] Fallback: Extended region:', {
          videoSize: { width: videoWidth, height: videoHeight },
          expLabel: { x: expLabel.x, y: expLabel.y, width: expLabel.width, height: expLabel.height },
          numberRegion,
        })
      }

      // 嘗試多種預處理方式
      const preprocessingModes = [
        { name: 'raw', threshold: 0, invert: false, useRaw: true },
        { name: 'binary-128', threshold: 128, invert: false, useRaw: false },
        { name: 'binary-128-inv', threshold: 128, invert: true, useRaw: false },
        { name: 'binary-80', threshold: 80, invert: false, useRaw: false },
        { name: 'binary-180', threshold: 180, invert: false, useRaw: false },
        { name: 'binary-80-inv', threshold: 80, invert: true, useRaw: false },
      ]

      for (const mode of preprocessingModes) {
        // 直接使用 video 座標（captureRegion 現在接受 video 座標）
        const canvas = mode.useRaw
          ? captureRegionRaw(video, numberRegion)
          : captureRegion(video, numberRegion, mode.threshold, mode.invert)

        if (!canvas) continue

        const result = await worker.recognize(canvas)
        const text = result.data.text.trim()
        const confidence = result.data.confidence

        // 調試日誌
        const expMatch = text.match(EXP_AFTER_PATTERN)
        const allNumbers = text.match(ANY_NUMBER_PATTERN)
        if (process.env.NODE_ENV === 'development') {
          console.log('[AutoDetect] findExpNumber:', { mode: mode.name, text, confidence, expMatch, allNumbers })
        }

        // 優先：提取 EXP 後面的數字
        if (expMatch && confidence >= MIN_CONFIDENCE) {
          const expNumber = expMatch[1]

          return {
            region: numberRegion,
            confidence,
            text: expNumber,
          }
        }

        // 備用：找最大的數字（可能是經驗值）
        if (allNumbers && allNumbers.length > 0 && confidence >= MIN_CONFIDENCE) {
          const largestNumber = allNumbers.reduce((max, num) => {
            const numValue = parseInt(num.replace(/,/g, ''), 10)
            const maxValue = parseInt(max.replace(/,/g, ''), 10)
            return numValue > maxValue ? num : max
          })

          return {
            region: numberRegion,
            confidence,
            text: largestNumber,
          }
        }
      }

      return null
    },
    [captureRegion, captureRegionRaw]
  )

  // 執行自動偵測
  const detect = useCallback(
    async (video: HTMLVideoElement): Promise<AutoDetectResult | null> => {
      if (isDetecting) return null

      setIsDetecting(true)
      cancelledRef.current = false

      try {
        const detectStartTime = performance.now()

        const [labelWorker, numberWorker] = await Promise.all([
          initLabelWorker(),
          initNumberWorker(),
        ])

        // 階段 1：找 EXP 標籤
        const labelStartTime = performance.now()
        const expLabel = await findExpLabel(video, labelWorker)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[AutoDetect] findExpLabel 耗時: ${Math.round(performance.now() - labelStartTime)}ms`)
        }
        if (!expLabel) {
          return null
        }

        // 階段 2：從 EXP 位置找數字
        const numberStartTime = performance.now()
        const result = await findExpNumber(video, expLabel, numberWorker)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[AutoDetect] findExpNumber 耗時: ${Math.round(performance.now() - numberStartTime)}ms`)
          console.log(`[AutoDetect] 總偵測耗時: ${Math.round(performance.now() - detectStartTime)}ms`)
        }
        if (!result) {
          return null
        }

        return result
      } catch (error) {
        console.error('[AutoDetect] Error:', error)
        return null
      } finally {
        setIsDetecting(false)
      }
    },
    [isDetecting, initLabelWorker, initNumberWorker, findExpLabel, findExpNumber]
  )

  // 取消偵測
  const cancel = useCallback(() => {
    cancelledRef.current = true
  }, [])

  // 主動清理 Workers 和 Canvas（供外部呼叫，避免資源洩漏）
  const cleanup = useCallback(() => {
    if (labelWorkerRef.current) {
      labelWorkerRef.current.terminate()
      labelWorkerRef.current = null
    }
    if (numberWorkerRef.current) {
      numberWorkerRef.current.terminate()
      numberWorkerRef.current = null
    }
    canvasRef.current = null
  }, [])

  // 元件卸載時清理 Tesseract workers
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    isDetecting,
    detect,
    cancel,
    cleanup,
  }
}
