'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  Region,
  AutoDetectResult,
  UseAutoRegionDetectorReturn,
  ScanDebugInfo,
} from '@/types/exp-tracker'

/**
 * 自動偵測 EXP 區域 Hook
 * 多策略偵測：
 * 1. 掃描找 "EXP" 標籤（含 OCR 誤讀容錯）
 * 2. 備用：尋找「大數字 + 百分比」模式
 * 3. 從找到的位置往右延伸找數字
 */

// 掃描參數（擴大範圍以提高偵測率）
const BOTTOM_SCAN_RATIO = 0.12   // 掃描底部 12%（原 10%）
const CENTER_SCAN_RATIO = 0.70   // 掃描中間 70% 寬度（原 50%）
const SCALE = 3                  // 放大倍率
const MIN_CONFIDENCE = 10        // 最低信心度閾值（降低以適應遊戲字體）
const MAX_DETECT_TIME = 30000    // 最大偵測時間（30 秒），防止無限掃描影響系統

// 基準解析度的掃描參數（以 640px 寬為基準）
const BASE_WIDTH = 640
const BASE_REGION_HEIGHT = 35     // 條帶高度（原 30，加高）
const BASE_SCAN_STRIDE = 12       // 掃描間隔（原 15，縮小提高精度）
const BASE_EXP_REGION_WIDTH = 150 // EXP 標籤區域寬度（原 120，加寬）
const BASE_X_STEP = 50            // X 方向掃描步進（原 60，縮小提高精度）

// OCR 關鍵字容錯（常見誤讀變體，包含全形和相似字元）
const EXP_KEYWORDS = [
  'EXP', 'EXR', 'FXP', 'EXB', 'EXF', 'FXR', 'EKP', 'EXD', 'EX9',
  'EYP', 'EAP', 'ENP', 'EVP', // 常見 OCR 誤讀
  'E×P', // 乘號代替 X
]

/**
 * 正規化 OCR 文字（全形轉半形、相似字元轉換）
 * 解決 OCR 辨識遊戲字體時產生的非標準字元問題
 */
