/**
 * 手動經驗記錄器類型定義
 * 用於記錄不同怪物的每小時經驗量
 */

/** 手動經驗記錄 */
export interface ManualExpRecord {
  /** 唯一識別碼 */
  id: string
  /** 怪物名稱 */
  monsterName: string
  /** 怪物 ID（可選，用於顯示圖片，相容舊記錄） */
  mobId?: number
  /** 每小時經驗量 */
  expPerHour: number
  /** 建立時間戳 */
  createdAt: number
  /** 更新時間戳 */
  updatedAt: number
}

/** ManualExpRecorderModal 元件 Props */
export interface ManualExpRecorderModalProps {
  isOpen: boolean
  onClose: () => void
}

/** RecordForm 元件 Props */
export interface RecordFormProps {
  /** 編輯中的記錄（null 表示新增模式） */
  editingRecord: ManualExpRecord | null
  /** 儲存記錄 */
  onSave: (record: Omit<ManualExpRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
  /** 更新記錄 */
  onUpdate: (record: ManualExpRecord) => void
  /** 取消編輯 */
  onCancelEdit: () => void
  /** 翻譯函數 */
  t: (key: string) => string
}

/** RecordList 元件 Props */
export interface RecordListProps {
  /** 記錄列表 */
  records: ManualExpRecord[]
  /** 編輯記錄 */
  onEdit: (record: ManualExpRecord) => void
  /** 刪除記錄 */
  onDelete: (id: string) => void
  /** 翻譯函數 */
  t: (key: string) => string
}
