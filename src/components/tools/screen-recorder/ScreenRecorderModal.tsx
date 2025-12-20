'use client'

import { useState, useEffect, useCallback } from 'react'
import { BaseModal } from '@/components/common/BaseModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { useScreenRecorder } from '@/hooks/useScreenRecorder'
import {
  getScreenRecorderSettings,
  setScreenRecorderSettings,
} from '@/lib/storage'
import { RecordingSettings } from './RecordingSettings'
import { RecordingStatus } from './RecordingStatus'
import { RecordingControls } from './RecordingControls'
import type { VideoFormat } from '@/types/screen-recorder'

interface ScreenRecorderModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * 舉報錄影工具 Modal
 * 錄製遊戲畫面用於舉報外掛玩家
 */
export function ScreenRecorderModal({
  isOpen,
  onClose,
}: ScreenRecorderModalProps) {
  const { t: contextT } = useLanguage()
  const { showToast } = useToast()

  // 翻譯函數
  const t = useCallback(
    (key: string) => contextT(`recorder.${key}`),
    [contextT]
  )

  // 載入儲存的設定
  const [duration, setDuration] = useState(2)
  const [includeAudio, setIncludeAudio] = useState(false)
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('webm')

  // 載入設定
  useEffect(() => {
    if (isOpen) {
      const settings = getScreenRecorderSettings()
      setDuration(settings.duration)
      setIncludeAudio(settings.includeAudio)
      setVideoFormat(settings.videoFormat || 'webm')
    }
  }, [isOpen])

  // 儲存設定
  useEffect(() => {
    if (isOpen) {
      setScreenRecorderSettings({ duration, includeAudio, videoFormat })
    }
  }, [duration, includeAudio, videoFormat, isOpen])

  // 使用錄影 Hook
  const recorder = useScreenRecorder({
    duration,
    includeAudio,
    videoFormat,
    onComplete: () => {
      showToast(t('status.stopped'), 'success')
    },
    onError: (error) => {
      if (error.message.includes('cancelled')) {
        showToast(t('error.permissionDenied'), 'error')
      } else {
        showToast(t('error.recordingFailed'), 'error')
      }
    },
  })

  // 下載處理
  const handleDownload = useCallback(() => {
    recorder.download()
    showToast(t('downloadSuccess'), 'success')
  }, [recorder, showToast, t])

  // 判斷是否可以修改設定（僅在待機或完成狀態）
  const canModifySettings =
    recorder.status === 'idle' || recorder.status === 'stopped'

  // 攝影機圖示
  const CameraIcon = () => (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  )

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-red-500 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <CameraIcon />
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                {t('title')}
                <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">
                  {t('testing')}
                </span>
              </h2>
              <p className="text-sm text-red-100">{t('subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-red-600 rounded-lg transition-colors"
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
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 瀏覽器不支援提示 */}
          {!recorder.isSupported && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                {t('error.notSupported')}
              </p>
            </div>
          )}

          {/* 設定區域 */}
          {recorder.isSupported && (
            <>
              <RecordingSettings
                duration={duration}
                includeAudio={includeAudio}
                videoFormat={videoFormat}
                onDurationChange={setDuration}
                onAudioToggle={setIncludeAudio}
                onFormatChange={setVideoFormat}
                disabled={!canModifySettings}
                t={t}
              />

              {/* 狀態顯示 */}
              {recorder.status !== 'idle' && (
                <RecordingStatus
                  status={recorder.status}
                  elapsedTime={recorder.elapsedTime}
                  totalDuration={duration}
                  t={t}
                />
              )}

              {/* 選擇視窗提示 - 僅在待機時顯示 */}
              {recorder.status === 'idle' && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {t('selectWindowHint')}
                  </p>
                </div>
              )}

              {/* 控制按鈕 */}
              <RecordingControls
                status={recorder.status}
                onStart={recorder.start}
                onPause={recorder.pause}
                onResume={recorder.resume}
                onStop={recorder.stop}
                onDownload={handleDownload}
                hasRecording={!!recorder.recordedBlob}
                t={t}
              />

              {/* 錯誤提示 */}
              {recorder.error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 text-sm">
                    {recorder.error.message}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </BaseModal>
  )
}
