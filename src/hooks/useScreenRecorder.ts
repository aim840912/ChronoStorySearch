'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  RecordingStatus,
  UseScreenRecorderOptions,
  UseScreenRecorderReturn,
  RecordingResult,
} from '@/types/screen-recorder'

// 循環模式：每 60 個過期 chunks 清理一次，避免記憶體洩漏
const LOOP_CLEANUP_THRESHOLD = 60

/**
 * 螢幕錄製 Hook
 * 使用瀏覽器原生 MediaRecorder API 錄製螢幕
 */
export function useScreenRecorder(
  options: UseScreenRecorderOptions
): UseScreenRecorderReturn {
  const {
    duration,
    includeAudio,
    videoFormat,
    recordingMode,
    loopDuration,
    onComplete,
    onError,
  } = options

  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [bufferDuration, setBufferDuration] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const chunkTimestampsRef = useRef<number[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const mimeTypeRef = useRef<string>('video/webm')
  const stopRef = useRef<() => void>(() => {})
  const elapsedTimeRef = useRef(0)
  const mountedRef = useRef(true)

  // 效能優化：使用索引追蹤有效起始位置，避免 shift() O(n) 操作
  const validStartIndexRef = useRef(0)
  // 暫停時間追蹤：用於補償 cutoff 計算
  const pausedDurationRef = useRef(0)
  const pauseStartTimeRef = useRef<number | null>(null)
  // bufferDuration 使用 ref 避免每秒重新渲染
  const bufferDurationRef = useRef(0)
  // 循環模式：保存第一個 chunk 作為初始化段（包含視頻標頭，必須保留）
  const initSegmentRef = useRef<Blob | null>(null)

  // 檢查瀏覽器是否支援
  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getDisplayMedia &&
    typeof MediaRecorder !== 'undefined'

  // 清理資源
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (streamRef.current) {
      console.log('[ScreenRecorder] 正在釋放 MediaStream', {
        tracks: streamRef.current.getTracks().length,
      })
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    mediaRecorderRef.current = null
    chunksRef.current = []
    chunkTimestampsRef.current = []
    validStartIndexRef.current = 0
    pausedDurationRef.current = 0
    pauseStartTimeRef.current = null
    bufferDurationRef.current = 0
    initSegmentRef.current = null
  }, [])

  // 開始錄影
  const start = useCallback(async () => {
    if (!isSupported) {
      const err = new Error('Browser does not support screen recording')
      setError(err)
      onError?.(err)
      return
    }

    try {
      setStatus('selecting')
      setError(null)
      setRecordedBlob(null)
      setElapsedTime(0)

      // 請求螢幕擷取權限
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          displaySurface: 'window',
        },
        audio: includeAudio,
      }

      const stream = await navigator.mediaDevices.getDisplayMedia(
        displayMediaOptions
      )

      // 組件卸載時中止操作
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      console.log('[ScreenRecorder] MediaStream 已建立', {
        tracks: stream.getTracks().length,
      })

      // 根據使用者選擇的格式決定 MIME 類型
      let mimeType: string
      if (videoFormat === 'mp4') {
        mimeType = MediaRecorder.isTypeSupported('video/mp4')
          ? 'video/mp4'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm'
      } else {
        mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : 'video/mp4'
      }
      mimeTypeRef.current = mimeType

      // 建立 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      })
      mediaRecorderRef.current = mediaRecorder

      chunksRef.current = []
      chunkTimestampsRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const now = Date.now()

          // 第一個 chunk 包含初始化段（視頻標頭），必須保存
          if (chunksRef.current.length === 0) {
            initSegmentRef.current = event.data
          }

          chunksRef.current.push(event.data)
          chunkTimestampsRef.current.push(now)

          // 循環模式：使用索引追蹤過期 chunks（O(1) 取代 shift() 的 O(n)）
          if (recordingMode === 'loop') {
            // cutoff 考慮暫停累計時間，避免恢復時錯誤刪除 buffer
            const cutoff = now - loopDuration * 1000 - pausedDurationRef.current
            while (
              validStartIndexRef.current < chunkTimestampsRef.current.length &&
              chunkTimestampsRef.current[validStartIndexRef.current] < cutoff
            ) {
              validStartIndexRef.current++
            }

            // 定期清理過期 chunks，避免記憶體洩漏
            // 當過期 chunks 超過閾值時，一次性移除並重置索引
            if (validStartIndexRef.current > LOOP_CLEANUP_THRESHOLD) {
              chunksRef.current = chunksRef.current.slice(validStartIndexRef.current)
              chunkTimestampsRef.current = chunkTimestampsRef.current.slice(validStartIndexRef.current)
              validStartIndexRef.current = 0
            }

            // 計算有效 buffer 時長（從第一個有效 chunk 開始）
            const validStartTimestamp = chunkTimestampsRef.current[validStartIndexRef.current]
            bufferDurationRef.current = validStartTimestamp
              ? Math.floor((now - validStartTimestamp) / 1000)
              : 0
          }
        }
      }

      mediaRecorder.onstop = () => {
        // 組件已卸載則跳過 state 更新
        if (!mountedRef.current) {
          cleanup()
          return
        }

        // 循環模式：只取有效範圍的 chunks（跳過已過期的部分）
        const validChunks = recordingMode === 'loop'
          ? chunksRef.current.slice(validStartIndexRef.current)
          : chunksRef.current

        // 循環模式：如果初始化段被跳過，需要重新加入
        // 初始化段包含視頻標頭（codec info、解析度等），沒有它播放器無法解析影片
        // 使用 reference 比較：如果第一個 chunk 不是初始化段，就需要加入
        const needsInitSegment =
          recordingMode === 'loop' &&
          initSegmentRef.current !== null &&
          validChunks.length > 0 &&
          validChunks[0] !== initSegmentRef.current

        const finalChunks = needsInitSegment
          ? [initSegmentRef.current!, ...validChunks]
          : validChunks

        const blob = new Blob(finalChunks, { type: mimeType })
        setRecordedBlob(blob)
        setStatus('stopped')

        // 循環模式：回傳實際 buffer 時長而非總錄影時長
        const validTimestamps = recordingMode === 'loop'
          ? chunkTimestampsRef.current.slice(validStartIndexRef.current)
          : []
        const actualDuration =
          recordingMode === 'loop' && validTimestamps.length > 0
            ? Math.floor((Date.now() - validTimestamps[0]) / 1000)
            : elapsedTimeRef.current

        const endTime = new Date()
        const result: RecordingResult = {
          blob,
          duration: actualDuration,
          startTime: startTimeRef.current || new Date(),
          endTime,
        }
        onComplete?.(result)

        cleanup()
      }

      mediaRecorder.onerror = () => {
        const err = new Error('Recording failed')
        setError(err)
        setStatus('idle')
        onError?.(err)
        cleanup()
      }

      // 監聽使用者停止分享
      stream.getVideoTracks()[0].onended = () => {
        console.log('[ScreenRecorder] 用戶停止分享')
        stopRef.current()
      }

      // 開始錄製
      mediaRecorder.start(1000) // 每秒收集一次資料
      startTimeRef.current = new Date()
      setStatus('recording')

      // 設定計時器
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1
          elapsedTimeRef.current = newTime // 同步更新 ref
          // 只有固定模式才自動停止
          if (recordingMode === 'fixed' && newTime >= duration * 60) {
            stopRef.current()
          }
          return newTime
        })

        // 循環模式：同步 bufferDuration state（統一在計時器中更新，減少渲染次數）
        if (recordingMode === 'loop') {
          setBufferDuration(bufferDurationRef.current)
        }
      }, 1000)
    } catch (err) {
      // 使用者取消選擇
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError(new Error('User cancelled window selection'))
      } else {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      }
      setStatus('idle')
      onError?.(err instanceof Error ? err : new Error('Unknown error'))
      cleanup()
    }
  }, [isSupported, includeAudio, videoFormat, duration, recordingMode, loopDuration, onComplete, onError, cleanup])

  // 暫停錄影
  const pause = useCallback(() => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.pause()
      setStatus('paused')

      // 記錄暫停開始時間（用於計算暫停累計時間）
      pauseStartTimeRef.current = Date.now()

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [status])

  // 繼續錄影
  const resume = useCallback(() => {
    if (mediaRecorderRef.current && status === 'paused') {
      // 累加暫停時長（用於 cutoff 計算，避免恢復時刪除 buffer）
      if (pauseStartTimeRef.current) {
        pausedDurationRef.current += Date.now() - pauseStartTimeRef.current
        pauseStartTimeRef.current = null
      }

      mediaRecorderRef.current.resume()
      setStatus('recording')

      // 重新開始計時
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1
          elapsedTimeRef.current = newTime // 同步更新 ref
          // 只有固定模式才自動停止
          if (recordingMode === 'fixed' && newTime >= duration * 60) {
            stopRef.current()
          }
          return newTime
        })

        // 循環模式：同步 bufferDuration state（統一在計時器中更新，減少渲染次數）
        if (recordingMode === 'loop') {
          setBufferDuration(bufferDurationRef.current)
        }
      }, 1000)
    }
  }, [status, duration, recordingMode])

  // 停止錄影
  const stop = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      (status === 'recording' || status === 'paused')
    ) {
      mediaRecorderRef.current.stop()

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [status])

  // 同步 stopRef，確保 interval callback 總是呼叫最新版本
  useEffect(() => {
    stopRef.current = stop
  }, [stop])

  // 下載錄製的影片
  const download = useCallback(
    (filename?: string) => {
      if (!recordedBlob) return

      // 根據實際 mimeType 決定副檔名
      const extension = mimeTypeRef.current.includes('mp4') ? 'mp4' : 'webm'
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const defaultFilename = `recording_${timestamp}.${extension}`
      const finalFilename = filename || defaultFilename

      const url = URL.createObjectURL(recordedBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = finalFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    [recordedBlob]
  )

  // 追蹤組件是否已卸載
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // 組件卸載時清理
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    status,
    elapsedTime,
    bufferDuration,
    isSupported,
    recordedBlob,
    start,
    pause,
    resume,
    stop,
    download,
    error,
  }
}
