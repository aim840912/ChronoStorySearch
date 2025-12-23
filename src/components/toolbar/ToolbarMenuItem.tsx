'use client'

import type { ReactNode } from 'react'

export interface ToolbarMenuItemProps {
  icon: ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

/**
 * Toolbar 選單項目元件
 * 用於 ToolbarDropdown 內的每個選項
 */
export function ToolbarMenuItem({
  icon,
  label,
  onClick,
  variant = 'default',
}: ToolbarMenuItemProps) {
  const baseStyles =
    'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-left'
  const variantStyles =
    variant === 'danger'
      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'

  return (
    <button onClick={onClick} className={`${baseStyles} ${variantStyles}`}>
      <span className="w-5 h-5 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )
}
