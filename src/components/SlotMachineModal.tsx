'use client'

import { BaseModal } from './common/BaseModal'
import { SlotMachine } from './slot/SlotMachine'

interface SlotMachineModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * 拉霸機 Modal
 * 包裝 SlotMachine 元件，提供 Modal 介面
 */
export function SlotMachineModal({ isOpen, onClose }: SlotMachineModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      zIndex="z-[60]" // 介於主頁 (z-50) 和轉蛋機 (z-70) 之間
    >
      {/* Modal Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          拉霸機
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="關閉"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Modal Content */}
      <div className="px-6 py-4">
        <SlotMachine />
      </div>
    </BaseModal>
  )
}
