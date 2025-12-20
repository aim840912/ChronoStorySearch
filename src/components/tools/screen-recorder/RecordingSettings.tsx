'use client'

import { memo } from 'react'
import type { RecordingSettingsProps, VideoFormat } from '@/types/screen-recorder'

/**
 * 錄影設定面板
 * 設定錄影時長、影片格式和是否包含音訊
 */
export const RecordingSettings = memo(function RecordingSettings({
  duration,
  includeAudio,
  videoFormat,
  onDurationChange,
  onAudioToggle,
  onFormatChange,
  disabled,
  t,
}: RecordingSettingsProps) {
  const durationOptions = [1, 2, 3]
  const formatOptions: { value: VideoFormat; label: string }[] = [
    { value: 'webm', label: 'WebM' },
    { value: 'mp4', label: 'MP4' },
  ]

  return (
    <div className="space-y-4">
      {/* 錄影時長 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('duration')}
        </label>
        <div className="flex gap-2 flex-wrap">
          {durationOptions.map((min) => (
            <button
              key={min}
              type="button"
              onClick={() => onDurationChange(min)}
              disabled={disabled}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  duration === min
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {min} {t('durationUnit')}
            </button>
          ))}
        </div>
      </div>

      {/* 影片格式 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('videoFormat')}
        </label>
        <div className="flex gap-2">
          {formatOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onFormatChange(option.value)}
              disabled={disabled}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  videoFormat === option.value
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 音訊開關 */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="include-audio"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t('includeAudio')}
        </label>
        <button
          id="include-audio"
          type="button"
          role="switch"
          aria-checked={includeAudio}
          onClick={() => onAudioToggle(!includeAudio)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${includeAudio ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${includeAudio ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
    </div>
  )
})
