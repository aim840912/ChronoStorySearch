'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  ExpRecord,
  ExpStats,
  UseExpTrackerOptions,
  UseExpTrackerReturn,
  Region,
} from '@/types/exp-tracker'
import { calculateExpStats, downloadCsv } from '@/lib/exp-calculator'
import { getExpTrackerState, setExpTrackerState } from '@/lib/storage'

/**
 * EXP 追蹤 Hook
 * 定時擷取畫面並執行 OCR 辨識經驗值
 */
export function useExpTracker(
  options: UseExpTrackerOptions
): UseExpTrackerReturn {
  const { captureInterval, onExpChange } = options

  const [isTracking, setIsTracking] = useState(false)
  const [currentExp, setCurrentExp] = useState<number | null>(null)
  const [previousExp, setPreviousExp] = useState<number | null>(null)
  const [expHistory, setExpHistory] = useState<ExpRecord[]>([])
  const [stats, setStats] = useState<ExpStats>({
    expPerMinute: 0,
    expPer10Minutes: 0,
    expPerHour: 0,
    timeToLevelUp: null,
  })
  const [confidence, setConfidence] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const regionRef = useRef<Region | null>(null)
  const ocrFnRef = useRef<
    ((canvas: HTMLCanvasElement) => Promise<{ expValue: number | null; confidence: number }>) | null
  >(null)

  // 載入儲存的歷史記錄
  useEffect(() => {
    const savedState = getExpTrackerState()
    if (savedState.history.length > 0) {
      setExpHistory(savedState.history)
      setStats(calculateExpStats(savedState.history))
      if (savedState.history.length > 0) {
        const lastRecord = savedState.history[savedState.history.length - 1]
        setCurrentExp(lastRecord.exp)
      }
    }
  }, [])

  // 儲存歷史記錄
  useEffect(() => {
    const savedState = getExpTrackerState()
    setExpTrackerState({
      ...savedState,
      history: expHistory,
    })
  }, [expHistory])

  // 設定 OCR 函數引用
  const setOcrFunction = useCallback(
    (fn: (canvas: HTMLCanvasElement) => Promise<{ expValue: number | null; confidence: number }>) => {
      ocrFnRef.current = fn
    },
    []
  )

  // 設定 Video 和 Region 引用
  const setVideoAndRegion = useCallback(
    (video: HTMLVideoElement, region: Region) => {
      videoRef.current = video
      regionRef.current = region
    },
    []
  )

  // 執行一次擷取和辨識
  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || !regionRef.current || !ocrFnRef.current) return

    const video = videoRef.current
    const region = regionRef.current

    // 放大倍率（提升 OCR 辨識率）
    // Tesseract.js 在較大的圖像上表現更好
    const SCALE = 3

    // 建立 Canvas 並繪製選取區域（放大 3 倍）
    const canvas = document.createElement('canvas')
    canvas.width = region.width * SCALE
    canvas.height = region.height * SCALE

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 計算實際影片座標（考慮影片縮放）
    const scaleX = video.videoWidth / video.clientWidth
    const scaleY = video.videoHeight / video.clientHeight

    // 使用較好的圖像縮放演算法
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

    // 不做預處理，讓 useOcr 統一處理多種預處理方式

    // 執行 OCR
    const result = await ocrFnRef.current(canvas)

    if (result.expValue !== null) {
      const record: ExpRecord = {
        timestamp: Date.now(),
        exp: result.expValue,
        confidence: result.confidence,
      }

      setPreviousExp(currentExp)
      setCurrentExp(result.expValue)
      setConfidence(result.confidence)

      setExpHistory((prev) => {
        const newHistory = [...prev, record]
        // 限制最多 500 筆記錄
        if (newHistory.length > 500) {
          return newHistory.slice(-500)
        }
        return newHistory
      })

      // 更新統計
      setStats(() => {
        const newHistory = [...expHistory, record]
        return calculateExpStats(newHistory)
      })

      onExpChange?.(record)
    }
  }, [currentExp, expHistory, onExpChange])

  // 開始追蹤
  const start = useCallback(() => {
    if (isTracking) return

    setIsTracking(true)

    // 立即執行一次
    captureAndRecognize()

    // 設定定時器
    intervalRef.current = setInterval(() => {
      captureAndRecognize()
    }, captureInterval * 1000)
  }, [isTracking, captureInterval, captureAndRecognize])

  // 停止追蹤
  const stop = useCallback(() => {
    setIsTracking(false)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // 重置記錄
  const reset = useCallback(() => {
    stop()
    setExpHistory([])
    setCurrentExp(null)
    setPreviousExp(null)
    setConfidence(0)
    setStats({
      expPerMinute: 0,
      expPer10Minutes: 0,
      expPerHour: 0,
      timeToLevelUp: null,
    })
  }, [stop])

  // 匯出 CSV
  const exportCsv = useCallback(() => {
    if (expHistory.length === 0) return
    downloadCsv(expHistory)
  }, [expHistory])

  // 設定初始經驗值（用於自動偵測後顯示）
  const setInitialExp = useCallback((exp: number) => {
    setCurrentExp(exp)
  }, [])

  // 清理
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    isTracking,
    currentExp,
    previousExp,
    expHistory,
    stats,
    confidence,
    start,
    stop,
    reset,
    exportCsv,
    setInitialExp,
    // 內部使用的設定函數
    setOcrFunction,
    setVideoAndRegion,
  } as UseExpTrackerReturn & {
    setOcrFunction: typeof setOcrFunction
    setVideoAndRegion: typeof setVideoAndRegion
    setInitialExp: typeof setInitialExp
  }
}
