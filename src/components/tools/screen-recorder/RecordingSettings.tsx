'use client'

import { memo } from 'react'
import type { RecordingSettingsProps } from '@/types/screen-recorder'

/**
 * 錄影設定面板
 * 設定錄影模式、時長和是否包含音訊
 */
export const RecordingSettings = memo(function RecordingSettings({
  duration,
  includeAudio,
  recordingMode,
  loopDuration,
  onDurationChange,
  onAudioToggle,
  onModeChange,
  onLoopDurationChange,
  disabled,
  t,
}: Omit<RecordingSettingsProps, 'videoFormat' | 'onFormatChange'>) {
  const durationOptions = [1, 2, 3]
  const loopDurationOptions = [
    { value: 60, label: '1' },
    { value: 120, label: '2' },
    { value: 180, label: '3' },
  ]

  return (
    <div className="space-y-4">
      {/* 錄影模式 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('recordingMode')}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onModeChange('fixed')}
            disabled={disabled}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${
                recordingMode === 'fixed'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {t('modeFixed')}
          </button>
          <button
            type="button"
            onClick={() => onModeChange('loop')}
            disabled={disabled}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${
                recordingMode === 'loop'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {t('modeLoop')}
          </button>
        </div>
        {recordingMode === 'loop' && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('loopHint')}
          </p>
        )}
      </div>

      {/* 固定模式：錄影時長 */}
      {recordingMode === 'fixed' && (
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
      )}

      {/* 循環模式：保留時長 */}
      {recordingMode === 'loop' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('loopDuration')}
          </label>
          <div className="flex gap-2 flex-wrap">
            {loopDurationOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onLoopDurationChange(option.value)}
                disabled={disabled}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    loopDuration === option.value
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {option.label} {t('durationUnit')}
              </button>
            ))}
          </div>
        </div>
      )}

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
