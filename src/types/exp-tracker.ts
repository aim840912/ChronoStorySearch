/**
 * EXP Tracker 類型定義
 * 透過 OCR 追蹤練功效率的工具
 */

/** 追蹤狀態 */
export type TrackingStatus =
  | 'idle' // 待機
  | 'selecting' // 選擇視窗中
  | 'configuring' // 設定區域中
  | 'tracking' // 追蹤中
  | 'paused' // 已暫停

/** 區域選擇（像素座標） */
export interface Region {
  /** 起始 X 座標（相對於 video 元素） */
  x: number
  /** 起始 Y 座標（相對於 video 元素） */
  y: number
  /** 區域寬度 */
  width: number
  /** 區域高度 */
  height: number
}

/** 正規化區域（0-1 比例座標）
 * 使用比例座標可確保視窗大小改變時，框選區域仍對應正確位置
 */
export interface NormalizedRegion {
  /** X 座標比例 (0-1) */
  x: number
  /** Y 座標比例 (0-1) */
  y: number
  /** 寬度比例 (0-1) */
  width: number
  /** 高度比例 (0-1) */
  height: number
}

/** 經驗記錄 */
export interface ExpRecord {
  /** 記錄時間戳 */
  timestamp: number
  /** 經驗值 */
  exp: number
  /** OCR 信心度 (0-100) */
  confidence: number
}

/** 已儲存的經驗記錄 */
export interface SavedExpRecord {
  /** 唯一識別碼 */
  id: string
  /** 怪物名稱 */
  monsterName: string
  /** 分鐘數 */
  minutes: number
  /** 每分鐘經驗 */
  expPerMinute: number
  /** 總經驗 (expPerMinute × minutes) */
  totalExp: number
  /** 儲存時間戳 */
  savedAt: number
}

/** 經驗統計 */
export interface ExpStats {
  /** 每分鐘經驗值 */
  expPerMinute: number
  /** 每 10 分鐘經驗值 */
  expPer10Minutes: number
  /** 每小時經驗值 */
  expPerHour: number
  /** 預估升級所需時間（秒），null 表示無法計算 */
  timeToLevelUp: number | null
}

/** OCR 辨識結果 */
export interface OcrResult {
  /** 辨識出的原始文字 */
  text: string
  /** 信心度 (0-100) */
  confidence: number
  /** 解析後的經驗值，null 表示解析失敗 */
  expValue: number | null
}

/** EXP Tracker 設定 */
export interface ExpTrackerSettings {
  /** 擷取間隔（秒），預設 5 */
  captureInterval: number
  /** 當前等級 */
  currentLevel: number
  /** 目標等級 */
  targetLevel: number
}

/** EXP Tracker 儲存狀態 */
export interface ExpTrackerState {
  /** 選取的區域（正規化座標） */
  region: NormalizedRegion | null
  /** 擷取間隔（秒） */
  captureInterval: number
  /** 歷史記錄（僅保存最近 500 筆） */
  history: ExpRecord[]
  /** 已儲存的經驗記錄 */
  savedRecords: SavedExpRecord[]
}

/** useExpTracker Hook 選項 */
export interface UseExpTrackerOptions {
  /** 擷取間隔（秒） */
  captureInterval: number
  /** 經驗值變化回調 */
  onExpChange?: (record: ExpRecord) => void
}

/** useExpTracker Hook 回傳值 */
export interface UseExpTrackerReturn {
  /** 是否正在追蹤 */
  isTracking: boolean
  /** 當前經驗值 */
  currentExp: number | null
  /** 上一次經驗值 */
  previousExp: number | null
  /** 經驗歷史記錄 */
  expHistory: ExpRecord[]
  /** 統計資訊 */
  stats: ExpStats
  /** 最近一次 OCR 信心度 */
  confidence: number
  /** 開始追蹤 */
  start: () => void
  /** 停止追蹤 */
  stop: () => void
  /** 重置記錄 */
  reset: () => void
  /** 匯出 CSV */
  exportCsv: () => void
}

