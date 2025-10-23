'use client'

import { memo } from 'react'
import type { GachaMachine } from '@/types'

interface MachineCardProps {
  machine: GachaMachine
  onClick: () => void
  language: 'zh-TW' | 'en'
}

export const MachineCard = memo(function MachineCard({ machine, onClick, language }: MachineCardProps) {
  // 根據語言選擇顯示名稱
  const displayName = language === 'zh-TW' && machine.chineseMachineName
    ? machine.chineseMachineName
    : machine.machineName

  return (
    <button
      onClick={onClick}
      className="group p-6 bg-blue-50 dark:bg-gray-700 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-purple-400 hover:shadow-lg transition-all duration-300 text-left w-full"
    >
      <div className="flex-1">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-purple-400 transition-colors">
          {displayName}
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
            {machine.totalItems} {language === 'zh-TW' ? '件' : 'items'}
          </span>
        </div>
      </div>
    </button>
  )
})
