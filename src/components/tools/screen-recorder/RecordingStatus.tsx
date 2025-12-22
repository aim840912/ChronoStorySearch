'use client'

import { memo } from 'react'
import type { RecordingStatusProps } from '@/types/screen-recorder'

/**
 * 錄影狀態顯示
 * 顯示錄影中狀態、倒數計時/緩衝狀態、進度條
 */
export const RecordingStatus = memo(function RecordingStatus({
  status,
  elapsedTime,
  totalDuration,
  recordingMode,
  bufferDuration,
  loopDuration,
  t,
}: RecordingStatusProps) {
  // 格式化時間為 MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const totalSeconds = totalDuration * 60
  const remainingSeconds = Math.max(0, totalSeconds - elapsedTime)

  // 固定模式：進度 = 已錄時間 / 總時長
  // 循環模式：進度 = 緩衝時長 / 保留時長
  const progress = recordingMode === 'fixed'
    ? (elapsedTime / totalSeconds) * 100
    : (bufferDuration / loopDuration) * 100

  // 根據狀態決定顯示的樣式
  const getStatusColor = () => {
    switch (status) {
      case 'recording':
        return 'text-red-500'
      case 'paused':
        return 'text-yellow-500'
      case 'stopped':
        return 'text-green-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusBgColor = () => {
    switch (status) {
      case 'recording':
        return 'bg-red-500'
      case 'paused':
        return 'bg-yellow-500'
      case 'stopped':
        return 'bg-green-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="space-y-3">
      {/* 狀態指示器 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 錄影中閃爍的圓點 */}
          {status === 'recording' && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
          {status === 'paused' && (
            <span className="inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
          )}
          {status === 'stopped' && (
            <span className="inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          )}
          <span className={`font-medium ${getStatusColor()}`}>
            {t(`status.${status}`)}
          </span>
        </div>

        {/* 固定模式：剩餘時間 */}
        {recordingMode === 'fixed' && (status === 'recording' || status === 'paused') && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="mr-1">{t('timeRemaining')}:</span>
            <span className="font-mono font-bold text-gray-900 dark:text-white">
              {formatTime(remainingSeconds)}
            </span>
          </div>
        )}

        {/* 循環模式：緩衝狀態 */}
        {recordingMode === 'loop' && (status === 'recording' || status === 'paused') && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="mr-1">{t('bufferStatus')}:</span>
            <span className="font-mono font-bold text-gray-900 dark:text-white">
              {formatTime(bufferDuration)} / {formatTime(loopDuration)}
            </span>
          </div>
        )}
      </div>

      {/* 進度條 */}
      {(status === 'recording' || status === 'paused' || status === 'stopped') && (
        <div className="w-full">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${getStatusBgColor()}`}
              style={{ width: `${Math.min(100, progress)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
            {recordingMode === 'fixed' ? (
              <>
                <span>
                  {t('timeElapsed')}: {formatTime(elapsedTime)}
                </span>
                <span>{formatTime(totalSeconds)}</span>
              </>
            ) : (
              <>
                <span>
                  {t('totalRecorded')}: {formatTime(elapsedTime)}
                </span>
                <span>{t('keepLatest')}: {formatTime(loopDuration)}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
})
