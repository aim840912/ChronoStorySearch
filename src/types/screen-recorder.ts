/**
 * Screen Recorder 類型定義
 * 用於舉報外掛玩家的錄影工具
 */

/** 錄影狀態 */
export type RecordingStatus =
  | 'idle' // 待機
  | 'selecting' // 選擇視窗中
  | 'recording' // 錄影中
  | 'paused' // 已暫停
  | 'stopped' // 錄影完成

/** 錄影設定 */
export interface ScreenRecorderSettings {
  /** 錄影時長（分鐘），預設 2，範圍 1-5 */
  duration: number
  /** 是否錄製音訊 */
  includeAudio: boolean
}

/** 錄影結果 */
export interface RecordingResult {
  /** 錄製的影片 Blob */
  blob: Blob
  /** 錄製時長（秒） */
  duration: number
  /** 錄製開始時間 */
  startTime: Date
  /** 錄製結束時間 */
  endTime: Date
}

/** useScreenRecorder Hook 選項 */
export interface UseScreenRecorderOptions {
  /** 錄影時長（分鐘） */
  duration: number
  /** 是否錄製音訊 */
  includeAudio: boolean
  /** 錄影完成回調 */
  onComplete?: (result: RecordingResult) => void
  /** 錯誤回調 */
  onError?: (error: Error) => void
}

/** useScreenRecorder Hook 回傳值 */
export interface UseScreenRecorderReturn {
  /** 當前錄影狀態 */
  status: RecordingStatus
  /** 已錄製時間（秒） */
  elapsedTime: number
  /** 瀏覽器是否支援錄影功能 */
  isSupported: boolean
  /** 錄製的影片 Blob（錄影完成後可用） */
  recordedBlob: Blob | null
  /** 開始錄影 */
  start: () => Promise<void>
  /** 暫停錄影 */
  pause: () => void
  /** 繼續錄影 */
  resume: () => void
  /** 停止錄影 */
  stop: () => void
  /** 下載錄製的影片 */
  download: (filename?: string) => void
  /** 錯誤訊息 */
  error: Error | null
}

/** RecordingControls 元件 Props */
export interface RecordingControlsProps {
  status: RecordingStatus
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onDownload: () => void
  hasRecording: boolean
  t: (key: string) => string
}

/** RecordingStatus 元件 Props */
export interface RecordingStatusProps {
  status: RecordingStatus
  elapsedTime: number
  totalDuration: number
  t: (key: string) => string
}

/** RecordingSettings 元件 Props */
export interface RecordingSettingsProps {
  duration: number
  includeAudio: boolean
  onDurationChange: (minutes: number) => void
  onAudioToggle: (include: boolean) => void
  disabled: boolean
  t: (key: string) => string
}
