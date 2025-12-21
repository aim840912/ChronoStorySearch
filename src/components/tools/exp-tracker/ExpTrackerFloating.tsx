'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { useOcr } from '@/hooks/useOcr'
import { useRegionSelector } from '@/hooks/useRegionSelector'
import { useExpTracker } from '@/hooks/useExpTracker'
// import { useAutoRegionDetector } from '@/hooks/useAutoRegionDetector'
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
import { SaveExpForm } from './SaveExpForm'
import { SavedRecords } from './SavedRecords'
import { RegionSelectorModal } from './RegionSelectorModal'
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

  // Hooks
  const ocr = useOcr()
  const regionSelector = useRegionSelector()
  const tracker = useExpTracker({
    captureInterval,
    onExpChange: () => {},
  }) as ReturnType<typeof useExpTracker> & {
    setOcrFunction: (
      fn: (canvas: HTMLCanvasElement) => Promise<{ expValue: number | null; confidence: number }>
    ) => void
    setVideoAndRegion: (video: HTMLVideoElement, region: { x: number; y: number; width: number; height: number }) => void
    setInitialExp: (exp: number) => void
  }

  // 拖曳功能
  const { position, isDragging, setPosition, dragHandlers } = useDraggable({
    onPositionChange: (pos) => {
      // 儲存位置
      const floatingState = getExpTrackerFloatingState()
      setExpTrackerFloatingState({ ...floatingState, position: pos })
    },
  })

  // 調整大小功能（展開狀態）
  const resizable = useResizable({
    initialSize: windowSize,
    minSize: { width: 280, height: 200 },
    maxSize: { width: 500, height: 800 },
    enabled: !isMinimized,
    onSizeChange: (size) => {
      setWindowSize(size)
      const floatingState = getExpTrackerFloatingState()
      setExpTrackerFloatingState({ ...floatingState, size })
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
      const floatingState = getExpTrackerFloatingState()
      setExpTrackerFloatingState({ ...floatingState, minimizedWidth: size.width })
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

  // 儲存懸浮視窗狀態
  useEffect(() => {
    if (isOpen) {
      setExpTrackerFloatingState({
        position,
        isMinimized,
        isPinned,
        isVideoExpanded,
        size: windowSize,
        minimizedWidth,
      })
    }
  }, [isOpen, position, isMinimized, isPinned, isVideoExpanded, windowSize, minimizedWidth])

  // 設定 OCR 函數
  useEffect(() => {
    if (ocr.isReady) {
      tracker.setOcrFunction(async (canvas: HTMLCanvasElement) => {
        const result = await ocr.recognize(canvas)
        return {
          expValue: result.expValue,
          confidence: result.confidence,
        }
      })
    }
  }, [ocr.isReady, ocr.recognize, tracker])

  // 設定視訊串流到 video 元素，並確保播放
  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return

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
    }
  }, [stream])

  // 設定 Video 和 Region
  useEffect(() => {
    if (videoRef.current && regionSelector.normalizedRegion && videoSize.width > 0) {
      const pixelRegion = regionSelector.getPixelRegion(videoSize.width, videoSize.height)
      if (pixelRegion) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[EXP] Setting region:', {
            normalizedRegion: regionSelector.normalizedRegion,
            pixelRegion,
            videoSize,
          })
        }
        tracker.setVideoAndRegion(videoRef.current, pixelRegion)
      }
    }
  }, [regionSelector.normalizedRegion, regionSelector.getPixelRegion, videoSize, tracker])

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

        // 如果有待處理的區域選擇，在 video 載入完成後開啟
        if (pendingRegionSelectRef.current) {
          pendingRegionSelectRef.current = false
          setIsRegionModalOpen(true)
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

  // 選擇遊戲視窗
  const selectWindow = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'window' },
        audio: false,
      })
      setStream(displayStream)

      // 標記需要在 video 載入後開啟區域選擇
      pendingRegionSelectRef.current = true

      displayStream.getVideoTracks()[0].onended = () => {
        setStream(null)
        tracker.stop()
      }
    } catch (error) {
      if ((error as Error).name !== 'NotAllowedError') {
        showToast(t('error.notSupported'), 'error')
      }
    }
  }, [showToast, t, tracker])

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
    tracker.start()
  }, [regionSelector.normalizedRegion, ocr.isReady, tracker, showToast, t])

  // 從大螢幕 Modal 選擇區域
  const handleRegionSelected = useCallback((region: NormalizedRegion) => {
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

  // 清理
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

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
              onClick={onClose}
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
            onClick={onClose}
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
                    disabled={!regionSelector.normalizedRegion || !ocr.isReady}
                    className="flex-1 px-3 py-2 text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('startTracking')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={tracker.stop}
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
                {regionSelector.normalizedRegion ? (
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
          </div>
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
