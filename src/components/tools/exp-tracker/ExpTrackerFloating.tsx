'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { useOcr } from '@/hooks/useOcr'
import { useRegionSelector } from '@/hooks/useRegionSelector'
import { useExpTracker } from '@/hooks/useExpTracker'
import { useAutoRegionDetector } from '@/hooks/useAutoRegionDetector'
import { useDraggable } from '@/hooks/useDraggable'
import { useResizable } from '@/hooks/useResizable'
import {
  getExpTrackerState,
  setExpTrackerState,
  getExpTrackerFloatingState,
  setExpTrackerFloatingState,
} from '@/lib/storage'
import { formatExp, getIntervalLabel, calculateExpPerInterval } from '@/lib/exp-calculator'
import { ExpDisplay } from './ExpDisplay'
import { ExpStats } from './ExpStats'
import { ExpHistory } from './ExpHistory'
import { SaveExpForm } from './SaveExpForm'
import { SavedRecords } from './SavedRecords'
import { RegionSelectorModal } from './RegionSelectorModal'
import { DebugScanPanel } from './DebugScanPanel'
import type { SavedExpRecord, NormalizedRegion } from '@/types/exp-tracker'

interface ExpTrackerFloatingProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * EXP 經驗追蹤器 - 懸浮視窗版
 * 可拖曳、可最小化的懸浮視窗
 */
