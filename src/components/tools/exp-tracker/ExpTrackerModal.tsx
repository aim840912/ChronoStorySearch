'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { useOcr } from '@/hooks/useOcr'
import { useRegionSelector } from '@/hooks/useRegionSelector'
import { useExpTracker } from '@/hooks/useExpTracker'
import { useAutoRegionDetector } from '@/hooks/useAutoRegionDetector'
import { getExpTrackerState, setExpTrackerState } from '@/lib/storage'
import { ExpDisplay } from './ExpDisplay'
import { ExpStats } from './ExpStats'
import { ExpHistory } from './ExpHistory'
import { OcrConfidence } from './OcrConfidence'
import { SaveExpForm } from './SaveExpForm'
import { SavedRecords } from './SavedRecords'
import type { SavedExpRecord } from '@/types/exp-tracker'

interface ExpTrackerModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * EXP 經驗追蹤器 Modal
 * 透過 OCR 追蹤練功效率
 */
export function ExpTrackerModal({ isOpen, onClose }: ExpTrackerModalProps) {
  const { t: contextT } = useLanguage()
  const { showToast } = useToast()

  // 翻譯函數
  const t = useCallback(
    (key: string) => contextT(`expTracker.${key}`),
    [contextT]
  )

  // 狀態
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [captureInterval, setCaptureInterval] = useState(5)
  const [savedRecords, setSavedRecords] = useState<SavedExpRecord[]>([])
  const [editingRecord, setEditingRecord] = useState<SavedExpRecord | null>(null)
  // video 尺寸追蹤（用於正規化座標轉換）
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Hooks
  const ocr = useOcr()
  const regionSelector = useRegionSelector()
  const autoDetector = useAutoRegionDetector()
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

  // 載入儲存的設定
  useEffect(() => {
    if (isOpen) {
      const state = getExpTrackerState()
      setCaptureInterval(state.captureInterval)
      setSavedRecords(state.savedRecords || [])
      if (state.region) {
        regionSelector.setNormalizedRegion(state.region)
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

  // 設定視訊串流到 video 元素
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // 設定 Video 和 Region（傳入正規化座標給 tracker）
  useEffect(() => {
    if (videoRef.current && regionSelector.normalizedRegion && videoSize.width > 0) {
      // 計算像素座標傳給 tracker
      const pixelRegion = regionSelector.getPixelRegion(videoSize.width, videoSize.height)
      if (pixelRegion) {
        tracker.setVideoAndRegion(videoRef.current, pixelRegion)
      }
    }
  }, [regionSelector.normalizedRegion, regionSelector.getPixelRegion, videoSize, tracker])

  // 監聽 video 尺寸變化（使用 ResizeObserver）
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateSize = () => {
      setVideoSize({
        width: video.clientWidth,
        height: video.clientHeight,
      })
    }

    // 初始設定尺寸
    updateSize()

    // 監聽 video 載入完成
    video.addEventListener('loadedmetadata', updateSize)

    // ResizeObserver 監聽尺寸變化
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(video)

    return () => {
      video.removeEventListener('loadedmetadata', updateSize)
      resizeObserver.disconnect()
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
      console.log('[ExpTracker] MediaStream 已建立', {
        tracks: displayStream.getTracks().length,
      })

      // 監聽停止分享
      displayStream.getVideoTracks()[0].onended = () => {
        console.log('[ExpTracker] 用戶停止分享')
        setStream(null)
        tracker.stop()
      }
    } catch (error) {
      if ((error as Error).name !== 'NotAllowedError') {
        showToast(t('error.notSupported'), 'error')
      }
    }
  }, [showToast, t, tracker])

  // 自動偵測 EXP 區域
  const handleAutoDetect = useCallback(async () => {
    if (!videoRef.current) return

    const result = await autoDetector.detect(videoRef.current)
    if (result) {
      // 將偵測到的像素區域正規化
      const video = videoRef.current
      const normalizedRegion = {
        x: result.region.x / video.clientWidth,
        y: result.region.y / video.clientHeight,
        width: result.region.width / video.clientWidth,
        height: result.region.height / video.clientHeight,
      }
      regionSelector.setNormalizedRegion(normalizedRegion)
      // 使用偵測到的經驗值更新顯示
      if (result.text) {
        const expValue = parseInt(result.text.replace(/,/g, ''), 10)
        if (!isNaN(expValue)) {
          tracker.setInitialExp(expValue)
        }
      }
      showToast(t('autoDetectSuccess'), 'success')
    } else {
      showToast(t('autoDetectFailed'), 'error')
    }
  }, [autoDetector, regionSelector, tracker, showToast, t])

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

  // 匯出 CSV
  const handleExportCsv = useCallback(() => {
    tracker.exportCsv()
    showToast(t('exportSuccess'), 'success')
  }, [tracker, showToast, t])

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
        console.log('[ExpTracker] 正在釋放 MediaStream', {
          tracks: stream.getTracks().length,
        })
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  // 圖表圖示
  const ChartIcon = () => (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  )

  // 瀏覽器支援檢查
  const isSupported =
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getDisplayMedia

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-purple-500 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <ChartIcon />
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                {t('title')}
                <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">
                  {t('testing')}
                </span>
              </h2>
              <p className="text-sm text-purple-100">{t('subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-purple-600 rounded-lg transition-colors"
            aria-label={t('close')}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
          {/* 瀏覽器不支援提示 */}
          {!isSupported && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                {t('error.notSupported')}
              </p>
            </div>
          )}

          {isSupported && (
            <>
              {/* OCR 載入狀態 */}
              {ocr.isLoading && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    {t('ocrLoading')}
                  </p>
                </div>
              )}

              {/* 視窗選擇區域 */}
              {!stream ? (
                <div className="text-center py-8">
                  <button
                    type="button"
                    onClick={selectWindow}
                    className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg shadow-lg transition-all hover:scale-105"
                  >
                    {t('selectWindow')}
                  </button>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {t('selectWindowHint')}
                  </p>
                </div>
              ) : (
                <>
                  {/* 視訊預覽和區域選擇 */}
                  <div
                    ref={containerRef}
                    className="relative bg-black rounded-lg overflow-hidden"
                    style={{ cursor: regionSelector.isSelecting ? 'crosshair' : 'default' }}
                    {...regionSelector.handlers}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-auto"
                    />

                    {/* 選取區域顯示 */}
                    {(() => {
                      // 拖曳中使用 pixelRegion，完成後使用正規化座標轉換
                      const displayRegion = regionSelector.isSelecting
                        ? regionSelector.pixelRegion
                        : regionSelector.getPixelRegion(videoSize.width, videoSize.height)

                      if (!displayRegion) return null

                      return (
                        <div
                          className="absolute border-2 border-purple-500 bg-purple-500/20"
                          style={{
                            left: displayRegion.x,
                            top: displayRegion.y,
                            width: displayRegion.width,
                            height: displayRegion.height,
                          }}
                        />
                      )
                    })()}
                  </div>

                  {/* 區域選擇控制 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {(() => {
                          const displayRegion = regionSelector.getPixelRegion(videoSize.width, videoSize.height)
                          if (displayRegion) {
                            return (
                              <span className="text-green-600 dark:text-green-400">
                                {t('regionSelected')} ({Math.round(displayRegion.width)}x
                                {Math.round(displayRegion.height)})
                              </span>
                            )
                          }
                          return <span>{t('noRegion')}</span>
                        })()}
                      </div>
                    </div>

                    {/* 自動偵測 (DEV only) / 手動選取按鈕 */}
                    <div className="flex gap-2">
                      {process.env.NODE_ENV === 'development' && (
                        <button
                          type="button"
                          onClick={handleAutoDetect}
                          disabled={autoDetector.isDetecting || tracker.isTracking}
                          className="flex-1 px-4 py-2 text-sm font-medium bg-purple-100 dark:bg-purple-900/50
                                     text-purple-700 dark:text-purple-300 rounded-lg
                                     hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     flex items-center justify-center gap-2 relative"
                        >
                          <span className="absolute -top-2 -right-2 text-xs px-1 py-0.5 bg-yellow-500 text-white rounded z-10">
                            DEV
                          </span>
                          {autoDetector.isDetecting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
                              {t('detecting')}
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              {t('autoDetect')}
                            </>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={regionSelector.startSelection}
                        disabled={tracker.isTracking}
                        className="flex-1 px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700
                                   text-gray-700 dark:text-gray-300 rounded-lg
                                   hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('selectRegion')}
                      </button>
                    </div>
                  </div>

                  {/* 擷取間隔設定 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('captureInterval')}
                    </label>
                    <div className="flex gap-2">
                      {[3, 5, 10, 15].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setCaptureInterval(sec)}
                          disabled={tracker.isTracking}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                            ${
                              captureInterval === sec
                                ? 'bg-purple-500 text-white shadow-md'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }
                            ${tracker.isTracking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          {sec} {t('seconds')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 開始/停止追蹤按鈕 */}
                  <div className="flex justify-center">
                    {!tracker.isTracking ? (
                      <button
                        type="button"
                        onClick={handleStartTracking}
                        disabled={!regionSelector.normalizedRegion || !ocr.isReady}
                        className="px-8 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold
                                   rounded-lg shadow-lg transition-all hover:scale-105
                                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {t('startTracking')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={tracker.stop}
                        className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-bold
                                   rounded-lg shadow-lg transition-all hover:scale-105"
                      >
                        {t('stopTracking')}
                      </button>
                    )}
                  </div>

                </>
              )}

              {/* 無論是否有 stream 都顯示的區塊 */}
              {/* 經驗顯示 */}
              <ExpDisplay
                currentExp={tracker.currentExp}
                expPerMinute={tracker.stats.expPerMinute}
                isTracking={tracker.isTracking}
                t={t}
              />

              {/* OCR 信心度 (DEV only) */}
              {process.env.NODE_ENV === 'development' && tracker.currentExp !== null && (
                <div className="relative">
                  <span className="absolute -top-2 -right-2 text-xs px-1 py-0.5 bg-yellow-500 text-white rounded z-10">
                    DEV
                  </span>
                  <OcrConfidence confidence={tracker.confidence} t={t} />
                </div>
              )}

              {/* 統計資訊 */}
              <ExpStats stats={tracker.stats} t={t} />

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
                onExport={handleExportCsv}
                onClear={tracker.reset}
                t={t}
              />
            </>
          )}
        </div>
      </div>
    </BaseModal>
  )
}
