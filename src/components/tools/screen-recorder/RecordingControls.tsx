'use client'

import { memo } from 'react'
import type { RecordingControlsProps } from '@/types/screen-recorder'

/**
 * 錄影控制按鈕群組
 * 開始、暫停、繼續、停止、下載
 */
export const RecordingControls = memo(function RecordingControls({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  onDownload,
  hasRecording,
  t,
}: RecordingControlsProps) {
  // 錄影圖示
  const RecordIcon = () => (
    <svg
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6" />
    </svg>
  )

  // 暫停圖示
  const PauseIcon = () => (
    <svg
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <rect x="5" y="4" width="3" height="12" rx="1" />
      <rect x="12" y="4" width="3" height="12" rx="1" />
    </svg>
  )

  // 播放/繼續圖示
  const PlayIcon = () => (
    <svg
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="M6 4l10 6-10 6V4z" />
    </svg>
  )

  // 停止圖示
  const StopIcon = () => (
    <svg
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <rect x="5" y="5" width="10" height="10" rx="1" />
    </svg>
  )

  // 下載圖示
  const DownloadIcon = () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {/* 開始錄影按鈕 - 僅在待機或完成狀態顯示 */}
      {(status === 'idle' || status === 'stopped') && (
        <button
          type="button"
          onClick={onStart}
          className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600
                     text-white font-bold rounded-lg shadow-lg
                     transition-all hover:scale-105 active:scale-95"
        >
          <RecordIcon />
          {t('start')}
        </button>
      )}

      {/* 暫停按鈕 - 錄影中顯示 */}
      {status === 'recording' && (
        <button
          type="button"
          onClick={onPause}
          className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600
                     text-white font-bold rounded-lg shadow-lg
                     transition-all hover:scale-105 active:scale-95"
        >
          <PauseIcon />
          {t('pause')}
        </button>
      )}

      {/* 繼續按鈕 - 暫停時顯示 */}
      {status === 'paused' && (
        <button
          type="button"
          onClick={onResume}
          className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600
                     text-white font-bold rounded-lg shadow-lg
                     transition-all hover:scale-105 active:scale-95"
        >
          <PlayIcon />
          {t('resume')}
        </button>
      )}

      {/* 停止按鈕 - 錄影中或暫停時顯示 */}
      {(status === 'recording' || status === 'paused') && (
        <button
          type="button"
          onClick={onStop}
          className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700
                     text-white font-bold rounded-lg shadow-lg
                     transition-all hover:scale-105 active:scale-95"
        >
          <StopIcon />
          {t('stop')}
        </button>
      )}

      {/* 下載按鈕 - 有錄製內容時顯示 */}
      {hasRecording && status === 'stopped' && (
        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600
                     text-white font-bold rounded-lg shadow-lg
                     transition-all hover:scale-105 active:scale-95"
        >
          <DownloadIcon />
          {t('download')}
        </button>
      )}
    </div>
  )
})