export function ExpTrackerFloating({ isOpen, onClose }: ExpTrackerFloatingProps) {
  const { t: contextT } = useLanguage()
  const { showToast } = useToast()

  // 翻譯函數
  const t = useCallback(
    (key: string) => contextT(`expTracker.${key}`),
    [contextT]
  )

  // UI 狀態
  const [isMinimized, setIsMinimized] = useState(false)
  const [isVideoExpanded, setIsVideoExpanded] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false)
  const [isAutoDetecting, setIsAutoDetecting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 320, height: 400 })
  const [minimizedWidth, setMinimizedWidth] = useState(180)

  // 資料狀態
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [captureInterval, setCaptureInterval] = useState(60)
  const [savedRecords, setSavedRecords] = useState<SavedExpRecord[]>([])
  const [editingRecord, setEditingRecord] = useState<SavedExpRecord | null>(null)
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })

  const videoRef = useRef<HTMLVideoElement>(null)
  const pendingRegionSelectRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const trackerRef = useRef<ReturnType<typeof useExpTracker> | null>(null)
  const rafIdRef = useRef<number | null>(null)

  // Hooks
  const ocr = useOcr()
  const regionSelector = useRegionSelector()
  const autoDetector = useAutoRegionDetector()
  const tracker = useExpTracker({
    captureInterval,
    onExpChange: () => {},
  }) as ReturnType<typeof useExpTracker> & {
    setOcrFunction: (
      fn: (canvas: HTMLCanvasElement) => Promise<{ expValue: number | null; confidence: number; percentage: number | null }>
    ) => void
    setVideoAndRegion: (
      video: HTMLVideoElement,
      normalizedRegion: NormalizedRegion,
      videoSize: { width: number; height: number }
    ) => void
    updateVideoSize: (size: { width: number; height: number }) => void
    setInitialExp: (exp: number) => void
  }

  // 拖曳功能
  const { position, isDragging, setPosition, dragHandlers } = useDraggable({
    // 儲存邏輯已移至 useEffect 統一處理，避免重複儲存
  })

  // 調整大小功能（展開狀態）
  const resizable = useResizable({
    initialSize: windowSize,
    minSize: { width: 280, height: 200 },
    maxSize: { width: 500, height: 800 },
    enabled: !isMinimized,
    onSizeChange: (size) => {
      setWindowSize(size)
      // 儲存邏輯已移至 useEffect 統一處理，避免重複儲存
    },
    onPositionChange: ({ dx, dy }) => {
      // 拖曳左/上邊時調整位置
      setPosition({ x: position.x + dx, y: position.y + dy })
    },
  })

  // 調整大小功能（最小化狀態）- 只調整寬度
  const minimizedResizable = useResizable({
    initialSize: { width: minimizedWidth, height: 40 },
    minSize: { width: 120, height: 40 },
    maxSize: { width: 300, height: 40 },
    enabled: isMinimized,
    onSizeChange: (size) => {
      setMinimizedWidth(size.width)
      // 儲存邏輯已移至 useEffect 統一處理，避免重複儲存
    },
    onPositionChange: ({ dx }) => {
      // 拖曳左邊時調整位置
      setPosition({ x: position.x + dx, y: position.y })
    },
  })

  // Client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // 載入儲存的設定
  useEffect(() => {
    if (isOpen) {
      const state = getExpTrackerState()
      // 驗證 captureInterval 是否在有效範圍內（30, 60, 120）
      const validIntervals = [30, 60, 120]
      const savedInterval = state.captureInterval
      setCaptureInterval(validIntervals.includes(savedInterval) ? savedInterval : 60)
      setSavedRecords(state.savedRecords || [])
      if (state.region) {
        regionSelector.setNormalizedRegion(state.region)
      }

      // 載入懸浮視窗狀態
      const floatingState = getExpTrackerFloatingState()
      setIsMinimized(floatingState.isMinimized)
      setIsVideoExpanded(floatingState.isVideoExpanded)
      setIsPinned(floatingState.isPinned ?? false)
      if (floatingState.position.x >= 0 && floatingState.position.y >= 0) {
        setPosition(floatingState.position)
      }
      // 載入尺寸
      if (floatingState.size) {
        setWindowSize(floatingState.size)
        resizable.setSize(floatingState.size)
      }
      if (floatingState.minimizedWidth) {
        setMinimizedWidth(floatingState.minimizedWidth)
        minimizedResizable.setSize({ width: floatingState.minimizedWidth, height: 40 })
      }
    }
  }, [isOpen])

  // 儲存設定
  useEffect(() => {
    if (isOpen) {
      const state = getExpTrackerState()
      setExpTrackerState({
        ...state,
        captureInterval,
        savedRecords,
        region: regionSelector.normalizedRegion,
      })
    }
  }, [captureInterval, savedRecords, regionSelector.normalizedRegion, isOpen])

  // Debounced 儲存懸浮視窗狀態（避免拖曳時頻繁寫入 localStorage）
  const debouncedSaveFloatingState = useMemo(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const debounced = (state: Parameters<typeof setExpTrackerFloatingState>[0]) => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setExpTrackerFloatingState(state)
      }, 300)
    }
    debounced.cancel = () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
    return debounced
  }, [])

  // 儲存懸浮視窗狀態（使用 debounce 減少寫入頻率）
  useEffect(() => {
    if (isOpen) {
      debouncedSaveFloatingState({
        position,
        isMinimized,
        isPinned,
        isVideoExpanded,
        size: windowSize,
        minimizedWidth,
      })
    }
  }, [isOpen, position, isMinimized, isPinned, isVideoExpanded, windowSize, minimizedWidth, debouncedSaveFloatingState])

  // 清理 debounce timer
  useEffect(() => {
    return () => {
      debouncedSaveFloatingState.cancel()
    }
  }, [debouncedSaveFloatingState])

  // 設定 OCR 函數
  useEffect(() => {
    if (ocr.isReady) {
      tracker.setOcrFunction(async (canvas: HTMLCanvasElement) => {
        const result = await ocr.recognize(canvas)
        return {
          expValue: result.expValue,
          confidence: result.confidence,
          percentage: result.percentage,
        }
      })
    }
  }, [ocr.isReady, ocr.recognize, tracker])

  // 設定視訊串流到 video 元素，並確保播放
  // 注意：當 RegionSelectorModal 開啟時，由 modal 處理 srcObject，避免競爭條件
  useEffect(() => {
    const video = videoRef.current
    // 當 modal 開啟時，不設定 srcObject（由 modal 處理）
    if (!video || !stream || isRegionModalOpen) return

    video.srcObject = stream

    // 確保 video 開始播放
    const playVideo = async () => {
      try {
        await video.play()
        if (process.env.NODE_ENV === 'development') {
          console.log('[EXP] Video playing:', {
            paused: video.paused,
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
          })
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[EXP] Video play failed:', err)
        }
      }
    }

    // 監聽可播放事件
    const handleCanPlay = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[EXP] Video can play, starting...')
      }
      playVideo()
    }

    video.addEventListener('canplay', handleCanPlay)

    // 如果已經可以播放，立即開始
    if (video.readyState >= 3) {
      playVideo()
    }

    return () => {
      video.removeEventListener('canplay', handleCanPlay)
      // 清理 srcObject 引用
      if (video) {
        video.srcObject = null
      }
    }
  }, [stream, isRegionModalOpen])

  // 設定 Video 和正規化區域（傳遞正規化座標，讓追蹤器動態計算像素座標）
  useEffect(() => {
    if (videoRef.current && regionSelector.normalizedRegion && videoSize.width > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[EXP] Setting region:', {
          normalizedRegion: regionSelector.normalizedRegion,
          videoSize,
        })
      }
      // 傳遞正規化座標和當前視訊尺寸，讓追蹤器能夠動態適應視窗大小變化
      tracker.setVideoAndRegion(videoRef.current, regionSelector.normalizedRegion, videoSize)
    }
  }, [regionSelector.normalizedRegion, videoSize, tracker.setVideoAndRegion])

  // 追蹤期間視訊尺寸變化時，更新追蹤器的尺寸資訊
  // 這確保了調整遊戲視窗大小後，追蹤仍能正確運作
  useEffect(() => {
    if (tracker.isTracking && videoSize.width > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[EXP] Updating video size during tracking:', videoSize)
      }
      tracker.updateVideoSize(videoSize)
    }
  }, [videoSize, tracker.isTracking, tracker.updateVideoSize])

  // 監聽 video 尺寸變化
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateSize = () => {
      // 使用 videoWidth/videoHeight（影片實際尺寸）
      // 而非 clientWidth/clientHeight（DOM 顯示尺寸）
      // 只在有效尺寸時更新，避免時序問題
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[EXP] Video size updated:', video.videoWidth, 'x', video.videoHeight)
        }
        setVideoSize({
          width: video.videoWidth,
          height: video.videoHeight,
        })

        // 如果有待處理的區域選擇，在 video 載入完成後自動偵測
        if (pendingRegionSelectRef.current) {
          pendingRegionSelectRef.current = false
          // 延遲一幀確保 video 完全準備好（追蹤 ID 以便取消）
          rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null
            handleAutoDetect()
          })
        }
      }
    }

    // 監聽 loadedmetadata 事件
    video.addEventListener('loadedmetadata', updateSize)

    // 如果影片已經載入（readyState >= 1），立即更新
    if (video.readyState >= 1) {
      updateSize()
    }

    return () => {
      video.removeEventListener('loadedmetadata', updateSize)
    }
  }, [stream])

  // 自動偵測 EXP 區域
  // 注意：使用 video.videoWidth/videoHeight 而非 videoSize state
  // 避免 React state 批次更新造成的閉包陷阱（stale closure）
  const handleAutoDetect = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return

    setIsAutoDetecting(true)
    const MAX_RETRIES = 3

    try {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[EXP] Auto-detect attempt ${attempt}/${MAX_RETRIES}`)
        }

        const result = await autoDetector.detect(video)

        if (result && result.region) {
          // 成功：轉換為正規化座標並設定
          // 使用 video.videoWidth/videoHeight 確保取得最新值
          const normalized = {
            x: result.region.x / video.videoWidth,
            y: result.region.y / video.videoHeight,
            width: result.region.width / video.videoWidth,
            height: result.region.height / video.videoHeight,
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('[EXP] Auto-detect success:', { result, normalized })
          }

          regionSelector.setNormalizedRegion(normalized)
          showToast(`${t('autoDetectSuccess')}: ${result.text}`, 'success')
          return
        }

        // 重試等待
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 500))
        }
      }

      // 全部失敗：開啟手動框選
      if (process.env.NODE_ENV === 'development') {
        console.log('[EXP] Auto-detect failed, opening manual selection')
      }
      showToast(t('autoDetectFailed'), 'info')
      setIsRegionModalOpen(true)
    } finally {
      setIsAutoDetecting(false)
    }
  }, [autoDetector, regionSelector, showToast, t])

  // 選擇遊戲視窗
  const selectWindow = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'window' },
        audio: false,
      })
      setStream(displayStream)

      if (process.env.NODE_ENV === 'development') {
        console.log('[EXP] Window selected')
      }

      // 標記需要在 video 載入後開啟區域選擇
      pendingRegionSelectRef.current = true

      displayStream.getVideoTracks()[0].onended = () => {
        setStream(null)
        trackerRef.current?.stop()  // 使用 ref 避免 stale closure
      }
    } catch (error) {
      // 確保清理任何可能的殘留 stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.onended = null
          track.stop()
        })
        setStream(null)
      }
      if ((error as Error).name !== 'NotAllowedError') {
        showToast(t('error.notSupported'), 'error')
      }
    }
  }, [showToast, t])

  // 開始追蹤
  const handleStartTracking = useCallback(() => {
    if (!regionSelector.normalizedRegion) {
      showToast(t('error.noRegion'), 'error')
      return
    }
    if (!ocr.isReady) {
      showToast(t('error.ocrLoading'), 'error')
      return
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[EXP] Tracking started')
    }
    tracker.start()
  }, [regionSelector.normalizedRegion, ocr.isReady, tracker, showToast, t])

  // 停止追蹤（同時釋放視訊串流，避免干擾 Windows 鍵）
  const handleStopTracking = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[EXP] Tracking stopped, stream released')
    }
    tracker.stop()
    // 使用 ref 確保獲取最新的 stream 值（避免 stale closure）
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.onended = null
        track.stop()
      })
      setStream(null)
    }
  }, [tracker])

  // 從大螢幕 Modal 選擇區域
  const handleRegionSelected = useCallback((region: NormalizedRegion) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[EXP] Region selected:', region)
    }
    regionSelector.setNormalizedRegion(region)
    showToast(t('regionSelected'), 'success')
  }, [regionSelector, showToast, t])

  // 開啟區域選擇 Modal
  const openRegionSelector = useCallback(() => {
    if (!stream) {
      showToast(t('error.noStream'), 'error')
      return
    }
    setIsRegionModalOpen(true)
  }, [stream, showToast, t])

  // 儲存經驗記錄
  const handleSaveRecord = useCallback(
    (record: Omit<SavedExpRecord, 'id' | 'savedAt'>) => {
      const newRecord: SavedExpRecord = {
        ...record,
        id: crypto.randomUUID(),
        savedAt: Date.now(),
      }
      setSavedRecords((prev) => [newRecord, ...prev])
      showToast(t('recordSaved'), 'success')
    },
    [showToast, t]
  )

  // 刪除經驗記錄
  const handleDeleteRecord = useCallback(
    (id: string) => {
      setSavedRecords((prev) => prev.filter((r) => r.id !== id))
      showToast(t('recordDeleted'), 'success')
    },
    [showToast, t]
  )

  // 編輯經驗記錄
  const handleEditRecord = useCallback((record: SavedExpRecord) => {
    setEditingRecord(record)
  }, [])

  // 更新經驗記錄
  const handleUpdateRecord = useCallback(
    (updatedRecord: SavedExpRecord) => {
      setSavedRecords((prev) =>
        prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
      )
      setEditingRecord(null)
      showToast(t('recordUpdated'), 'success')
    },
    [showToast, t]
  )

  // 取消編輯
  const handleCancelEdit = useCallback(() => {
    setEditingRecord(null)
  }, [])

  // 關閉視窗（明確清理所有資源）
  const handleClose = useCallback(() => {
    // 取消 pending 的 requestAnimationFrame
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    // 停止追蹤
    tracker.stop()
    // 釋放 MediaStream（先移除 onended 處理器避免閉包持有引用）
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.onended = null
        track.stop()
      })
      setStream(null)
    }
    // 清理 video srcObject
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    // 終止 Tesseract Workers（避免資源洩漏導致系統延遲）
    ocr.terminateWorker()
    autoDetector.cleanup()
    // 呼叫父層的 onClose
    onClose()
  }, [tracker, onClose, ocr, autoDetector])

  // 同步 refs（避免 stale closure 問題）
  useEffect(() => {
    streamRef.current = stream
  }, [stream])

  useEffect(() => {
    trackerRef.current = tracker
  }, [tracker])

  // 元件卸載時確保清理所有資源（使用 ref 確保清理最新值）
  useEffect(() => {
    return () => {
      // 取消 pending 的 requestAnimationFrame
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      // 停止 MediaStream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.onended = null
          track.stop()
        })
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      trackerRef.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 空依賴，只在卸載時執行

  // 瀏覽器支援檢查
  const isSupported =
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getDisplayMedia

  if (!isOpen || !mounted) return null

  // 動態 z-index：釘選時在 Modal 上層
  const zIndex = isPinned ? 'z-[70]' : 'z-50'

  // 最小化狀態
  if (isMinimized) {
    return createPortal(
      <div
        ref={minimizedResizable.containerRef}
        className={`fixed ${zIndex} bg-purple-500 text-white rounded-lg shadow-lg select-none`}
        style={{
          left: position.x,
          top: position.y,
          width: minimizedResizable.size.width,
          cursor: minimizedResizable.cursorStyle || (isDragging ? 'grabbing' : 'grab'),
        }}
      >
        {/* 拖曳區域 */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-2"
          {...dragHandlers}
        >
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <span className="text-sm font-medium shrink-0">EXP</span>
            <span className="text-sm font-mono truncate">
              {tracker.stats.expPerMinute > 0
                ? `+${formatExp(calculateExpPerInterval(tracker.stats.expPerMinute, captureInterval))}/${getIntervalLabel(captureInterval)}`
                : '--'}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* 釘選按鈕 */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1 rounded ${isPinned ? 'bg-purple-600' : 'hover:bg-purple-600'}`}
              aria-label={isPinned ? t('unpin') : t('pin')}
            >
              <svg className="w-4 h-4" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v6l-2 4v2h10v-2l-2-4V4M12 16v5M8 4h8" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="p-1 hover:bg-purple-600 rounded"
              aria-label={t('expand')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 hover:bg-purple-600 rounded"
              aria-label={t('close')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // 完整視窗
  return createPortal(
    <div
      ref={resizable.containerRef}
      className={`fixed ${zIndex} bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col`}
      style={{
        left: position.x,
        top: position.y,
        width: resizable.size.width,
        height: resizable.size.height,
        cursor: resizable.cursorStyle || (isDragging ? 'grabbing' : ''),
      }}
    >
      {/* 標題列（可拖曳） */}
      <div
        className="shrink-0 flex items-center justify-between px-3 py-2 bg-purple-500 text-white rounded-t-lg cursor-grab select-none"
        onMouseDown={(e) => {
          // 如果在 resize 邊緣，不啟動拖曳
          if (resizable.activeEdge) return
          dragHandlers.onMouseDown(e)
        }}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 opacity-50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          </svg>
          <span className="text-sm font-bold">{t('title')}</span>
          <span className="text-xs px-1.5 py-0.5 bg-white/20 rounded-full">{t('testing')}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* 釘選按鈕 */}
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`p-1 rounded ${isPinned ? 'bg-purple-600' : 'hover:bg-purple-600'}`}
            aria-label={isPinned ? t('unpin') : t('pin')}
            title={isPinned ? t('unpin') : t('pin')}
          >
            <svg className="w-4 h-4" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v6l-2 4v2h10v-2l-2-4V4M12 16v5M8 4h8" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-purple-600 rounded"
            aria-label={t('minimize')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 hover:bg-purple-600 rounded"
            aria-label={t('close')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 內容區 */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-3 space-y-3">
        {/* OCR 載入狀態 */}
        {ocr.isLoading && (
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent" />
            <p className="text-blue-800 dark:text-blue-200 text-xs">{t('ocrLoading')}</p>
          </div>
        )}

        {/* 自動偵測中 */}
        {isAutoDetecting && (
          <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-500 border-t-transparent" />
            <p className="text-purple-800 dark:text-purple-200 text-xs">{t('detecting')}</p>
          </div>
        )}

        {/* 選擇視窗 / 追蹤控制 */}
        {isSupported && (
          <div className="space-y-2">
            {/* 第一列：選擇視窗 / 選擇區域 */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectWindow}
                disabled={tracker.isTracking}
                className="flex-1 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {stream ? t('changeWindow') : t('selectWindow')}
              </button>
              {stream && (
                <button
                  type="button"
                  onClick={openRegionSelector}
                  disabled={tracker.isTracking}
                  className="flex-1 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('selectRegion')}
                </button>
              )}
            </div>

            {/* 第二列：開始/停止追蹤 */}
            {stream && (
              <div className="flex gap-2">
                {!tracker.isTracking ? (
                  <button
                    type="button"
                    onClick={handleStartTracking}
                    disabled={!regionSelector.normalizedRegion || !ocr.isReady || isAutoDetecting}
                    className="flex-1 px-3 py-2 text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('startTracking')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopTracking}
                    className="flex-1 px-3 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    {t('stopTracking')}
                  </button>
                )}
              </div>
            )}

            {/* 區域狀態提示 */}
            {stream && (
              <div className="text-xs text-center">
                {isAutoDetecting ? (
                  <span className="text-purple-600 dark:text-purple-400">
                    {t('detecting')}
                  </span>
                ) : regionSelector.normalizedRegion ? (
                  <span className="text-green-600 dark:text-green-400">
                    {t('regionReady')}
                  </span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('pleaseSelectRegion')}
                  </span>
                )}
              </div>
            )}

            {/* Debug 模式開關（僅開發環境） */}
            {process.env.NODE_ENV === 'development' && stream && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDetector.debugMode}
                    onChange={(e) => autoDetector.setDebugMode(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  {t('debugMode') || 'Debug 模式'}
                </label>
                {autoDetector.debugMode && autoDetector.debugScans.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {autoDetector.debugScans.length} {t('debugScansCount') || '筆記錄'}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Debug 面板（僅開發環境） */}
        {process.env.NODE_ENV === 'development' && autoDetector.debugMode && autoDetector.debugScans.length > 0 && (
          <DebugScanPanel
            scans={autoDetector.debugScans}
            onClear={autoDetector.clearDebugScans}
            t={contextT}
          />
        )}

        {/* 擷取間隔設定 */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t('captureInterval')}
          </p>
          <div className="flex gap-1">
            {[30, 60, 120].map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => setCaptureInterval(seconds)}
                disabled={tracker.isTracking}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  captureInterval === seconds
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {getIntervalLabel(seconds)}
              </button>
            ))}
          </div>
        </div>

        {/* 經驗顯示 */}
        <ExpDisplay
          currentExp={tracker.currentExp}
          currentPercentage={tracker.currentPercentage}
          levelUpEstimate={tracker.levelUpEstimate}
          expPerMinute={tracker.stats.expPerMinute}
          isTracking={tracker.isTracking}
          secondsUntilNextCapture={tracker.secondsUntilNextCapture}
          captureInterval={captureInterval}
          t={t}
        />

        {/* 統計資訊 */}
        <ExpStats stats={tracker.stats} captureInterval={captureInterval} t={t} />

        {/* 儲存經驗表單 */}
        <SaveExpForm
          expPerMinute={tracker.stats.expPerMinute}
          editingRecord={editingRecord}
          onSave={handleSaveRecord}
          onUpdate={handleUpdateRecord}
          onCancelEdit={handleCancelEdit}
          t={t}
        />

        {/* 已儲存記錄 */}
        <SavedRecords
          records={savedRecords}
          onEdit={handleEditRecord}
          onDelete={handleDeleteRecord}
          t={t}
        />

        {/* 歷史記錄 */}
        <ExpHistory
          history={tracker.expHistory}
          onExport={tracker.exportCsv}
          onClear={tracker.reset}
          t={t}
        />
      </div>

      {/* 隱藏的 video（用於背景 OCR） */}
      {/* 注意：不能使用 sr-only、opacity: 0、或螢幕外定位，因為瀏覽器會優化掉影格渲染 */}
      {/* 使用 clip-path: inset(100%) 視覺隱藏但保持正常渲染 */}
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="fixed pointer-events-none"
          style={{
            top: 0,
            left: 0,
            width: '640px',
            height: '360px',
            clipPath: 'inset(100%)',
            // 備用隱藏方式（支援舊瀏覽器）
            clip: 'rect(0, 0, 0, 0)',
            overflow: 'hidden',
          }}
        />
      )}

      {/* 區域選擇 Modal */}
      {stream && (
        <RegionSelectorModal
          isOpen={isRegionModalOpen}
          onClose={() => setIsRegionModalOpen(false)}
          stream={stream}
          initialRegion={regionSelector.normalizedRegion}
          onRegionSelected={handleRegionSelected}
          t={t}
        />
      )}
    </div>,
    document.body
  )
}
