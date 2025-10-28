'use client'

import { useEffect, ReactNode } from 'react'

export interface BaseModalProps {
  /** Modal 是否開啟 */
  isOpen: boolean
  /** 關閉 Modal 的回調函數 */
  onClose: () => void
  /** Modal 內容 */
  children: ReactNode
  /** 最大寬度（Tailwind class），預設 'max-w-6xl' */
  maxWidth?: string
  /** z-index（Tailwind class），預設 'z-50' */
  zIndex?: string
  /** 是否有上一個 Modal（用於堆疊） */
  hasPreviousModal?: boolean
  /** 返回上一個 Modal 的回調函數 */
  onGoBack?: () => void
  /** 是否禁止點擊背景關閉 Modal */
  preventBackdropClose?: boolean
  /** 自定義背景點擊處理（會覆蓋預設行為） */
  onBackdropClick?: () => void
  /** 自定義 ESC 鍵處理（會覆蓋預設行為） */
  onEscape?: () => void
}

/**
 * BaseModal 基礎 Modal 元件
 *
 * 封裝所有 Modal 的共同邏輯：
 * - 背景遮罩與點擊關閉
 * - ESC 鍵處理
 * - body overflow 管理
 * - 統一的 z-index 和動畫
 *
 * @example
 * ```tsx
 * <BaseModal isOpen={isOpen} onClose={onClose}>
 *   <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
 *     <h2>Modal Title</h2>
 *     <p>Modal content goes here</p>
 *   </div>
 * </BaseModal>
 * ```
 */
export function BaseModal({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-6xl',
  zIndex = 'z-50',
  preventBackdropClose = false,
  onBackdropClick,
  onEscape,
}: BaseModalProps) {
  // ESC 鍵關閉 Modal
  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onEscape) {
          onEscape()
        } else {
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose, onEscape])

  // 管理 body overflow（防止背景滾動）
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // 背景點擊處理
  const handleBackdropClick = () => {
    if (onBackdropClick) {
      onBackdropClick()
    } else if (!preventBackdropClose) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-start justify-center pt-8 sm:pt-16 p-0 sm:px-4 sm:pb-4 bg-black/50 backdrop-blur-sm overflow-y-auto scrollbar-hide`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto scrollbar-hide flex flex-col my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