function normalizeOcrText(text: string): string {
  return text
    // 全形英文字母轉半形 (Ａ-Ｚ → A-Z)
    .replace(/[Ａ-Ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[ａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    // 全形數字轉半形 (０-９ → 0-9)
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    // 常見相似字元替換
    .replace(/[×✕✖Ｘ]/g, 'X')
    .replace(/[—–－]/g, '-')
    .replace(/[，]/g, ',')
    .replace(/[．]/g, '.')
    .replace(/[％]/g, '%')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    // 移除零寬字元和不可見字元
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
}

// 經驗值數字格式 - 專門匹配 EXP 後面的數字
const EXP_AFTER_PATTERN = /(?:EXP|EXR|FXP|EXB|EXF|FXR|EKP)\s*[:\s]*(\d{1,3}(?:,\d{3})+|\d{4,})/i
// 備用：匹配任意大數字（4位以上或帶逗號）
const ANY_NUMBER_PATTERN = /\d{1,3}(?:,\d{3})+|\d{4,}/g
// 備用策略：「大數字 + 百分比」模式（MapleStory EXP 特徵）
// 支援格式：983,500 (73.77% 或 983,500 73.77%
const EXP_PATTERN_FALLBACK = /(\d{1,3}(?:,\d{3})+|\d{4,})\s*[\s\/]*\s*[([]?\s*(\d{1,3}\.\d{1,2})\s*%/

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
  const [debugMode, setDebugMode] = useState(false)
  const [debugScans, setDebugScans] = useState<ScanDebugInfo[]>([])
  const cancelledRef = useRef(false)
  const detectStartTimeRef = useRef<number>(0) // 偵測開始時間，用於超時檢查
  const labelWorkerRef = useRef<import('tesseract.js').Worker | null>(null)
  const numberWorkerRef = useRef<import('tesseract.js').Worker | null>(null)
  // Canvas 複用，避免頻繁建立/銷毀
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const debugModeRef = useRef(debugMode)

  // 同步 debugMode 到 ref（避免閉包問題）
  useEffect(() => {
    debugModeRef.current = debugMode
  }, [debugMode])

  // 檢查是否超時（防止長時間掃描影響系統）
  const isTimeout = useCallback(() => {
    return performance.now() - detectStartTimeRef.current > MAX_DETECT_TIME
  }, [])

  // 清除 Debug 記錄
  const clearDebugScans = useCallback(() => {
    setDebugScans([])
  }, [])

  // 新增 Debug 掃描記錄
  const addDebugScan = useCallback((info: ScanDebugInfo) => {
    if (debugModeRef.current) {
      setDebugScans(prev => [...prev.slice(-49), info]) // 最多保留 50 筆
    }
  }, [])

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
        // 檢查取消或超時
        if (cancelledRef.current || isTimeout()) {
          if (isTimeout()) console.warn('[AutoDetect] findExpLabel 超時')
          return null
        }

        for (const x of xPositions) {
          const region: Region = {
            x,
            y,
            width: expRegionWidth,
            height: regionHeight,
          }

          // 嘗試多種預處理模式（與 findExpByPattern 一致）
          const preprocessingModes = [
            { name: 'raw', threshold: 0, invert: false, useRaw: true },
            { name: 'binary-128', threshold: 128, invert: false, useRaw: false },
            { name: 'binary-128-inv', threshold: 128, invert: true, useRaw: false },
          ]

          for (const mode of preprocessingModes) {
            const canvas = mode.useRaw
              ? captureRegionRaw(video, region)
              : captureRegion(video, region, mode.threshold, mode.invert)
            if (!canvas) continue

            const result = await worker.recognize(canvas)
            const rawText = result.data.text.trim()
            // 正規化文字（全形轉半形、相似字元轉換）後再轉大寫
            const text = normalizeOcrText(rawText).toUpperCase()
            const confidence = result.data.confidence

            // 檢查是否包含 EXP 關鍵字（含誤讀容錯）
            const hasExpKeyword = EXP_KEYWORDS.some(kw => text.includes(kw))

            // 調試日誌：顯示掃描結果
            if (process.env.NODE_ENV === 'development' && text.length > 0) {
              console.log('[AutoDetect] Scanning:', { x, y, mode: mode.name, text, confidence, hasExpKeyword })
            }

            // Debug 模式：記錄掃描結果
            if (debugModeRef.current && text.length > 0) {
              addDebugScan({
                timestamp: Date.now(),
                region,
                capturedImage: canvas.toDataURL('image/png'),
                ocrText: text,
                confidence,
                matched: hasExpKeyword && confidence >= MIN_CONFIDENCE,
                preprocessMode: mode.name,
              })
            }

            // 檢查是否包含 EXP（使用容錯關鍵字）
            if (hasExpKeyword && confidence >= MIN_CONFIDENCE) {
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
      }

      return null
    },
    [captureRegion, captureRegionRaw, addDebugScan]
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

  // 備用策略：直接尋找「大數字 + 百分比」模式
  // 當 findExpLabel 找不到 "EXP" 關鍵字時使用
  const findExpByPattern = useCallback(
    async (
      video: HTMLVideoElement,
      worker: import('tesseract.js').Worker
    ): Promise<AutoDetectResult | null> => {
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight

      // 根據解析度縮放參數
      const resolutionScale = videoWidth / BASE_WIDTH
      const regionHeight = Math.round(BASE_REGION_HEIGHT * resolutionScale)
      const scanStride = Math.round(BASE_SCAN_STRIDE * resolutionScale)
      const regionWidth = Math.round(200 * resolutionScale) // 較寬的區域以涵蓋數字

      const startY = Math.floor(videoHeight * (1 - BOTTOM_SCAN_RATIO))
      const endY = videoHeight

      // 掃描底部區域
      for (let y = startY; y < endY - regionHeight; y += scanStride) {
        // 檢查取消或超時
        if (cancelledRef.current || isTimeout()) {
          if (isTimeout()) console.warn('[AutoDetect] findExpByPattern 超時')
          return null
        }

        // 從右到左掃描（EXP 通常在右側）
        for (let x = videoWidth - regionWidth; x >= videoWidth * 0.3; x -= Math.round(40 * resolutionScale)) {
          const region: Region = {
            x,
            y,
            width: regionWidth,
            height: regionHeight,
          }

          // 嘗試多種預處理
          const preprocessingModes = [
            { name: 'raw', threshold: 0, invert: false, useRaw: true },
            { name: 'binary-128', threshold: 128, invert: false, useRaw: false },
            { name: 'binary-128-inv', threshold: 128, invert: true, useRaw: false },
          ]

          for (const mode of preprocessingModes) {
            const canvas = mode.useRaw
              ? captureRegionRaw(video, region)
              : captureRegion(video, region, mode.threshold, mode.invert)

            if (!canvas) continue

            const result = await worker.recognize(canvas)
            const rawText = result.data.text.trim()
            // 正規化文字（全形轉半形）
            const text = normalizeOcrText(rawText)
            const confidence = result.data.confidence

            // Debug 模式記錄
            if (debugModeRef.current && text.length > 0) {
              addDebugScan({
                timestamp: Date.now(),
                region,
                capturedImage: canvas.toDataURL('image/png'),
                ocrText: text,
                confidence,
                matched: EXP_PATTERN_FALLBACK.test(text),
                preprocessMode: mode.name,
              })
            }

            // 尋找「大數字 + 百分比」模式
            const patternMatch = text.match(EXP_PATTERN_FALLBACK)
            if (patternMatch && confidence >= MIN_CONFIDENCE) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[AutoDetect] Pattern match found:', { text, patternMatch })
              }
              return {
                region,
                confidence,
                text: patternMatch[1], // 返回數字部分
              }
            }
          }
        }
      }

      return null
    },
    [captureRegion, captureRegionRaw, addDebugScan]
  )

  // 執行自動偵測
  const detect = useCallback(
    async (video: HTMLVideoElement): Promise<AutoDetectResult | null> => {
      if (isDetecting) return null

      setIsDetecting(true)
      cancelledRef.current = false
      detectStartTimeRef.current = performance.now() // 設定超時檢查起始時間

      try {
        const detectStartTime = performance.now()

        const [labelWorker, numberWorker] = await Promise.all([
          initLabelWorker(),
          initNumberWorker(),
        ])

        // 階段 1：找 EXP 標籤（使用關鍵字容錯）
        const labelStartTime = performance.now()
        const expLabel = await findExpLabel(video, labelWorker)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[AutoDetect] findExpLabel 耗時: ${Math.round(performance.now() - labelStartTime)}ms`)
        }

        // 如果找到 EXP 標籤，從該位置找數字
        if (expLabel) {
          const numberStartTime = performance.now()
          const result = await findExpNumber(video, expLabel, numberWorker)
          if (process.env.NODE_ENV === 'development') {
            console.log(`[AutoDetect] findExpNumber 耗時: ${Math.round(performance.now() - numberStartTime)}ms`)
            console.log(`[AutoDetect] 總偵測耗時: ${Math.round(performance.now() - detectStartTime)}ms`)
          }
          if (result) {
            return result
          }
        }

        // 備用策略：如果找不到 EXP 關鍵字，使用「大數字 + 百分比」模式
        if (process.env.NODE_ENV === 'development') {
          console.log('[AutoDetect] 使用備用策略：尋找大數字+百分比模式')
        }
        const patternStartTime = performance.now()
        const patternResult = await findExpByPattern(video, numberWorker)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[AutoDetect] findExpByPattern 耗時: ${Math.round(performance.now() - patternStartTime)}ms`)
          console.log(`[AutoDetect] 總偵測耗時: ${Math.round(performance.now() - detectStartTime)}ms`)
        }

        return patternResult
      } catch (error) {
        console.error('[AutoDetect] Error:', error)
        return null
      } finally {
        setIsDetecting(false)
      }
    },
    [isDetecting, initLabelWorker, initNumberWorker, findExpLabel, findExpNumber, findExpByPattern]
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
    debugMode,
    setDebugMode,
    debugScans,
    clearDebugScans,
  }
}
