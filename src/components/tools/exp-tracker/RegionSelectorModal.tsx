'use client'

import { memo, useRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRegionSelector } from '@/hooks/useRegionSelector'
import type { NormalizedRegion, Region } from '@/types/exp-tracker'

interface RegionSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  stream: MediaStream
  initialRegion: NormalizedRegion | null
  onRegionSelected: (region: NormalizedRegion) => void
  t: (key: string) => string
}

/**
 * 大螢幕區域選擇 Modal
 * 提供全螢幕的影像預覽，方便精確框選 EXP 區域
 */
export const RegionSelectorModal = memo(function RegionSelectorModal({
  isOpen,
  onClose,
  stream,
  initialRegion,
  onRegionSelected,
  t,
}: RegionSelectorModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })
  const [mounted, setMounted] = useState(false)

  const regionSelector = useRegionSelector()

  // Client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // 載入初始區域
  useEffect(() => {
    if (isOpen && initialRegion) {
      regionSelector.setNormalizedRegion(initialRegion)
    }
  }, [isOpen, initialRegion])

  // 設定視訊串流到 video 元素
  useEffect(() => {
    const video = videoRef.current
    if (video && stream && isOpen) {
      video.srcObject = stream
    }
    return () => {
      // 清理 srcObject 引用，讓 stream 可以被正確釋放
      if (video) {
        video.srcObject = null
      }
    }
  }, [stream, isOpen])

  // 監聽 video 尺寸變化
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isOpen) return

    const updateSize = () => {
      setVideoSize({
        width: video.clientWidth,
        height: video.clientHeight,
      })
    }

    updateSize()
    video.addEventListener('loadedmetadata', updateSize)
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(video)

    return () => {
      video.removeEventListener('loadedmetadata', updateSize)
      resizeObserver.disconnect()
    }
  }, [stream, isOpen])

  // 開啟時自動進入選擇模式
  useEffect(() => {
    if (isOpen && !regionSelector.normalizedRegion) {
      regionSelector.startSelection()
    }
  }, [isOpen])

  // 區域選擇完成時的處理
  const handleConfirm = useCallback(() => {
    if (regionSelector.normalizedRegion) {
      onRegionSelected(regionSelector.normalizedRegion)
      onClose()
    }
  }, [regionSelector.normalizedRegion, onRegionSelected, onClose])

  // 清除區域
  const handleClear = useCallback(() => {
    regionSelector.clearSelection()
    regionSelector.startSelection()
  }, [regionSelector])

  // 計算顯示區域
  const displayRegion: Region | null = regionSelector.isSelecting
    ? regionSelector.pixelRegion
    : regionSelector.getPixelRegion(videoSize.width, videoSize.height)

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80">
      {/* Modal 容器 */}
      <div className="relative w-[90vw] max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-4 py-3 bg-purple-500 text-white">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="font-bold">{t('selectRegionTitle')}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-purple-600 rounded transition-colors"
            aria-label={t('close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 影像預覽區 */}
        <div className="flex-1 p-4 overflow-auto">
          <div
            ref={containerRef}
            className="relative bg-black rounded-lg overflow-hidden mx-auto"
            style={{ cursor: regionSelector.isSelecting ? 'crosshair' : 'default' }}
            {...regionSelector.handlers}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-w-full max-h-[60vh] mx-auto"
            />

            {/* 選取區域顯示 */}
            {displayRegion && (
              <div
                className="absolute border-2 border-purple-500 bg-purple-500/20 pointer-events-none"
                style={{
                  left: displayRegion.x,
                  top: displayRegion.y,
                  width: displayRegion.width,
                  height: displayRegion.height,
                }}
              />
            )}
          </div>
        </div>

        {/* 底部操作區 */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            {/* 狀態提示 */}
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {regionSelector.isSelecting ? (
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                  {t('dragToSelect')}
                </span>
              ) : displayRegion ? (
                <span className="text-green-600 dark:text-green-400">
                  {t('regionSelected')} ({Math.round(displayRegion.width)}x{Math.round(displayRegion.height)})
                </span>
              ) : (
                <span>{t('noRegion')}</span>
              )}
            </div>

            {/* 操作按鈕 */}
            <div className="flex items-center gap-2">
              {/* 重新選擇 */}
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg transition-colors"
              >
                {t('reselect')}
              </button>

              {/* 確認選擇 */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!regionSelector.normalizedRegion}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {t('confirmRegion')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
})
