'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { ToolbarMenuItem, type ToolbarMenuItemProps } from './ToolbarMenuItem'

export interface ToolbarMenuGroup {
  id: string
  label: string
  items: (ToolbarMenuItemProps & {
    id: string
    /** 點擊後是否保持選單開啟（用於多選項切換如圖片格式） */
    keepOpen?: boolean
  })[]
}

interface ToolbarDropdownProps {
  /** 觸發按鈕的標籤 */
  label: string
  /** 觸發按鈕的圖示 */
  icon: ReactNode
  /** 分組的選單項目 */
  groups: ToolbarMenuGroup[]
  /** 選單對齊方向 */
  align?: 'left' | 'right'
}

/**
 * Toolbar 下拉選單元件
 * 支援分組顯示，點擊外部自動關閉
 */
export function ToolbarDropdown({
  label,
  icon,
  groups,
  align = 'right',
}: ToolbarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 點擊外部關閉選單
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // ESC 關閉選單
  useEffect(() => {
    if (!isOpen) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleItemClick = useCallback((onClick: () => void, keepOpen?: boolean) => {
    onClick()
    if (!keepOpen) {
      setIsOpen(false)
    }
  }, [])

  const alignmentClass = align === 'right' ? 'right-0' : 'left-0'

  return (
    <div ref={dropdownRef} className="relative">
      {/* 觸發按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 sm:p-2 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 flex items-center gap-1.5"
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="w-4 h-4 sm:w-5 sm:h-5">{icon}</span>
        {/* 下拉箭頭 */}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* 下拉選單 */}
      {isOpen && (
        <div
          className={`absolute ${alignmentClass} mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150`}
          role="menu"
        >
          {groups.map((group, groupIndex) => (
            <div key={group.id}>
              {/* 分組標籤 */}
              <div className="px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {group.label}
              </div>
              {/* 分組項目 */}
              <div className="px-2">
                {group.items.map((item) => (
                  <ToolbarMenuItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    variant={item.variant}
                    onClick={() => handleItemClick(item.onClick, item.keepOpen)}
                  />
                ))}
              </div>
              {/* 分隔線（非最後一組） */}
              {groupIndex < groups.length - 1 && (
                <div className="my-2 border-t border-gray-100 dark:border-gray-700" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
