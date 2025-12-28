'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'
import { getManualExpRecords, setManualExpRecordsWithSync } from '@/lib/storage'
import { RecordForm } from './RecordForm'
import { RecordList } from './RecordList'
import type { ManualExpRecorderModalProps, ManualExpRecord } from '@/types/manual-exp-record'

/**
 * 手動經驗記錄器 Modal
 * 用於記錄和比較不同怪物的每小時經驗量
 */
export function ManualExpRecorderModal({ isOpen, onClose }: ManualExpRecorderModalProps) {
  const { t: contextT } = useLanguage()
  const { showToast } = useToast()

  // 翻譯函數
  const t = useCallback(
    (key: string) => contextT(`manualExpRecorder.${key}`),
    [contextT]
  )

  // 資料狀態
  const [records, setRecords] = useState<ManualExpRecord[]>([])
  const [editingRecord, setEditingRecord] = useState<ManualExpRecord | null>(null)

  // 載入儲存的記錄（只在 Modal 開啟時載入一次）
  useEffect(() => {
    if (isOpen) {
      const savedRecords = getManualExpRecords()
      setRecords(savedRecords)
    }
  }, [isOpen])

  // 監聽雲端同步事件（登入時從雲端載入資料後重新讀取）
  useEffect(() => {
    const handlePreferencesSynced = () => {
      if (isOpen) {
        const savedRecords = getManualExpRecords()
        setRecords(savedRecords)
      }
    }

    window.addEventListener('preferences-synced', handlePreferencesSynced)
    return () => window.removeEventListener('preferences-synced', handlePreferencesSynced)
  }, [isOpen])

  // 新增記錄（直接儲存到 localStorage）
  const handleSave = useCallback(
    (record: Omit<ManualExpRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = Date.now()
      const newRecord: ManualExpRecord = {
        ...record,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      }
      setRecords((prev) => {
        const updated = [newRecord, ...prev]
        setManualExpRecordsWithSync(updated) // 儲存並觸發雲端同步
        return updated
      })
      showToast(t('recordSaved'), 'success')
    },
    [showToast, t]
  )

  // 更新記錄（直接儲存到 localStorage）
  const handleUpdate = useCallback(
    (updatedRecord: ManualExpRecord) => {
      setRecords((prev) => {
        const updated = prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
        setManualExpRecordsWithSync(updated) // 儲存並觸發雲端同步
        return updated
      })
      setEditingRecord(null)
      showToast(t('recordUpdated'), 'success')
    },
    [showToast, t]
  )

  // 刪除記錄（直接儲存到 localStorage）
  const handleDelete = useCallback(
    (id: string) => {
      setRecords((prev) => {
        const updated = prev.filter((r) => r.id !== id)
        setManualExpRecordsWithSync(updated) // 儲存並觸發雲端同步
        return updated
      })
      showToast(t('recordDeleted'), 'success')
    },
    [showToast, t]
  )

  // 編輯記錄
  const handleEdit = useCallback((record: ManualExpRecord) => {
    setEditingRecord(record)
  }, [])

  // 取消編輯
  const handleCancelEdit = useCallback(() => {
    setEditingRecord(null)
  }, [])

  // 關閉 Modal
  const handleClose = useCallback(() => {
    setEditingRecord(null)
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題 */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={contextT('common.close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 內容區 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {/* 新增/編輯表單 */}
          <RecordForm
            editingRecord={editingRecord}
            onSave={handleSave}
            onUpdate={handleUpdate}
            onCancelEdit={handleCancelEdit}
            t={t}
          />

          {/* 記錄列表 */}
          <RecordList
            records={records}
            onEdit={handleEdit}
            onDelete={handleDelete}
            t={t}
          />
        </div>
      </div>
    </div>
  )
}
