'use client'

import { useState, useCallback, useEffect } from 'react'
import { getExpTrackerState, setExpTrackerState } from '@/lib/storage'
import type { SavedExpRecord } from '@/types/exp-tracker'

/**
 * EXP 追蹤器紀錄管理 Hook
 * 整合經驗紀錄的 CRUD 操作和持久化
 */

export interface ExpTrackerRecordsState {
  savedRecords: SavedExpRecord[]
  editingRecord: SavedExpRecord | null
}

export interface ExpTrackerRecordsActions {
  saveRecord: (record: Omit<SavedExpRecord, 'id' | 'savedAt'>) => void
  deleteRecord: (id: string) => void
  editRecord: (record: SavedExpRecord) => void
  updateRecord: (record: SavedExpRecord) => void
  cancelEdit: () => void
  setSavedRecords: (records: SavedExpRecord[]) => void
}

export type UseExpTrackerRecordsReturn = ExpTrackerRecordsState & ExpTrackerRecordsActions

interface UseExpTrackerRecordsOptions {
  isOpen: boolean
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
  t: (key: string) => string
}

export function useExpTrackerRecords(options: UseExpTrackerRecordsOptions): UseExpTrackerRecordsReturn {
  const { isOpen, showToast, t } = options

  // 紀錄狀態
  const [savedRecords, setSavedRecords] = useState<SavedExpRecord[]>([])
  const [editingRecord, setEditingRecord] = useState<SavedExpRecord | null>(null)

  // 載入儲存的紀錄
  useEffect(() => {
    if (isOpen) {
      const state = getExpTrackerState()
      setSavedRecords(state.savedRecords || [])
    }
  }, [isOpen])

  // 儲存紀錄到 localStorage
  useEffect(() => {
    if (isOpen) {
      const state = getExpTrackerState()
      setExpTrackerState({
        ...state,
        savedRecords,
      })
    }
  }, [savedRecords, isOpen])

  // 儲存經驗記錄
  const saveRecord = useCallback(
    (record: Omit<SavedExpRecord, 'id' | 'savedAt'>) => {
      const newRecord: SavedExpRecord = {
        ...record,
        id: crypto.randomUUID(),
        savedAt: Date.now(),
      }
      setSavedRecords((prev) => [newRecord, ...prev])
      showToast(t('recordSaved'), 'success')
    },
    [showToast, t]
  )

  // 刪除經驗記錄
  const deleteRecord = useCallback(
    (id: string) => {
      setSavedRecords((prev) => prev.filter((r) => r.id !== id))
      showToast(t('recordDeleted'), 'success')
    },
    [showToast, t]
  )

  // 編輯經驗記錄
  const editRecord = useCallback((record: SavedExpRecord) => {
    setEditingRecord(record)
  }, [])

  // 更新經驗記錄
  const updateRecord = useCallback(
    (updatedRecord: SavedExpRecord) => {
      setSavedRecords((prev) =>
        prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
      )
      setEditingRecord(null)
      showToast(t('recordUpdated'), 'success')
    },
    [showToast, t]
  )

  // 取消編輯
  const cancelEdit = useCallback(() => {
    setEditingRecord(null)
  }, [])

  return {
    // 狀態
    savedRecords,
    editingRecord,
    // 操作
    saveRecord,
    deleteRecord,
    editRecord,
    updateRecord,
    cancelEdit,
    setSavedRecords,
  }
}