/** useOcr Hook 回傳值 */
export interface UseOcrReturn {
  /** 語言包是否載入中 */
  isLoading: boolean
  /** OCR 是否就緒 */
  isReady: boolean
  /** 執行 OCR 辨識 */
  recognize: (imageData: ImageData | HTMLCanvasElement) => Promise<OcrResult>
  /** 錯誤 */
  error: Error | null
}

/** useRegionSelector Hook 回傳值 */
export interface UseRegionSelectorReturn {
  /** 選取的區域（正規化座標） */
  normalizedRegion: NormalizedRegion | null
  /** 選取的區域（像素座標，用於拖曳時預覽） */
  pixelRegion: Region | null
  /** 是否正在選擇 */
  isSelecting: boolean
  /** 開始選擇 */
  startSelection: () => void
  /** 清除選擇 */
  clearSelection: () => void
  /** 設定區域（正規化座標） */
  setNormalizedRegion: (region: NormalizedRegion) => void
  /** 事件處理器（綁定到容器元素） */
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void
    onMouseMove: (e: React.MouseEvent) => void
    onMouseUp: () => void
  }
  /** 取得當前像素區域（根據容器大小計算） */
  getPixelRegion: (containerWidth: number, containerHeight: number) => Region | null
}

/** ExpTrackerModal 元件 Props */
export interface ExpTrackerModalProps {
  isOpen: boolean
  onClose: () => void
}

/** ScreenCapture 元件 Props */
export interface ScreenCaptureProps {
  onStreamReady: (stream: MediaStream) => void
  onError: (error: Error) => void
  isActive: boolean
  t: (key: string) => string
}

/** RegionSelector 元件 Props */
export interface RegionSelectorProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  region: Region | null
  onRegionChange: (region: Region) => void
  disabled: boolean
  isSelecting: boolean
  onStartSelection: () => void
  handlers: UseRegionSelectorReturn['handlers']
}

/** ExpDisplay 元件 Props */
export interface ExpDisplayProps {
  currentExp: number | null
  expPerMinute: number
  isTracking: boolean
  t: (key: string) => string
}

/** ExpStats 元件 Props */
export interface ExpStatsProps {
  stats: ExpStats
  t: (key: string) => string
}

/** SaveExpForm 元件 Props */
export interface SaveExpFormProps {
  expPerMinute: number
  editingRecord: SavedExpRecord | null
  onSave: (record: Omit<SavedExpRecord, 'id' | 'savedAt'>) => void
  onUpdate: (record: SavedExpRecord) => void
  onCancelEdit: () => void
  t: (key: string) => string
}

/** SavedRecords 元件 Props */
export interface SavedRecordsProps {
  records: SavedExpRecord[]
  onEdit: (record: SavedExpRecord) => void
  onDelete: (id: string) => void
  t: (key: string) => string
}

/** ExpHistory 元件 Props */
export interface ExpHistoryProps {
  history: ExpRecord[]
  onExport: () => void
  onClear: () => void
  t: (key: string) => string
}

/** OcrConfidence 元件 Props */
export interface OcrConfidenceProps {
  confidence: number
  t: (key: string) => string
}

/** 信心度等級 */
export type ConfidenceLevel = 'high' | 'medium' | 'low'

/** 根據信心度取得等級 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 80) return 'high'
  if (confidence >= 50) return 'medium'
  return 'low'
}

/** 自動偵測結果 */
export interface AutoDetectResult {
  /** 偵測到的區域 */
  region: Region
  /** OCR 信心度 (0-100) */
  confidence: number
  /** 辨識出的文字 */
  text: string
}

/** useAutoRegionDetector Hook 回傳值 */
export interface UseAutoRegionDetectorReturn {
  /** 是否正在偵測 */
  isDetecting: boolean
  /** 執行自動偵測 */
  detect: (video: HTMLVideoElement) => Promise<AutoDetectResult | null>
  /** 取消偵測 */
  cancel: () => void
}
