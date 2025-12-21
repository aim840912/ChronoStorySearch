'use client'

import { useState, useCallback, useRef } from 'react'
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

// 掃描參數
const BOTTOM_SCAN_RATIO = 0.25  // 掃描底部 25%
const REGION_HEIGHT = 30         // 條帶高度
const SCAN_STRIDE = 8            // 掃描間隔
const SCALE = 3                  // 放大倍率
const MIN_CONFIDENCE = 20        // 最低信心度閾值
const EXP_REGION_WIDTH = 120     // EXP 標籤區域寬度（擴大以適應不同格式）

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
}

export function useAutoRegionDetector(): UseAutoRegionDetectorReturn {
  const [isDetecting, setIsDetecting] = useState(false)
  const cancelledRef = useRef(false)
  const labelWorkerRef = useRef<import('tesseract.js').Worker | null>(null)
  const numberWorkerRef = useRef<import('tesseract.js').Worker | null>(null)

  // 初始化 EXP 標籤 OCR Worker
  const initLabelWorker = useCallback(async () => {
    if (labelWorkerRef.current) return labelWorkerRef.current

    const { createWorker, PSM } = await import('tesseract.js')
    const worker = await createWorker('eng', 1, {
      logger: () => {},
    })

    await worker.setParameters({
      tessedit_char_whitelist: 'EXPexp:. ',
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

  // 從視頻擷取區域（不做預處理，保留原始顏色）
  const captureRegionRaw = useCallback(
    (video: HTMLVideoElement, region: Region): HTMLCanvasElement | null => {
      const canvas = document.createElement('canvas')
      canvas.width = region.width * SCALE
      canvas.height = region.height * SCALE

      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      const scaleX = video.videoWidth / video.clientWidth
      const scaleY = video.videoHeight / video.clientHeight

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      ctx.drawImage(
        video,
        region.x * scaleX,
        region.y * scaleY,
        region.width * scaleX,
        region.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      )

      return canvas
    },
    []
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
  const findExpLabel = useCallback(
    async (
      video: HTMLVideoElement,
      worker: import('tesseract.js').Worker
    ): Promise<ExpLabelResult | null> => {
      const videoWidth = video.clientWidth
      const videoHeight = video.clientHeight

      const startY = Math.floor(videoHeight * (1 - BOTTOM_SCAN_RATIO))
      const endY = videoHeight

      // 從中間開始掃描，向左右擴展（EXP 可能在中間下方）
      const xPositions: number[] = []
      const centerX = Math.floor(videoWidth / 2)
      for (let offset = 0; offset <= centerX; offset += 40) {
        if (centerX + offset < videoWidth - EXP_REGION_WIDTH) {
          xPositions.push(centerX + offset)
        }
        if (centerX - offset >= 0 && offset > 0) {
          xPositions.push(centerX - offset)
        }
      }

      for (let y = startY; y < endY - REGION_HEIGHT; y += SCAN_STRIDE) {
        if (cancelledRef.current) return null

        for (const x of xPositions) {
          const region: Region = {
            x,
            y,
            width: EXP_REGION_WIDTH,
            height: REGION_HEIGHT,
          }

          const canvas = captureRegion(video, region)
          if (!canvas) continue

          const result = await worker.recognize(canvas)
          const text = result.data.text.trim().toUpperCase()
          const confidence = result.data.confidence

          // 檢查是否包含 EXP
          if (text.includes('EXP') && confidence >= MIN_CONFIDENCE) {
            return {
              x,
              y,
              width: EXP_REGION_WIDTH,
              height: REGION_HEIGHT,
              confidence,
            }
          }
        }
      }

      return null
    },
    [captureRegion]
  )

  // 階段 2：從 EXP 位置往右找數字（嘗試多種預處理方式）
  const findExpNumber = useCallback(
    async (
      video: HTMLVideoElement,
      expLabel: ExpLabelResult,
      worker: import('tesseract.js').Worker
    ): Promise<AutoDetectResult | null> => {
      const videoWidth = video.clientWidth

      // 擴大擷取區域 - 包含 EXP 左右兩側
      const leftExtend = 100  // 往左延伸 100px
      const rightExtend = 200 // 往右延伸 200px

      const numberRegion: Region = {
        x: Math.max(0, expLabel.x - leftExtend),
        y: expLabel.y,
        width: leftExtend + expLabel.width + rightExtend,
        height: expLabel.height, // OCR 搜索區域保持原本高度
      }

      // 確保不超出視頻範圍
      if (numberRegion.x + numberRegion.width > videoWidth) {
        numberRegion.width = videoWidth - numberRegion.x
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
        const canvas = mode.useRaw
          ? captureRegionRaw(video, numberRegion)
          : captureRegion(video, numberRegion, mode.threshold, mode.invert)

        if (!canvas) continue

        const result = await worker.recognize(canvas)
        const text = result.data.text.trim()
        const confidence = result.data.confidence

        // 優先：提取 EXP 後面的數字
        const expMatch = text.match(EXP_AFTER_PATTERN)
        if (expMatch && confidence >= MIN_CONFIDENCE) {
          const expNumber = expMatch[1]

          // 使用 OCR 成功讀取數字的區域作為追蹤區域
          return {
            region: numberRegion,
            confidence,
            text: expNumber,
          }
        }

        // 備用：找最大的數字（可能是經驗值）
        const allNumbers = text.match(ANY_NUMBER_PATTERN)
        if (allNumbers && allNumbers.length > 0 && confidence >= MIN_CONFIDENCE) {
          // 找最大的數字（經驗值通常是最大的）
          const largestNumber = allNumbers.reduce((max, num) => {
            const numValue = parseInt(num.replace(/,/g, ''), 10)
            const maxValue = parseInt(max.replace(/,/g, ''), 10)
            return numValue > maxValue ? num : max
          })

          // 使用 OCR 成功讀取數字的區域作為追蹤區域
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
        const [labelWorker, numberWorker] = await Promise.all([
          initLabelWorker(),
          initNumberWorker(),
        ])

        // 階段 1：找 EXP 標籤
        const expLabel = await findExpLabel(video, labelWorker)
        if (!expLabel) {
          return null
        }

        // 階段 2：從 EXP 位置找數字
        const result = await findExpNumber(video, expLabel, numberWorker)
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

  return {
    isDetecting,
    detect,
    cancel,
  }
}
