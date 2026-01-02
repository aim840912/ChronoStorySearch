'use client'

import { useEffect, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
  /** 左側懸浮內容（固定在 Modal 左邊框外側） */
  floatingLeft?: ReactNode
  /** 右側懸浮內容（固定在 Modal 右邊框外側） */
  floatingRight?: ReactNode
  /** 左側廣告區（垂直置中，僅桌面版顯示） */
  floatingLeftAd?: ReactNode
  /** 右側廣告區（垂直置中，僅桌面版顯示） */
  floatingRightAd?: ReactNode
  /** 頂部廣告區（Modal 上方，僅手機/平板版顯示） */
  floatingTopAd?: ReactNode
  /** 全螢幕模式（填滿視窗，手機無圓角，桌面有邊距和圓角） */
  fullscreen?: boolean
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
  floatingLeft,
  floatingRight,
  floatingLeftAd,
  floatingRightAd,
  floatingTopAd,
  fullscreen = false,
}: BaseModalProps) {
  // Hydration 安全：確保只在客戶端渲染
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // 未掛載或未開啟時不渲染
  if (!isOpen || !mounted) return null

  // 全螢幕模式的樣式
  const backdropClass = fullscreen
    ? `fixed inset-0 ${zIndex} flex items-center justify-center bg-black/90 backdrop-blur-sm`
    : `fixed inset-0 ${zIndex} flex items-start justify-center pt-8 sm:pt-16 p-0 sm:px-4 sm:pb-4 bg-black/90 backdrop-blur-sm overflow-y-auto scrollbar-hide`

  const containerClass = fullscreen
    ? 'relative w-full h-full sm:w-[calc(100%-2rem)] sm:h-[calc(100%-2rem)] sm:max-w-6xl'
    : `relative my-auto w-[70vw] lg:min-w-[60vw] ${maxWidth}`

  const modalClass = fullscreen
    ? 'bg-white dark:bg-gray-800 shadow-2xl w-full h-full sm:rounded-xl overflow-hidden flex flex-col'
    : 'bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full h-[90vh] overflow-hidden flex flex-col'

  // 使用 Portal 將 Modal 渲染到 document.body，逃脫父容器的堆疊上下文限制
  return createPortal(
    <div
      className={backdropClass}
      onClick={handleBackdropClick}
    >
      {/* 相對定位容器，用於放置懸浮內容（寬度設定在此以確保 absolute 定位正確） */}
      <div className={containerClass}>
        {/* 左側懸浮內容（固定在 Modal 左邊框外側，所有尺寸一致 8px 距離） */}
        {floatingLeft && (
          <div
            className="absolute right-[calc(100%_+_8px)] top-4 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {floatingLeft}
          </div>
        )}
        {/* 右側懸浮內容（固定在 Modal 右邊框外側，所有尺寸一致 8px 距離） */}
        {floatingRight && (
          <div
            className="absolute left-[calc(100%_+_8px)] top-4 z-20 flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {floatingRight}
          </div>
        )}
        {/* 左側廣告區（底部對齊，僅桌面版 >= 1120px 顯示） */}
        {floatingLeftAd && (
          <div
            className="absolute right-[calc(100%_+_8px)] bottom-0 z-10 hidden min-[1120px]:block"
            onClick={(e) => e.stopPropagation()}
          >
            {floatingLeftAd}
          </div>
        )}
        {/* 右側廣告區（底部對齊，僅桌面版 >= 1120px 顯示） */}
        {floatingRightAd && (
          <div
            className="absolute left-[calc(100%_+_8px)] bottom-0 z-10 hidden min-[1120px]:block"
            onClick={(e) => e.stopPropagation()}
          >
            {floatingRightAd}
          </div>
        )}
        {/* 頂部廣告區（Modal 上方，僅手機/平板版 < 1120px 顯示） */}
        {floatingTopAd && (
          <div
            className="w-full mb-2 min-[1120px]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {floatingTopAd}
          </div>
        )}
        {/* Modal 主容器 */}
        <div
          className={modalClass}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
