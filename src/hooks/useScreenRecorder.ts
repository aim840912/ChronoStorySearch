'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  RecordingStatus,
  UseScreenRecorderOptions,
  UseScreenRecorderReturn,
  RecordingResult,
} from '@/types/screen-recorder'

/**
 * 螢幕錄製 Hook
 * 使用瀏覽器原生 MediaRecorder API 錄製螢幕
 */
export function useScreenRecorder(
  options: UseScreenRecorderOptions
): UseScreenRecorderReturn {
  const { duration, includeAudio, onComplete, onError } = options

  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)

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
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    mediaRecorderRef.current = null
    chunksRef.current = []
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
      streamRef.current = stream

      // 檢查支援的 MIME 類型
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4'

      // 建立 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      })
      mediaRecorderRef.current = mediaRecorder

      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordedBlob(blob)
        setStatus('stopped')

        const endTime = new Date()
        const result: RecordingResult = {
          blob,
          duration: elapsedTime,
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
        if (status === 'recording' || status === 'paused') {
          stop()
        }
      }

      // 開始錄製
      mediaRecorder.start(1000) // 每秒收集一次資料
      startTimeRef.current = new Date()
      setStatus('recording')

      // 設定計時器
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1
          // 達到時限自動停止
          if (newTime >= duration * 60) {
            stop()
          }
          return newTime
        })
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
  }, [isSupported, includeAudio, duration, onComplete, onError, cleanup, status])

  // 暫停錄影
  const pause = useCallback(() => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.pause()
      setStatus('paused')

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [status])

  // 繼續錄影
  const resume = useCallback(() => {
    if (mediaRecorderRef.current && status === 'paused') {
      mediaRecorderRef.current.resume()
      setStatus('recording')

      // 重新開始計時
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1
          if (newTime >= duration * 60) {
            stop()
          }
          return newTime
        })
      }, 1000)
    }
  }, [status, duration])

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

  // 下載錄製的影片
  const download = useCallback(
    (filename?: string) => {
      if (!recordedBlob) return

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const defaultFilename = `recording_${timestamp}.webm`
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

  // 組件卸載時清理
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    status,
    elapsedTime,
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
