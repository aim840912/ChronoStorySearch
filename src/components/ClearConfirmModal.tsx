'use client'

import { useEffect } from 'react'
import type { ClearModalType } from '@/types'

interface ClearConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  type: ClearModalType
  count: number
}

/**
 * 清除最愛確認 Modal 元件
 * 用於確認清除所有最愛怪物或物品
 */
export function ClearConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  count,
}: ClearConfirmModalProps) {
  // ESC 鍵關閉 modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !type) return null

  const title = type === 'monsters' ? '清除所有最愛怪物' : '清除所有最愛物品'
  const message =
    type === 'monsters'
      ? `確定要清除所有 ${count} 隻最愛怪物嗎？`
      : `確定要清除所有 ${count} 個最愛物品嗎？`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - 警告背景 (紅色) */}
        <div className="bg-red-600 dark:bg-red-700 p-6 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="text-4xl">⚠️</div>
            <div>
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <p className="text-orange-100 text-sm mt-1">此操作無法復原</p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">{message}</p>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 mb-6">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              ⚠️ 警告：清除後將無法恢復，所有收藏的{type === 'monsters' ? '怪物' : '物品'}
              都會被移除。
            </p>
          </div>

          {/* 按鈕組 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
            >
              確定清除
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
