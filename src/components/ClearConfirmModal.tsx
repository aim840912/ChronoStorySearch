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
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
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
            <p className="text-sm text-orange-800 dark:text-orange-200 flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                警告：清除後將無法恢復，所有收藏的{type === 'monsters' ? '怪物' : '物品'}
                都會被移除。
              </span>
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
