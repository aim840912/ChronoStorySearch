'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import type {
  Region,
  AutoDetectResult,
  UseAutoRegionDetectorReturn,
} from '@/types/exp-tracker'

// 提取的常數和工具
import {
  BOTTOM_SCAN_RATIO,
  CENTER_SCAN_RATIO,
  MIN_CONFIDENCE,
  MAX_DETECT_TIME,
  BASE_WIDTH,
  BASE_REGION_HEIGHT,
  BASE_SCAN_STRIDE,
  BASE_EXP_REGION_WIDTH,
  BASE_X_STEP,
  EXP_KEYWORDS,
  EXP_AFTER_PATTERN,
  ANY_NUMBER_PATTERN,
  EXP_PATTERN_FALLBACK,
  LABEL_PREPROCESSING_MODES,
  NUMBER_PREPROCESSING_MODES,
} from '@/lib/ocr/ocr-constants'

import {
  normalizeOcrText,
  containsExpKeyword,
  extractLargestNumber,
} from '@/lib/ocr/text-normalizer'

// 提取的 Hooks
import { useDebugScans } from './auto-region/useDebugScans'
import { useOcrWorkers } from './auto-region/useOcrWorkers'
import { useCanvasCapture } from './auto-region/useCanvasCapture'

/**
 * 自動偵測 EXP 區域 Hook
 * 多策略偵測：
 * 1. 掃描找 "EXP" 標籤（含 OCR 誤讀容錯）
 * 2. 備用：尋找「大數字 + 百分比」模式
 * 3. 從找到的位置往右延伸找數字
 */

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
  const detectStartTimeRef = useRef<number>(0)

  // 使用提取的 Hooks
  const debug = useDebugScans()
  const workers = useOcrWorkers()
  const canvas = useCanvasCapture()

  // 檢查是否超時（防止長時間掃描影響系統）
  const isTimeout = useCallback(() => {
    return performance.now() - detectStartTimeRef.current > MAX_DETECT_TIME
  }, [])

  // 階段 1：掃描找 EXP 標籤
  const findExpLabel = useCallback(
    async (
      video: HTMLVideoElement,
      worker: import('tesseract.js').Worker
    ): Promise<ExpLabelResult | null> => {
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

      // 從中間開始掃描
      const xPositions: number[] = []
      const centerX = Math.floor(videoWidth / 2)
      const scanHalfWidth = Math.floor(videoWidth * CENTER_SCAN_RATIO / 2)

      for (let offset = 0; offset <= scanHalfWidth; offset += xStep) {
        if (centerX + offset < videoWidth - expRegionWidth) {
          xPositions.push(centerX + offset)
        }
        if (centerX - offset >= 0 && offset > 0) {
          xPositions.push(centerX - offset)
        }
      }

      for (let y = startY; y < endY - regionHeight; y += scanStride) {
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

          for (const mode of LABEL_PREPROCESSING_MODES) {
            const capturedCanvas = mode.useRaw
              ? canvas.captureRegionRaw(video, region)
              : canvas.captureRegion(video, region, mode.threshold, mode.invert)
            if (!capturedCanvas) continue

            const result = await worker.recognize(capturedCanvas)
            const rawText = result.data.text.trim()
            const text = normalizeOcrText(rawText).toUpperCase()
            const confidence = result.data.confidence

            const hasExpKeyword = containsExpKeyword(text, EXP_KEYWORDS)

            if (process.env.NODE_ENV === 'development' && text.length > 0) {
              console.log('[AutoDetect] Scanning:', { x, y, mode: mode.name, text, confidence, hasExpKeyword })
            }

            if (debug.debugModeRef.current && text.length > 0) {
              debug.addDebugScan({
                timestamp: Date.now(),
                region,
                capturedImage: capturedCanvas.toDataURL('image/png'),
                ocrText: text,
                confidence,
                matched: hasExpKeyword && confidence >= MIN_CONFIDENCE,
                preprocessMode: mode.name,
              })
            }

            if (hasExpKeyword && confidence >= MIN_CONFIDENCE) {
              return {
                x,
                y,
                width: expRegionWidth,
                height: regionHeight,
                confidence,
                text: result.data.text.trim(),
              }
            }
          }
        }
      }

      return null
    },
    [canvas, debug, isTimeout]
  )

  // 階段 2：從 EXP 位置往右找數字
  const findExpNumber = useCallback(
    async (
      video: HTMLVideoElement,
      expLabel: ExpLabelResult,
      worker: import('tesseract.js').Worker
    ): Promise<AutoDetectResult | null> => {
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight

      // 優先策略：檢查掃描文字是否已包含 EXP 數字
      if (expLabel.text) {
        const expMatch = expLabel.text.match(EXP_AFTER_PATTERN)
        const allNumbers = expLabel.text.match(ANY_NUMBER_PATTERN)

        if (process.env.NODE_ENV === 'development') {
          console.log('[AutoDetect] Checking scan text:', { text: expLabel.text, expMatch, allNumbers })
        }

        if (expMatch) {
          const scanRegion: Region = {
            x: expLabel.x,
            y: expLabel.y,
            width: expLabel.width,
            height: expLabel.height,
          }
          return { region: scanRegion, confidence: expLabel.confidence, text: expMatch[1] }
        }

        const largestNumber = extractLargestNumber(expLabel.text, ANY_NUMBER_PATTERN)
        if (largestNumber) {
          const numValue = parseInt(largestNumber.replace(/,/g, ''), 10)
          if (numValue >= 1000) {
            const scanRegion: Region = {
              x: expLabel.x,
              y: expLabel.y,
              width: expLabel.width,
              height: expLabel.height,
            }
            return { region: scanRegion, confidence: expLabel.confidence, text: largestNumber }
          }
        }
      }

      // 備用策略：擴大擷取區域
      const scale = videoWidth / 1920
      const leftExtend = Math.round(100 * scale)
      const rightExtend = Math.round(200 * scale)

      const numberRegion: Region = {
        x: Math.max(0, expLabel.x - leftExtend),
        y: expLabel.y,
        width: leftExtend + expLabel.width + rightExtend,
        height: expLabel.height,
      }

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

      for (const mode of NUMBER_PREPROCESSING_MODES) {
        const capturedCanvas = mode.useRaw
          ? canvas.captureRegionRaw(video, numberRegion)
          : canvas.captureRegion(video, numberRegion, mode.threshold, mode.invert)

        if (!capturedCanvas) continue

        const result = await worker.recognize(capturedCanvas)
        const text = result.data.text.trim()
        const confidence = result.data.confidence

        const expMatch = text.match(EXP_AFTER_PATTERN)
        const allNumbers = text.match(ANY_NUMBER_PATTERN)

        if (process.env.NODE_ENV === 'development') {
          console.log('[AutoDetect] findExpNumber:', { mode: mode.name, text, confidence, expMatch, allNumbers })
        }

        if (expMatch && confidence >= MIN_CONFIDENCE) {
          return { region: numberRegion, confidence, text: expMatch[1] }
        }

        if (allNumbers && allNumbers.length > 0 && confidence >= MIN_CONFIDENCE) {
          const largestNumber = extractLargestNumber(text, ANY_NUMBER_PATTERN)
          if (largestNumber) {
            return { region: numberRegion, confidence, text: largestNumber }
          }
        }
      }

      return null
    },
    [canvas]
  )

  // 備用策略：直接尋找「大數字 + 百分比」模式
  const findExpByPattern = useCallback(
    async (
      video: HTMLVideoElement,
      worker: import('tesseract.js').Worker
    ): Promise<AutoDetectResult | null> => {
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight

      const resolutionScale = videoWidth / BASE_WIDTH
      const regionHeight = Math.round(BASE_REGION_HEIGHT * resolutionScale)
      const scanStride = Math.round(BASE_SCAN_STRIDE * resolutionScale)
      const regionWidth = Math.round(200 * resolutionScale)

      const startY = Math.floor(videoHeight * (1 - BOTTOM_SCAN_RATIO))
      const endY = videoHeight

      for (let y = startY; y < endY - regionHeight; y += scanStride) {
        if (cancelledRef.current || isTimeout()) {
          if (isTimeout()) console.warn('[AutoDetect] findExpByPattern 超時')
          return null
        }

        for (let x = videoWidth - regionWidth; x >= videoWidth * 0.3; x -= Math.round(40 * resolutionScale)) {
          const region: Region = { x, y, width: regionWidth, height: regionHeight }

          for (const mode of LABEL_PREPROCESSING_MODES) {
            const capturedCanvas = mode.useRaw
              ? canvas.captureRegionRaw(video, region)
              : canvas.captureRegion(video, region, mode.threshold, mode.invert)

            if (!capturedCanvas) continue

            const result = await worker.recognize(capturedCanvas)
            const rawText = result.data.text.trim()
            const text = normalizeOcrText(rawText)
            const confidence = result.data.confidence

            if (debug.debugModeRef.current && text.length > 0) {
              debug.addDebugScan({
                timestamp: Date.now(),
                region,
                capturedImage: capturedCanvas.toDataURL('image/png'),
                ocrText: text,
                confidence,
                matched: EXP_PATTERN_FALLBACK.test(text),
                preprocessMode: mode.name,
              })
            }

            const patternMatch = text.match(EXP_PATTERN_FALLBACK)
            if (patternMatch && confidence >= MIN_CONFIDENCE) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[AutoDetect] Pattern match found:', { text, patternMatch })
              }
              return { region, confidence, text: patternMatch[1] }
            }
          }
        }
      }

      return null
    },
    [canvas, debug, isTimeout]
  )

  // 執行自動偵測
  const detect = useCallback(
    async (video: HTMLVideoElement): Promise<AutoDetectResult | null> => {
      if (isDetecting) return null

      setIsDetecting(true)
      cancelledRef.current = false
      detectStartTimeRef.current = performance.now()

      try {
        const detectStartTime = performance.now()

        const [labelWorker, numberWorker] = await Promise.all([
          workers.initLabelWorker(),
          workers.initNumberWorker(),
        ])

        // 階段 1：找 EXP 標籤
        const labelStartTime = performance.now()
        const expLabel = await findExpLabel(video, labelWorker)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[AutoDetect] findExpLabel 耗時: ${Math.round(performance.now() - labelStartTime)}ms`)
        }

        if (expLabel) {
          const numberStartTime = performance.now()
          const result = await findExpNumber(video, expLabel, numberWorker)
          if (process.env.NODE_ENV === 'development') {
            console.log(`[AutoDetect] findExpNumber 耗時: ${Math.round(performance.now() - numberStartTime)}ms`)
            console.log(`[AutoDetect] 總偵測耗時: ${Math.round(performance.now() - detectStartTime)}ms`)
          }
          if (result) return result
        }

        // 備用策略
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
    [isDetecting, workers, findExpLabel, findExpNumber, findExpByPattern]
  )

  // 取消偵測
  const cancel = useCallback(() => {
    cancelledRef.current = true
  }, [])

  // 清理所有資源
  const cleanup = useCallback(() => {
    workers.cleanup()
    canvas.cleanupCanvas()
  }, [workers, canvas])

  return useMemo(
    () => ({
      isDetecting,
      detect,
      cancel,
      cleanup,
      debugMode: debug.debugMode,
      setDebugMode: debug.setDebugMode,
      debugScans: debug.debugScans,
      clearDebugScans: debug.clearDebugScans,
    }),
    [
      isDetecting,
      detect,
      cancel,
      cleanup,
      debug.debugMode,
      debug.setDebugMode,
      debug.debugScans,
      debug.clearDebugScans,
    ]
  )
}
