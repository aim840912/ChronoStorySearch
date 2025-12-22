'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type {
  ExpRecord,
  ExpStats,
  UseExpTrackerOptions,
  UseExpTrackerReturn,
  NormalizedRegion,
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
  // 使用正規化座標（0-1 比例），確保視窗大小變化時仍能正確追蹤
  const normalizedRegionRef = useRef<NormalizedRegion | null>(null)
  // 追蹤最新的視訊尺寸，用於動態計算像素座標
  const videoSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 })
  const ocrFnRef = useRef<
    ((canvas: HTMLCanvasElement) => Promise<{ expValue: number | null; confidence: number; percentage: number | null }>) | null
  >(null)
  // Canvas 複用，避免每次擷取都建立新的 canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // 取得或建立 Canvas（複用以減少 GC 壓力）
  const getCanvas = useCallback((width: number, height: number): HTMLCanvasElement => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    canvasRef.current.width = width
    canvasRef.current.height = height
    return canvasRef.current
  }, [])

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

  // 設定 Video 和正規化區域（追蹤開始時呼叫）
  const setVideoAndRegion = useCallback(
    (video: HTMLVideoElement, normalizedRegion: NormalizedRegion, videoSize: { width: number; height: number }) => {
      videoRef.current = video
      normalizedRegionRef.current = normalizedRegion
      videoSizeRef.current = videoSize
    },
    []
  )

  // 更新視訊尺寸（視窗大小變化時呼叫，動態適應新尺寸）
  const updateVideoSize = useCallback((size: { width: number; height: number }) => {
    videoSizeRef.current = size
  }, [])

  // 執行一次擷取和辨識
  const captureAndRecognize = useCallback(async () => {
    const video = videoRef.current
    const normalized = normalizedRegionRef.current
    const size = videoSizeRef.current

    if (!video || !normalized || !ocrFnRef.current || size.width === 0) return

    // 動態計算像素座標（每次擷取時根據最新的視訊尺寸計算）
    // 這確保了視窗大小變化後仍能正確追蹤
    const region = {
      x: normalized.x * size.width,
      y: normalized.y * size.height,
      width: normalized.width * size.width,
      height: normalized.height * size.height,
    }

    // 放大倍率（提升 OCR 辨識率）
    // Tesseract.js 在較大的圖像上表現更好
    const SCALE = 3

    // 使用複用的 Canvas（減少 GC 壓力）
    const canvas = getCanvas(region.width * SCALE, region.height * SCALE)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 調試日誌 - 包含 video 播放狀態
    if (process.env.NODE_ENV === 'development') {
      console.log('[EXP] captureAndRecognize:', {
        normalized,
        region,
        canvasSize: { width: canvas.width, height: canvas.height },
        videoSize: size,
        videoPaused: video.paused,
        videoReadyState: video.readyState,
        videoCurrentTime: video.currentTime,
      })
    }

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
  }, [currentExp, onExpChange, getCanvas])

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
    // 清理 video srcObject 引用（讓 MediaStream 可以被正確釋放）
    if (videoRef.current) {
      videoRef.current.srcObject = null
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

  // Page Visibility 處理：頁面隱藏時暫停計時器，減少資源消耗
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isTracking) {
        // 頁面隱藏時，暫停計時器
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
      } else if (!document.hidden && isTracking) {
        // 頁面恢復可見時，重啟計時器
        setSecondsUntilNextCapture(captureInterval)

        countdownIntervalRef.current = setInterval(() => {
          setSecondsUntilNextCapture((prev) => {
            if (prev <= 1) return captureInterval
            return prev - 1
          })
        }, 1000)

        intervalRef.current = setInterval(() => {
          captureAndRecognize()
        }, captureInterval * 1000)

        // 恢復時立即執行一次
        captureAndRecognize()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isTracking, captureInterval, captureAndRecognize])

  // 清理
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      // 清理複用的 Canvas
      canvasRef.current = null
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
    updateVideoSize,
  } as UseExpTrackerReturn & {
    setOcrFunction: typeof setOcrFunction
    setVideoAndRegion: typeof setVideoAndRegion
    updateVideoSize: typeof updateVideoSize
    setInitialExp: typeof setInitialExp
    currentPercentage: typeof currentPercentage
    levelUpEstimate: typeof levelUpEstimate
  }
}
