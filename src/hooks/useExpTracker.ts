'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
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
  const [currentPercentage, setCurrentPercentage] = useState<number | null>(null)
  const [expHistory, setExpHistory] = useState<ExpRecord[]>([])
  const [stats, setStats] = useState<ExpStats>({
    expPerMinute: 0,
    expPer10Minutes: 0,
    expPerHour: 0,
    timeToLevelUp: null,
  })
  const [confidence, setConfidence] = useState(0)
  const [secondsUntilNextCapture, setSecondsUntilNextCapture] = useState(0)

  // 升級預估計算
  const levelUpEstimate = useMemo(() => {
    // 需要當前經驗、百分比、和每分鐘經驗才能計算
    if (!currentExp || !currentPercentage || currentPercentage <= 0 || !stats.expPerMinute || stats.expPerMinute <= 0) {
      return null
    }

    // 總經驗需求 = 當前經驗 / (百分比 / 100)
    const totalExpNeeded = currentExp / (currentPercentage / 100)
    // 剩餘經驗 = 總經驗 - 當前經驗
    const remainingExp = totalExpNeeded - currentExp
    // 升級時間（分鐘）= 剩餘經驗 / 每分鐘經驗
    const minutesToLevelUp = remainingExp / stats.expPerMinute

    return {
      totalExpNeeded: Math.round(totalExpNeeded),
      remainingExp: Math.round(remainingExp),
      minutesToLevelUp: Math.round(minutesToLevelUp),
    }
  }, [currentExp, currentPercentage, stats.expPerMinute])

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const regionRef = useRef<Region | null>(null)
  const ocrFnRef = useRef<
    ((canvas: HTMLCanvasElement) => Promise<{ expValue: number | null; confidence: number; percentage: number | null }>) | null
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

  // 當 expHistory 變化時，自動重新計算統計
  // 這樣可以避免閉包問題（captureAndRecognize 中的 expHistory 是舊值）
  useEffect(() => {
    if (expHistory.length >= 2) {
      setStats(calculateExpStats(expHistory))
    }
  }, [expHistory])

  // 設定 OCR 函數引用
  const setOcrFunction = useCallback(
    (fn: (canvas: HTMLCanvasElement) => Promise<{ expValue: number | null; confidence: number; percentage: number | null }>) => {
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

    // 調試日誌 - 包含 video 播放狀態
    if (process.env.NODE_ENV === 'development') {
      console.log('[EXP] captureAndRecognize:', {
        region,
        canvasSize: { width: canvas.width, height: canvas.height },
        videoSize: { width: video.videoWidth, height: video.videoHeight },
        videoPaused: video.paused,
        videoReadyState: video.readyState,
        videoCurrentTime: video.currentTime,
      })
    }

    // region 已經是實際影片座標（由 ExpTrackerFloating 使用 videoWidth/videoHeight 計算）
    // 不需要額外的縮放轉換

    // 使用較好的圖像縮放演算法
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

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

    // 輸出 canvas 預覽到 console（調試用）
    // 可在 Console 中點擊預覽或複製 data URL 到瀏覽器查看
    if (process.env.NODE_ENV === 'development') {
      const previewUrl = canvas.toDataURL('image/png')
      console.log('[EXP] Canvas preview (click to expand):', previewUrl)
    }

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

      // 更新百分比（如果 OCR 有偵測到）
      if (result.percentage !== null) {
        setCurrentPercentage(result.percentage)
      }

      setExpHistory((prev) => {
        const newHistory = [...prev, record]
        // 限制最多 500 筆記錄
        if (newHistory.length > 500) {
          return newHistory.slice(-500)
        }
        return newHistory
      })

      // 統計會由 useEffect 自動更新（監聯 expHistory 變化）

      onExpChange?.(record)
    }
  }, [currentExp, onExpChange])

  // 開始追蹤
  const start = useCallback(() => {
    if (isTracking) return

    setIsTracking(true)

    // 清空歷史記錄，從這次追蹤開始重新計算
    setExpHistory([])

    // 同時重置 stats（因為 useEffect 只在 expHistory.length >= 2 時才更新）
    setStats({
      expPerMinute: 0,
      expPer10Minutes: 0,
      expPerHour: 0,
      timeToLevelUp: null,
    })

    // 立即執行一次
    captureAndRecognize()

    // 初始化倒數計時
    setSecondsUntilNextCapture(captureInterval)

    // 每秒更新倒數
    countdownIntervalRef.current = setInterval(() => {
      setSecondsUntilNextCapture((prev) => {
        if (prev <= 1) {
          return captureInterval // 重置為完整間隔
        }
        return prev - 1
      })
    }, 1000)

    // 設定擷取定時器
    intervalRef.current = setInterval(() => {
      captureAndRecognize()
    }, captureInterval * 1000)
  }, [isTracking, captureInterval, captureAndRecognize])

  // 停止追蹤
  const stop = useCallback(() => {
    setIsTracking(false)
    setSecondsUntilNextCapture(0)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }, [])

  // 重置記錄
  const reset = useCallback(() => {
    stop()
    setExpHistory([])
    setCurrentExp(null)
    setPreviousExp(null)
    setCurrentPercentage(null)
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
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  return {
    isTracking,
    currentExp,
    previousExp,
    currentPercentage,
    levelUpEstimate,
    expHistory,
    stats,
    confidence,
    secondsUntilNextCapture,
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
    currentPercentage: typeof currentPercentage
    levelUpEstimate: typeof levelUpEstimate
  }
}
